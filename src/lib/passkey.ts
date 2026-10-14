// src/lib/passkey.ts
// Helper utilities for WebAuthn / Passkey authentication in the admin console

import { NextRequest } from 'next/server'
import { getTurso } from '@/lib/turso'

export const PASSKEY_CHALLENGE_COOKIE = 'nlc_passkey_challenge'
export const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface StoredPasskey {
    id: string
    public_key: string // base64url string
    counter: number
    device_type: string | null
    backed_up: number
    transports: string | null // JSON string
    device_name: string
    aaguid: string | null
    created_at: number
    last_used_at: number | null
}

export interface ClientPasskey {
    id: string
    device_name: string
    device_type: string | null
    backed_up: boolean
    transports: string[]
    created_at: number
    last_used_at: number | null
}

let tableChecked = false

export async function ensurePasskeysTable(): Promise<void> {
    if (tableChecked) return
    const db = getTurso()
    await db.batch(
        [
            `CREATE TABLE IF NOT EXISTS admin_passkeys (
                id TEXT PRIMARY KEY,
                public_key TEXT NOT NULL,
                counter INTEGER NOT NULL DEFAULT 0,
                device_type TEXT,
                backed_up INTEGER NOT NULL DEFAULT 0,
                transports TEXT,
                device_name TEXT NOT NULL,
                aaguid TEXT,
                created_at INTEGER NOT NULL,
                last_used_at INTEGER
            )`,
            `CREATE INDEX IF NOT EXISTS idx_passkeys_created ON admin_passkeys(created_at DESC)`,
        ],
        'write'
    )
    tableChecked = true
}

export function getRpInfo(request: NextRequest) {
    const hostHeader =
        request.headers.get('x-forwarded-host')?.split(',')[0].trim() ||
        request.headers.get('host') ||
        'localhost'
    const hostname = hostHeader.split(':')[0].toLowerCase()

    const proto =
        request.headers.get('x-forwarded-proto') ||
        (hostname === 'localhost' || hostname === '127.0.0.1' ? 'http' : 'https')
    const origin = `${proto}://${hostHeader}`

    return {
        rpName: 'Nepal License Checker',
        rpID: hostname,
        origin,
    }
}

// ----------------------------------------------------
// Cryptographic Challenge Cookie Helpers
// ----------------------------------------------------

function b64urlEncode(bytes: Uint8Array): string {
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(value: string): Uint8Array<ArrayBuffer> {
    const remainder = value.length % 4
    const padded = remainder === 0 ? value : value + '='.repeat(4 - remainder)
    const bin = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    const out = new Uint8Array(new ArrayBuffer(bin.length))
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

async function hmacKey(secret: string): Promise<CryptoKey> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
    return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
        'verify',
    ])
}

export async function createChallengeToken(
    challenge: string,
    type: 'registration' | 'authentication',
    secret: string
): Promise<string> {
    const payload = b64urlEncode(
        new TextEncoder().encode(
            JSON.stringify({
                challenge,
                type,
                exp: Date.now() + CHALLENGE_TTL_MS,
            })
        )
    )
    const signature = await crypto.subtle.sign(
        'HMAC',
        await hmacKey(secret),
        new TextEncoder().encode(payload)
    )
    return `${payload}.${b64urlEncode(new Uint8Array(signature))}`
}

export async function verifyChallengeToken(
    token: string | undefined | null,
    expectedType: 'registration' | 'authentication',
    secret: string
): Promise<string | null> {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [payload, signature] = parts
    try {
        const valid = await crypto.subtle.verify(
            'HMAC',
            await hmacKey(secret),
            b64urlDecode(signature),
            new TextEncoder().encode(payload)
        )
        if (!valid) return null

        const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)))
        if (
            data &&
            typeof data.challenge === 'string' &&
            data.type === expectedType &&
            typeof data.exp === 'number' &&
            Date.now() < data.exp
        ) {
            return data.challenge
        }
        return null
    } catch {
        return null
    }
}

// ----------------------------------------------------
// Database Operations
// ----------------------------------------------------

export async function getPasskeys(): Promise<ClientPasskey[]> {
    await ensurePasskeysTable()
    const db = getTurso()
    const result = await db.execute(
        'SELECT id, device_name, device_type, backed_up, transports, created_at, last_used_at FROM admin_passkeys ORDER BY created_at DESC'
    )
    return result.rows.map((row) => ({
        id: String(row.id),
        device_name: String(row.device_name),
        device_type: row.device_type ? String(row.device_type) : null,
        backed_up: Boolean(row.backed_up),
        transports: row.transports ? JSON.parse(String(row.transports)) : [],
        created_at: Number(row.created_at),
        last_used_at: row.last_used_at ? Number(row.last_used_at) : null,
    }))
}

export async function countPasskeys(): Promise<number> {
    try {
        await ensurePasskeysTable()
        const db = getTurso()
        const res = await db.execute('SELECT COUNT(*) as count FROM admin_passkeys')
        return Number(res.rows[0]?.count) || 0
    } catch {
        return 0
    }
}

export async function getPasskeyById(id: string): Promise<StoredPasskey | null> {
    await ensurePasskeysTable()
    const db = getTurso()
    const res = await db.execute({
        sql: 'SELECT * FROM admin_passkeys WHERE id = ? LIMIT 1',
        args: [id],
    })
    if (!res.rows.length) return null
    const row = res.rows[0]
    return {
        id: String(row.id),
        public_key: String(row.public_key),
        counter: Number(row.counter) || 0,
        device_type: row.device_type ? String(row.device_type) : null,
        backed_up: Number(row.backed_up) || 0,
        transports: row.transports ? String(row.transports) : null,
        device_name: String(row.device_name),
        aaguid: row.aaguid ? String(row.aaguid) : null,
        created_at: Number(row.created_at),
        last_used_at: row.last_used_at ? Number(row.last_used_at) : null,
    }
}

export async function savePasskey(passkey: {
    id: string
    publicKey: Uint8Array
    counter: number
    deviceType?: string
    backedUp?: boolean
    transports?: string[]
    deviceName: string
    aaguid?: string
}): Promise<void> {
    await ensurePasskeysTable()
    const db = getTurso()
    const pubKeyBase64Url = Buffer.from(passkey.publicKey).toString('base64url')
    await db.execute({
        sql: `INSERT OR REPLACE INTO admin_passkeys (
            id, public_key, counter, device_type, backed_up, transports, device_name, aaguid, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            passkey.id,
            pubKeyBase64Url,
            passkey.counter,
            passkey.deviceType || null,
            passkey.backedUp ? 1 : 0,
            passkey.transports?.length ? JSON.stringify(passkey.transports) : null,
            passkey.deviceName.trim() || 'Biometric Passkey',
            passkey.aaguid || null,
            Date.now(),
        ],
    })
}

export async function updatePasskeyCounter(id: string, newCounter: number): Promise<void> {
    await ensurePasskeysTable()
    const db = getTurso()
    await db.execute({
        sql: 'UPDATE admin_passkeys SET counter = ?, last_used_at = ? WHERE id = ?',
        args: [newCounter, Date.now(), id],
    })
}

export async function deletePasskey(id: string): Promise<boolean> {
    await ensurePasskeysTable()
    const db = getTurso()
    const res = await db.execute({
        sql: 'DELETE FROM admin_passkeys WHERE id = ?',
        args: [id],
    })
    return res.rowsAffected > 0
}
