// src/lib/maintenanceAuth.ts
// Edge-safe: uses only Web Crypto + base64url, no Node built-ins, so the same
// helpers run in middleware (Edge runtime) and in the auth route (Node).

export const MAINT_COOKIE = 'nlc_maint'

export const SESSION_MAX_AGE = 12 * 60 * 60 * 1000 // 12 hours

export function isMaintenanceEnabled(): boolean {
    return process.env.NEXT_PUBLIC_MAINTENANCE === '1'
}

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

export async function createSessionToken(secret: string): Promise<string> {
    const payload = b64urlEncode(
        new TextEncoder().encode(JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE }))
    )
    const signature = await crypto.subtle.sign(
        'HMAC',
        await hmacKey(secret),
        new TextEncoder().encode(payload)
    )
    return `${payload}.${b64urlEncode(new Uint8Array(signature))}`
}

/**
 * Validates the signed cookie. crypto.subtle.verify performs the signature
 * comparison in constant time, so this does not leak the expected value.
 */
export async function verifySessionToken(
    token: string | undefined | null,
    secret: string
): Promise<boolean> {
    if (!token) return false

    const parts = token.split('.')
    if (parts.length !== 2) return false

    const [payload, signature] = parts
    try {
        const valid = await crypto.subtle.verify(
            'HMAC',
            await hmacKey(secret),
            b64urlDecode(signature),
            new TextEncoder().encode(payload)
        )
        if (!valid) return false

        const { exp } = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)))
        return typeof exp === 'number' && Date.now() < exp
    } catch {
        return false
    }
}
