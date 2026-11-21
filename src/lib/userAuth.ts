// src/lib/userAuth.ts
import { getTurso } from './turso'
import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { sendOtpEmail } from './email'

export const USER_SESSION_COOKIE = 'nlc_user_session'
export const USER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
export const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const MAX_OTP_ATTEMPTS = 5
export const OTP_COOLDOWN_MS = 60 * 1000 // 60 seconds between resends

export interface UserProfile {
    id: string
    email: string
    name: string | null
    has_password: boolean
    created_at: number
    updated_at: number
    last_login_at: number | null
    is_banned?: boolean
    ban_reason?: string | null
    banned_at?: number | null
}

export interface UserSavedLicense {
    id: string
    user_id: string
    label: string
    license_number: string
    notify_email: boolean
    created_at: number
    updated_at: number
    // Computed fields from license database:
    holder_name?: string | null
    office?: string | null
    category?: string | null
    status?: 'ready' | 'not_printed'
}

export interface UserSessionPayload {
    id: string
    email: string
    name: string | null
    exp: number
}

let tablesChecked = false

/**
 * Initialize user-related tables in Turso (LibSQL)
 */
export async function ensureUserTables(): Promise<void> {
    if (tablesChecked) return
    const db = getTurso()

    await db.batch(
        [
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                password_hash TEXT,
                password_salt TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                last_login_at INTEGER,
                is_banned INTEGER NOT NULL DEFAULT 0,
                ban_reason TEXT,
                banned_at INTEGER
            )`,
            `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
            `CREATE TABLE IF NOT EXISTS user_otps (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                otp_hash TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                used_at INTEGER,
                attempts INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            )`,
            `CREATE INDEX IF NOT EXISTS idx_user_otps_email ON user_otps(email)`,
            `CREATE TABLE IF NOT EXISTS user_saved_licenses (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                label TEXT NOT NULL,
                license_number TEXT NOT NULL,
                notify_email INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                UNIQUE(user_id, license_number)
            )`,
            `CREATE INDEX IF NOT EXISTS idx_saved_licenses_user ON user_saved_licenses(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_saved_licenses_num ON user_saved_licenses(license_number)`
        ],
        'write'
    )

    // Execute non-blocking column migrations for existing databases
    await db.execute(`ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0`).catch(() => {})
    await db.execute(`ALTER TABLE users ADD COLUMN ban_reason TEXT`).catch(() => {})
    await db.execute(`ALTER TABLE users ADD COLUMN banned_at INTEGER`).catch(() => {})

    tablesChecked = true
}

/* -------------------------------------------------------------------------- */
/* Cryptographic Helpers (Session Tokens & Password Hashing)                  */
/* -------------------------------------------------------------------------- */

function getSessionSecret(): string {
    return (
        process.env.ADMIN_PASSWORD ||
        process.env.CRON_SECRET ||
        process.env.TURSO_AUTH_TOKEN ||
        'nepal-license-checker-user-session-default-secret-salt-2026'
    )
}

function hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex')
}

export function hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
}

function b64urlEncode(buf: Buffer): string {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(val: string): Buffer {
    let padded = val.replace(/-/g, '+').replace(/_/g, '/')
    while (padded.length % 4 !== 0) padded += '='
    return Buffer.from(padded, 'base64')
}

export function createSessionToken(payload: Omit<UserSessionPayload, 'exp'>): string {
    const fullPayload: UserSessionPayload = {
        ...payload,
        exp: Date.now() + USER_SESSION_TTL_MS,
    }
    const secret = getSessionSecret()
    const encodedPayload = b64urlEncode(Buffer.from(JSON.stringify(fullPayload)))
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(encodedPayload)
    const signature = b64urlEncode(hmac.digest())
    return `${encodedPayload}.${signature}`
}

export function verifySessionToken(token: string | null | undefined): UserSessionPayload | null {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [encodedPayload, signature] = parts
    const secret = getSessionSecret()

    try {
        const hmac = crypto.createHmac('sha256', secret)
        hmac.update(encodedPayload)
        const expectedSig = b64urlEncode(hmac.digest())

        if (signature !== expectedSig) return null

        const raw = b64urlDecode(encodedPayload).toString('utf-8')
        const decoded = JSON.parse(raw) as UserSessionPayload

        if (typeof decoded.exp !== 'number' || Date.now() >= decoded.exp) {
            return null
        }
        return decoded
    } catch {
        return null
    }
}

/* -------------------------------------------------------------------------- */
/* OTP Generation & Verification                                              */
/* -------------------------------------------------------------------------- */

export async function requestOtp(email: string): Promise<{ success: boolean; error?: string; retryAfter?: number }> {
    await ensureUserTables()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { success: false, error: 'Please provide a valid email address.' }
    }

    // Check if account has been suspended by an administrator
    const existingUser = await getUserByEmail(normalizedEmail)
    if (existingUser && existingUser.is_banned) {
        return {
            success: false,
            error: existingUser.ban_reason
                ? `Your account has been suspended: ${existingUser.ban_reason}. Please contact support.`
                : 'Your account has been suspended by an administrator. Please contact support.',
        }
    }

    const db = getTurso()
    const now = Date.now()

    // Rate check: check if an active OTP was issued within cooldown
    const recentOtpRes = await db.execute({
        sql: `SELECT created_at FROM user_otps 
              WHERE email = ? AND used_at IS NULL AND created_at > ? 
              ORDER BY created_at DESC LIMIT 1`,
        args: [normalizedEmail, now - OTP_COOLDOWN_MS],
    })

    if (recentOtpRes.rows.length > 0) {
        const lastCreated = Number(recentOtpRes.rows[0].created_at)
        const remainingSec = Math.max(1, Math.ceil((lastCreated + OTP_COOLDOWN_MS - now) / 1000))
        return {
            success: false,
            error: `Please wait ${remainingSec} seconds before requesting a new code.`,
            retryAfter: remainingSec,
        }
    }

    // Generate 6-digit cryptographic random OTP
    const otp = crypto.randomInt(100000, 999999).toString()
    const otpHash = hashOtp(otp)
    const otpId = `otp_${crypto.randomUUID()}`
    const expiresAt = now + OTP_TTL_MS

    // Invalidate prior unused OTPs for this email to prevent reuse
    await db.execute({
        sql: `UPDATE user_otps SET used_at = ? WHERE email = ? AND used_at IS NULL`,
        args: [now, normalizedEmail],
    })

    // Store new OTP
    await db.execute({
        sql: `INSERT INTO user_otps (id, email, otp_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
        args: [otpId, normalizedEmail, otpHash, expiresAt, now],
    })

    // Dispatch email
    const mailResult = await sendOtpEmail({
        to: normalizedEmail,
        otp,
        expiryMinutes: 10,
    })

    if (!mailResult.success) {
        console.error('[UserAuth] Failed to send OTP email:', mailResult.error)
        return {
            success: false,
            error: 'Failed to deliver authentication email. Please try again shortly.',
        }
    }

    return { success: true }
}

export async function verifyOtp(
    email: string,
    otp: string
): Promise<{ success: boolean; user?: UserProfile; token?: string; error?: string }> {
    await ensureUserTables()
    const normalizedEmail = email.trim().toLowerCase()
    const cleanOtp = otp.trim()

    if (!cleanOtp || cleanOtp.length !== 6) {
        return { success: false, error: 'Please enter a valid 6-digit code.' }
    }

    const db = getTurso()
    const now = Date.now()

    // Find the latest active OTP for this email
    const otpRes = await db.execute({
        sql: `SELECT id, otp_hash, expires_at, attempts FROM user_otps 
              WHERE email = ? AND used_at IS NULL AND expires_at > ? 
              ORDER BY created_at DESC LIMIT 1`,
        args: [normalizedEmail, now],
    })

    if (otpRes.rows.length === 0) {
        return { success: false, error: 'The code is invalid or has expired. Please request a new one.' }
    }

    const row = otpRes.rows[0]
    const otpId = String(row.id)
    const attempts = Number(row.attempts)

    if (attempts >= MAX_OTP_ATTEMPTS) {
        await db.execute({
            sql: `UPDATE user_otps SET used_at = ? WHERE id = ?`,
            args: [now, otpId],
        })
        return { success: false, error: 'Too many incorrect attempts. Please request a fresh code.' }
    }

    const expectedHash = String(row.otp_hash)
    const candidateHash = hashOtp(cleanOtp)

    if (expectedHash !== candidateHash) {
        await db.execute({
            sql: `UPDATE user_otps SET attempts = attempts + 1 WHERE id = ?`,
            args: [otpId],
        })
        const remaining = MAX_OTP_ATTEMPTS - (attempts + 1)
        return {
            success: false,
            error: `Incorrect code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code locked.'}`,
        }
    }

    // Mark OTP as used
    await db.execute({
        sql: `UPDATE user_otps SET used_at = ? WHERE id = ?`,
        args: [now, otpId],
    })

    // Upsert or fetch user
    let user = await getUserByEmail(normalizedEmail)
    if (!user) {
        const userId = `usr_${crypto.randomUUID()}`
        await db.execute({
            sql: `INSERT INTO users (id, email, created_at, updated_at, last_login_at, is_banned) 
                  VALUES (?, ?, ?, ?, ?, 0)`,
            args: [userId, normalizedEmail, now, now, now],
        })
        user = {
            id: userId,
            email: normalizedEmail,
            name: null,
            has_password: false,
            created_at: now,
            updated_at: now,
            last_login_at: now,
            is_banned: false,
            ban_reason: null,
            banned_at: null,
        }
    } else {
        if (user.is_banned) {
            return {
                success: false,
                error: user.ban_reason
                    ? `Your account has been suspended: ${user.ban_reason}. Please contact support.`
                    : 'Your account has been suspended by an administrator. Please contact support.',
            }
        }

        await db.execute({
            sql: `UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`,
            args: [now, now, user.id],
        })
        user.last_login_at = now
    }

    const token = createSessionToken({
        id: user.id,
        email: user.email,
        name: user.name,
    })

    return {
        success: true,
        user,
        token,
    }
}

/* -------------------------------------------------------------------------- */
/* Password Login & Setting                                                   */
/* -------------------------------------------------------------------------- */

export async function loginWithPassword(
    email: string,
    password: string
): Promise<{ success: boolean; user?: UserProfile; token?: string; error?: string }> {
    await ensureUserTables()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
        return { success: false, error: 'Email and password are required.' }
    }

    const db = getTurso()
    const res = await db.execute({
        sql: `SELECT id, email, name, password_hash, password_salt, created_at, updated_at, last_login_at, 
                     is_banned, ban_reason, banned_at 
              FROM users WHERE email = ? LIMIT 1`,
        args: [normalizedEmail],
    })

    if (res.rows.length === 0) {
        return { success: false, error: 'No account found with this email. Please log in using the 6-digit OTP code.' }
    }

    const row = res.rows[0]

    // Check ban status
    if (Boolean(row.is_banned)) {
        const reason = (row.ban_reason as string) || null
        return {
            success: false,
            error: reason
                ? `Your account has been suspended: ${reason}. Please contact support.`
                : 'Your account has been suspended by an administrator. Please contact support.',
        }
    }

    const passHash = row.password_hash as string | null
    const passSalt = row.password_salt as string | null

    if (!passHash || !passSalt) {
        return {
            success: false,
            error: 'You have not set a password yet. Please log in using the 6-digit OTP code to access your account.',
        }
    }

    const computed = hashPassword(password, passSalt)
    if (computed !== passHash) {
        return { success: false, error: 'Incorrect password. You can also sign in with a 6-digit OTP code.' }
    }

    const now = Date.now()
    await db.execute({
        sql: `UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`,
        args: [now, now, String(row.id)],
    })

    const user: UserProfile = {
        id: String(row.id),
        email: String(row.email),
        name: (row.name as string) || null,
        has_password: true,
        created_at: Number(row.created_at),
        updated_at: Number(row.updated_at),
        last_login_at: now,
        is_banned: Boolean(row.is_banned),
        ban_reason: (row.ban_reason as string) || null,
        banned_at: row.banned_at ? Number(row.banned_at) : null,
    }

    const token = createSessionToken({
        id: user.id,
        email: user.email,
        name: user.name,
    })

    return { success: true, user, token }
}

export async function setUserPassword(
    userId: string,
    newPassword: string,
    currentPassword?: string
): Promise<{ success: boolean; error?: string }> {
    await ensureUserTables()
    if (!newPassword || newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' }
    }

    const db = getTurso()
    const userRes = await db.execute({
        sql: `SELECT id, password_hash, password_salt FROM users WHERE id = ? LIMIT 1`,
        args: [userId],
    })

    if (userRes.rows.length === 0) {
        return { success: false, error: 'User not found.' }
    }

    const row = userRes.rows[0]
    const existingHash = row.password_hash as string | null
    const existingSalt = row.password_salt as string | null

    // If already has a password, require current password verification
    if (existingHash && existingSalt) {
        if (!currentPassword) {
            return { success: false, error: 'Please enter your current password to change it.' }
        }
        const verifyCurrent = hashPassword(currentPassword, existingSalt)
        if (verifyCurrent !== existingHash) {
            return { success: false, error: 'Current password is incorrect.' }
        }
    }

    const salt = crypto.randomBytes(16).toString('hex')
    const hash = hashPassword(newPassword, salt)
    const now = Date.now()

    await db.execute({
        sql: `UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?`,
        args: [hash, salt, now, userId],
    })

    return { success: true }
}

/* -------------------------------------------------------------------------- */
/* User Profile & Session Retrieval                                           */
/* -------------------------------------------------------------------------- */

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
    await ensureUserTables()
    const db = getTurso()
    const res = await db.execute({
        sql: `SELECT id, email, name, password_hash, created_at, updated_at, last_login_at,
                     is_banned, ban_reason, banned_at 
              FROM users WHERE email = ? LIMIT 1`,
        args: [email.toLowerCase().trim()],
    })

    if (res.rows.length === 0) return null
    const row = res.rows[0]

    return {
        id: String(row.id),
        email: String(row.email),
        name: (row.name as string) || null,
        has_password: Boolean(row.password_hash),
        created_at: Number(row.created_at),
        updated_at: Number(row.updated_at),
        last_login_at: row.last_login_at ? Number(row.last_login_at) : null,
        is_banned: Boolean(row.is_banned),
        ban_reason: (row.ban_reason as string) || null,
        banned_at: row.banned_at ? Number(row.banned_at) : null,
    }
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
    await ensureUserTables()
    const db = getTurso()
    const res = await db.execute({
        sql: `SELECT id, email, name, password_hash, created_at, updated_at, last_login_at,
                     is_banned, ban_reason, banned_at 
              FROM users WHERE id = ? LIMIT 1`,
        args: [userId],
    })

    if (res.rows.length === 0) return null
    const row = res.rows[0]

    return {
        id: String(row.id),
        email: String(row.email),
        name: (row.name as string) || null,
        has_password: Boolean(row.password_hash),
        created_at: Number(row.created_at),
        updated_at: Number(row.updated_at),
        last_login_at: row.last_login_at ? Number(row.last_login_at) : null,
        is_banned: Boolean(row.is_banned),
        ban_reason: (row.ban_reason as string) || null,
        banned_at: row.banned_at ? Number(row.banned_at) : null,
    }
}

export async function getCurrentUser(request: NextRequest): Promise<UserProfile | null> {
    const cookie = request.cookies.get(USER_SESSION_COOKIE)
    if (!cookie?.value) return null

    const payload = verifySessionToken(cookie.value)
    if (!payload?.id) return null

    const user = await getUserById(payload.id)
    if (!user || user.is_banned) return null

    return user
}

/* -------------------------------------------------------------------------- */
/* Admin Management Operations                                                */
/* -------------------------------------------------------------------------- */

export interface AdminUserSavedLicenseItem {
    id: string
    label: string
    license_number: string
    notify_email: boolean
    created_at: number
    status?: 'ready' | 'not_printed'
    holder_name?: string | null
    office?: string | null
    category?: string | null
}

export interface AdminUserFeedbackItem {
    id: string
    subject: string
    category: string
    message: string
    status: string
    admin_notes?: string | null
    created_at: number
}

export interface AdminUserItem {
    id: string
    email: string
    name: string | null
    has_password: boolean
    created_at: number
    updated_at: number
    last_login_at: number | null
    saved_licenses_count: number
    feedbacks_count: number
    is_banned: boolean
    ban_reason: string | null
    banned_at: number | null
    saved_licenses?: AdminUserSavedLicenseItem[]
    feedbacks?: AdminUserFeedbackItem[]
}

export interface AdminUserStatsData {
    totalUsers: number
    activeUsers30d: number
    totalSavedLicenses: number
    passwordUsersCount: number
    otpOnlyUsersCount: number
    bannedUsersCount: number
}

export async function getAdminUsersList(params: {
    page?: number
    limit?: number
    search?: string
    status?: string
}): Promise<{ users: AdminUserItem[]; total: number; page: number; limit: number; totalPages: number }> {
    await ensureUserTables()
    const db = getTurso()

    const page = Math.max(1, params.page || 1)
    const limit = Math.min(100, Math.max(1, params.limit || 10))
    const offset = (page - 1) * limit
    const search = (params.search || '').trim().toLowerCase()
    const status = (params.status || 'all').trim().toLowerCase()

    let countSql = `SELECT COUNT(*) as count FROM users u`
    const countArgs: (string | number)[] = []

    let selectSql = `
        SELECT u.id, u.email, u.name, u.password_hash, u.created_at, u.updated_at, u.last_login_at,
               COALESCE(u.is_banned, 0) as is_banned, u.ban_reason, u.banned_at,
               (SELECT COUNT(*) FROM user_saved_licenses WHERE user_id = u.id) as saved_licenses_count,
               (SELECT COUNT(*) FROM user_feedbacks WHERE LOWER(email) = LOWER(u.email)) as feedbacks_count
        FROM users u
    `
    const selectArgs: (string | number)[] = []

    const whereClauses: string[] = []
    if (search) {
        const pattern = `%${search}%`
        whereClauses.push(`(LOWER(u.email) LIKE ? OR LOWER(COALESCE(u.name, '')) LIKE ?)`)
        countArgs.push(pattern, pattern)
        selectArgs.push(pattern, pattern)
    }

    if (status === 'banned') {
        whereClauses.push(`COALESCE(u.is_banned, 0) = 1`)
    } else if (status === 'active') {
        whereClauses.push(`COALESCE(u.is_banned, 0) = 0`)
    }

    if (whereClauses.length > 0) {
        const whereStr = ` WHERE ` + whereClauses.join(' AND ')
        countSql += whereStr
        selectSql += whereStr
    }

    selectSql += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
    selectArgs.push(limit, offset)

    const [countRes, rowsRes] = await Promise.all([
        db.execute({ sql: countSql, args: countArgs }),
        db.execute({ sql: selectSql, args: selectArgs }),
    ])

    const total = Number(countRes.rows[0]?.count || 0)
    const totalPages = Math.ceil(total / limit) || 1

    const users: AdminUserItem[] = rowsRes.rows.map((row) => ({
        id: String(row.id),
        email: String(row.email),
        name: (row.name as string) || null,
        has_password: Boolean(row.password_hash),
        created_at: Number(row.created_at),
        updated_at: Number(row.updated_at),
        last_login_at: row.last_login_at ? Number(row.last_login_at) : null,
        is_banned: Boolean(row.is_banned),
        ban_reason: (row.ban_reason as string) || null,
        banned_at: row.banned_at ? Number(row.banned_at) : null,
        saved_licenses_count: Number(row.saved_licenses_count || 0),
        feedbacks_count: Number(row.feedbacks_count || 0),
    }))

    return { users, total, page, limit, totalPages }
}

export async function getAdminUserStats(): Promise<AdminUserStatsData> {
    await ensureUserTables()
    const db = getTurso()
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    const [userCountRes, activeRes, licenseCountRes, passwordCountRes, bannedCountRes] = await Promise.all([
        db.execute(`SELECT COUNT(*) as count FROM users`),
        db.execute({
            sql: `SELECT COUNT(*) as count FROM users WHERE last_login_at >= ?`,
            args: [thirtyDaysAgo],
        }),
        db.execute(`SELECT COUNT(*) as count FROM user_saved_licenses`),
        db.execute(`SELECT COUNT(*) as count FROM users WHERE password_hash IS NOT NULL AND password_hash != ''`),
        db.execute(`SELECT COUNT(*) as count FROM users WHERE COALESCE(is_banned, 0) = 1`),
    ])

    const totalUsers = Number(userCountRes.rows[0]?.count || 0)
    const activeUsers30d = Number(activeRes.rows[0]?.count || 0)
    const totalSavedLicenses = Number(licenseCountRes.rows[0]?.count || 0)
    const passwordUsersCount = Number(passwordCountRes.rows[0]?.count || 0)
    const otpOnlyUsersCount = Math.max(0, totalUsers - passwordUsersCount)
    const bannedUsersCount = Number(bannedCountRes.rows[0]?.count || 0)

    return {
        totalUsers,
        activeUsers30d,
        totalSavedLicenses,
        passwordUsersCount,
        otpOnlyUsersCount,
        bannedUsersCount,
    }
}

export async function adminGetUserDetail(userId: string): Promise<AdminUserItem | null> {
    await ensureUserTables()
    const db = getTurso()

    const userRes = await db.execute({
        sql: `SELECT id, email, name, password_hash, created_at, updated_at, last_login_at,
                     COALESCE(is_banned, 0) as is_banned, ban_reason, banned_at 
              FROM users WHERE id = ? LIMIT 1`,
        args: [userId],
    })

    if (userRes.rows.length === 0) return null
    const uRow = userRes.rows[0]
    const email = String(uRow.email)

    // Fetch saved licenses
    const savedRes = await db.execute({
        sql: `SELECT id, label, license_number, notify_email, created_at FROM user_saved_licenses WHERE user_id = ? ORDER BY created_at DESC`,
        args: [userId],
    })

    const numbers = savedRes.rows.map((r) => String(r.license_number))
    const printedMap = new Map<string, { holder_name: string; office: string; category: string }>()

    if (numbers.length > 0) {
        const placeholders = numbers.map(() => '?').join(',')
        const printedRes = await db.execute({
            sql: `SELECT license_number, holder_name, office, category FROM licenses WHERE license_number IN (${placeholders})`,
            args: numbers,
        })
        for (const row of printedRes.rows) {
            printedMap.set(String(row.license_number), {
                holder_name: String(row.holder_name),
                office: String(row.office),
                category: String(row.category),
            })
        }
    }

    const savedLicenses: AdminUserSavedLicenseItem[] = savedRes.rows.map((r) => {
        const num = String(r.license_number)
        const match = printedMap.get(num)
        return {
            id: String(r.id),
            label: String(r.label),
            license_number: num,
            notify_email: Boolean(r.notify_email),
            created_at: Number(r.created_at),
            status: match ? 'ready' : 'not_printed',
            holder_name: match ? match.holder_name : null,
            office: match ? match.office : null,
            category: match ? match.category : null,
        }
    })

    // Fetch feedbacks
    const feedbacksRes = await db.execute({
        sql: `SELECT id, subject, category, message, status, admin_notes, created_at FROM user_feedbacks WHERE LOWER(email) = LOWER(?) ORDER BY created_at DESC`,
        args: [email],
    })

    const feedbacks: AdminUserFeedbackItem[] = feedbacksRes.rows.map((f) => ({
        id: String(f.id),
        subject: String(f.subject),
        category: String(f.category),
        message: String(f.message),
        status: String(f.status),
        admin_notes: (f.admin_notes as string) || null,
        created_at: Number(f.created_at),
    }))

    return {
        id: String(uRow.id),
        email,
        name: (uRow.name as string) || null,
        has_password: Boolean(uRow.password_hash),
        created_at: Number(uRow.created_at),
        updated_at: Number(uRow.updated_at),
        last_login_at: uRow.last_login_at ? Number(uRow.last_login_at) : null,
        is_banned: Boolean(uRow.is_banned),
        ban_reason: (uRow.ban_reason as string) || null,
        banned_at: uRow.banned_at ? Number(uRow.banned_at) : null,
        saved_licenses_count: savedLicenses.length,
        feedbacks_count: feedbacks.length,
        saved_licenses: savedLicenses,
        feedbacks,
    }
}

export async function adminBanUser(
    userId: string,
    isBanned: boolean,
    reason?: string | null
): Promise<{ success: boolean; error?: string }> {
    await ensureUserTables()
    const db = getTurso()
    const now = Date.now()

    const user = await getUserById(userId)
    if (!user) {
        return { success: false, error: 'User not found.' }
    }

    if (isBanned) {
        const banReason = reason?.trim() || 'Your account has been suspended by an administrator.'
        await db.batch(
            [
                {
                    sql: `UPDATE users SET is_banned = 1, ban_reason = ?, banned_at = ?, updated_at = ? WHERE id = ?`,
                    args: [banReason, now, now, userId],
                },
                {
                    sql: `DELETE FROM user_otps WHERE email = ?`,
                    args: [user.email],
                },
            ],
            'write'
        )
    } else {
        await db.execute({
            sql: `UPDATE users SET is_banned = 0, ban_reason = NULL, banned_at = NULL, updated_at = ? WHERE id = ?`,
            args: [now, userId],
        })
    }

    return { success: true }
}

export async function adminDeleteUser(userId: string): Promise<boolean> {
    await ensureUserTables()
    const db = getTurso()

    const user = await getUserById(userId)
    if (!user) return false

    await db.batch(
        [
            { sql: `DELETE FROM user_saved_licenses WHERE user_id = ?`, args: [userId] },
            { sql: `DELETE FROM user_otps WHERE email = ?`, args: [user.email] },
            { sql: `DELETE FROM users WHERE id = ?`, args: [userId] },
        ],
        'write'
    )

    return true
}
