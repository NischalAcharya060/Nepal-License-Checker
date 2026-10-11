// src/lib/feedback.ts
import { getTurso } from './turso'
import crypto from 'crypto'

export interface FeedbackCategoryItem {
    id: string
    label: string
    labelNe: string
    isProblem: boolean
}

export const FEEDBACK_CATEGORIES: FeedbackCategoryItem[] = [
    { id: 'license_not_found', label: 'Problem: License Not Found / Query Issue', labelNe: 'समस्या: लाइसेन्स फेला परेन / खोजी समस्या', isProblem: true },
    { id: 'notification_issue', label: 'Problem: Email Notification Not Received', labelNe: 'समस्या: इमेल अलर्ट नआएको', isProblem: true },
    { id: 'incorrect_data', label: 'Problem: Incorrect or Outdated Details', labelNe: 'समस्या: विवरण फरक वा गलत देखिएको', isProblem: true },
    { id: 'dotm_collection', label: 'Inquiry: DoTM Card Collection Query', labelNe: 'सोधपुछ: लाइसेन्स कार्ड संकलन सम्बन्धी', isProblem: false },
    { id: 'suggestion', label: 'Suggestion: Website Improvement', labelNe: 'सुझाव: वेबसाइट तथा सेवा सुधारका लागि', isProblem: false },
    { id: 'other', label: 'Other: General Problem or Inquiry', labelNe: 'अन्य: सामान्य समस्या वा प्रश्न', isProblem: true },
]

export type FeedbackCategory = string

export interface FeedbackItem {
    id: string
    name: string
    email: string
    license_number?: string | null
    category: string
    subject: string
    message: string
    status: 'new' | 'resolved'
    admin_notes?: string | null
    ip?: string | null
    created_at: number
    updated_at: number
}

export interface FeedbackStats {
    total: number
    newCount: number
    resolvedCount: number
    problemCount: number
    suggestionCount: number
    todayCount: number
}

export interface FeedbackLogsResult {
    logs: FeedbackItem[]
    total: number
    page: number
    limit: number
    totalPages: number
}

let tableChecked = false

export async function ensureFeedbackTable(): Promise<void> {
    if (tableChecked) return
    const db = getTurso()

    await db.batch(
        [
            `CREATE TABLE IF NOT EXISTS user_feedbacks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                license_number TEXT,
                category TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'new',
                admin_notes TEXT,
                ip TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )`,
            `CREATE INDEX IF NOT EXISTS idx_user_feedbacks_created_at ON user_feedbacks(created_at DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_user_feedbacks_status ON user_feedbacks(status)`,
            `CREATE INDEX IF NOT EXISTS idx_user_feedbacks_email ON user_feedbacks(email)`,
            `CREATE INDEX IF NOT EXISTS idx_user_feedbacks_category ON user_feedbacks(category)`,
        ],
        'write'
    )
    tableChecked = true
}

export async function createFeedback(params: {
    name: string
    email: string
    licenseNumber?: string
    category: string
    subject?: string
    message: string
    ip?: string
}): Promise<{ status: 'success'; id: string; message: string }> {
    await ensureFeedbackTable()
    const db = getTurso()

    const cleanName = params.name.trim().slice(0, 100)
    const cleanEmail = params.email.trim().toLowerCase().slice(0, 120)
    const cleanLicense = params.licenseNumber ? params.licenseNumber.trim().toUpperCase().slice(0, 40) : null
    const cleanCategory = params.category.trim().slice(0, 60)
    const categoryObj = FEEDBACK_CATEGORIES.find((c) => c.id === cleanCategory)
    const cleanSubject = (params.subject || categoryObj?.label || cleanCategory).trim().slice(0, 150)
    const cleanMessage = params.message.trim().slice(0, 2000)
    const cleanIp = params.ip ? params.ip.slice(0, 50) : null

    const id = `fb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const now = Date.now()

    await db.execute({
        sql: `INSERT INTO user_feedbacks (
            id, name, email, license_number, category, subject, message, status, admin_notes, ip, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, ?, ?)`,
        args: [
            id,
            cleanName,
            cleanEmail,
            cleanLicense,
            cleanCategory,
            cleanSubject,
            cleanMessage,
            cleanIp,
            now,
            now,
        ],
    })

    return {
        status: 'success',
        id,
        message: 'Feedback received successfully.',
    }
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
    await ensureFeedbackTable()
    const db = getTurso()

    const res = await db.execute(`
        SELECT status, category, COUNT(*) as count
        FROM user_feedbacks
        GROUP BY status, category
    `)

    let total = 0
    let newCount = 0
    let resolvedCount = 0
    let problemCount = 0
    let suggestionCount = 0

    const problemIds = new Set(FEEDBACK_CATEGORIES.filter((c) => c.isProblem).map((c) => c.id))

    for (const row of res.rows || []) {
        const status = String(row.status)
        const category = String(row.category)
        const count = Number(row.count) || 0

        total += count
        if (status === 'new') newCount += count
        else if (status === 'resolved') resolvedCount += count

        if (problemIds.has(category as FeedbackCategory) || category.startsWith('problem')) {
            problemCount += count
        } else if (category === 'suggestion') {
            suggestionCount += count
        }
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayTimestamp = startOfToday.getTime()

    const todayRes = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM user_feedbacks WHERE created_at >= ?',
        args: [todayTimestamp],
    })
    const todayCount = Number(todayRes.rows?.[0]?.count) || 0

    return {
        total,
        newCount,
        resolvedCount,
        problemCount,
        suggestionCount,
        todayCount,
    }
}

export async function getFeedbackLogs(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    category?: string
}): Promise<FeedbackLogsResult> {
    await ensureFeedbackTable()
    const db = getTurso()

    const page = Math.max(1, params?.page || 1)
    const limit = Math.min(100, Math.max(10, params?.limit || 50))
    const offset = (page - 1) * limit
    const search = params?.search?.trim() || ''
    const status = params?.status || 'all'
    const category = params?.category || 'all'

    const whereClauses: string[] = []
    const args: (string | number)[] = []

    if (status && status !== 'all') {
        whereClauses.push('status = ?')
        args.push(status)
    }

    if (category && category !== 'all') {
        whereClauses.push('category = ?')
        args.push(category)
    }

    if (search) {
        const term = `%${search.toLowerCase()}%`
        whereClauses.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(license_number) LIKE ? OR LOWER(subject) LIKE ? OR LOWER(message) LIKE ?)')
        args.push(term, term, term, term, term)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // Count
    const countSql = `SELECT COUNT(*) as total FROM user_feedbacks ${whereSql}`
    const countRes = await db.execute({ sql: countSql, args })
    const total = Number(countRes.rows?.[0]?.total || 0)

    // Data
    const dataSql = `
        SELECT id, name, email, license_number, category, subject, message, status, admin_notes, ip, created_at, updated_at
        FROM user_feedbacks
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `
    const dataRes = await db.execute({ sql: dataSql, args: [...args, limit, offset] })

    const logs: FeedbackItem[] = (dataRes.rows || []).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        email: String(row.email),
        license_number: row.license_number ? String(row.license_number) : null,
        category: String(row.category),
        subject: String(row.subject),
        message: String(row.message),
        status: (String(row.status) as 'new' | 'resolved') || 'new',
        admin_notes: row.admin_notes ? String(row.admin_notes) : null,
        ip: row.ip ? String(row.ip) : null,
        created_at: Number(row.created_at),
        updated_at: Number(row.updated_at),
    }))

    return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    }
}

export async function updateFeedbackStatus(
    id: string,
    status: 'new' | 'resolved',
    adminNotes?: string
): Promise<boolean> {
    await ensureFeedbackTable()
    const db = getTurso()

    const now = Date.now()
    const res = await db.execute({
        sql: `UPDATE user_feedbacks 
              SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ? 
              WHERE id = ?`,
        args: [status, adminNotes || null, now, id],
    })

    return res.rowsAffected > 0
}

export async function deleteFeedback(id: string): Promise<boolean> {
    await ensureFeedbackTable()
    const db = getTurso()

    const res = await db.execute({
        sql: `DELETE FROM user_feedbacks WHERE id = ?`,
        args: [id],
    })

    return res.rowsAffected > 0
}
