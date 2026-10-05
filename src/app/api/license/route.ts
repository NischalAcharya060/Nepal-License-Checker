import { NextRequest, NextResponse } from 'next/server'
import { getTurso, type LicenseRow } from '@/lib/turso'
import { RateLimiter } from '@/lib/rateLimit'
import { sanitizeInput } from '@/utils/sanitize'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Allow up to 15 searches per minute. If exceeded, lock out the IP for 5 minutes (300,000ms).
const rateLimiter = new RateLimiter(15, 60000, 300000)

export async function GET(request: NextRequest) {
    try {
        // Rate limiting with 5-minute spam lockout penalty
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'anonymous'

        const rateStatus = rateLimiter.checkLimit(ip)
        if (!rateStatus.allowed) {
            const minutes = Math.ceil(rateStatus.retryAfter / 60)
            const waitMsg = minutes > 1 ? `${minutes} minutes` : `${rateStatus.retryAfter} seconds`
            return NextResponse.json(
                {
                    error: `Too many searches. Please wait ${waitMsg} before searching again.`,
                    retryAfter: rateStatus.retryAfter,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateStatus.retryAfter),
                        'Cache-Control': 'no-store, no-cache',
                    },
                }
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
            return NextResponse.json(
                {
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
                },
                {
                    headers: {
                        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                    },
                }
            )
        }

        // Not found in database — card is not printed yet
        return NextResponse.json(
            {
                status: 'success',
                data: null,
                message: 'License not found in printed records',
            },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                },
            }
        )

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        )
    }
}
