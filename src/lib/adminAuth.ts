// src/lib/adminAuth.ts
// Edge-safe cryptographic authentication helper for the admin panel

export const ADMIN_COOKIE = 'nlc_admin_session'
export const ADMIN_SESSION_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

export function getAdminSecret(): string | null {
    return process.env.ADMIN_PASSWORD || process.env.MAINTENANCE_PASSWORD || null
}

export function isAdminConfigured(): boolean {
    return Boolean(getAdminSecret())
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

export async function createAdminSessionToken(secret: string): Promise<string> {
    const payload = b64urlEncode(
        new TextEncoder().encode(
            JSON.stringify({
                role: 'admin',
                exp: Date.now() + ADMIN_SESSION_MAX_AGE,
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

export async function verifyAdminSessionToken(
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

        const { exp, role } = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)))
        return role === 'admin' && typeof exp === 'number' && Date.now() < exp
    } catch {
        return false
    }
}
