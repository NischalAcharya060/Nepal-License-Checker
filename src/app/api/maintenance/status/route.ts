import { NextResponse } from 'next/server'
import { getTurso } from '@/lib/turso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Public liveness probe used by the maintenance notice. Returns only a boolean
 * so it cannot be used to fingerprint database configuration.
 */
export async function GET() {
    try {
        await getTurso().execute('SELECT 1')
        return NextResponse.json({ status: 'success', data: { ok: true } })
    } catch {
        return NextResponse.json({ status: 'success', data: { ok: false } })
    }
}
