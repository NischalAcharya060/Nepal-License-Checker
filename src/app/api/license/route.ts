import { NextRequest, NextResponse } from 'next/server'
import { getTurso, type LicenseRow } from '@/lib/turso'
import { RateLimiter } from '@/lib/rateLimit'
import { sanitizeInput } from '@/utils/sanitize'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const rateLimiter = new RateLimiter(60, 60000) // 60 requests per minute per IP

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'anonymous'

        if (!rateLimiter.check(ip)) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please wait a moment before trying again.', retryAfter: 60 },
                { status: 429, headers: { 'Retry-After': '60' } }
            )
        }

        // Parse & validate input
        const searchParams = request.nextUrl.searchParams
        let licenseNumber = searchParams.get('number')

        if (!licenseNumber) {
            return NextResponse.json(
                { error: 'License number is required' },
                { status: 400 }
            )
        }

        licenseNumber = sanitizeInput(licenseNumber).toUpperCase()

        const licenseRegex = /^\d{2}-\d{2}-\d{8}$/
        if (!licenseRegex.test(licenseNumber)) {
            return NextResponse.json(
                { error: 'Invalid license number format. Expected XX-XX-XXXXXXXX (e.g. 01-01-12345678)' },
                { status: 400 }
            )
        }

        // Query Turso database directly
        const db = getTurso()
        const result = await db.execute({
            sql: `SELECT license_number, holder_name, office, category, created_at, updated_at
                  FROM licenses WHERE license_number = ? LIMIT 1`,
            args: [licenseNumber],
        })

        if (result.rows.length) {
            const row = result.rows[0] as unknown as LicenseRow
            return NextResponse.json({
                status: 'success',
                source: 'database',
                data: {
                    holder_name: row.holder_name,
                    license_number: row.license_number,
                    office: row.office,
                    category: row.category,
                    createdAt: new Date(Number(row.created_at)),
                    updatedAt: new Date(Number(row.updated_at)),
                },
            })
        }

        // Not found in database — card is not printed yet
        return NextResponse.json({
            status: 'success',
            data: null,
            message: 'License not found in printed records',
        })

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        )
    }
}
