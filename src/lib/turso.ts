import { createClient, type Client } from '@libsql/client'

let cached: Client | null = null

export function getTurso(): Client {
    if (cached) return cached
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    if (!url) throw new Error('TURSO_DATABASE_URL is not set')
    cached = createClient({ url, authToken })
    return cached
}

export type LicenseRow = {
    license_number: string
    holder_name: string
    office: string
    category: string
    created_at: number
    updated_at: number
}
