// src/app/api/license/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTurso, type LicenseRow } from '@/lib/turso'
import { RateLimiter } from '@/lib/rateLimit'
import { sanitizeInput } from '@/utils/sanitize'
import { extractGeo } from '@/lib/geo'
import { logSearch } from '@/lib/searchLogger'
import { validateDeveloperApiKey, recordApiKeyUsage } from '@/lib/developerAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Standard anonymous IP rate limiter: 15 req/min, with a 5-minute (300,000ms) lockout penalty
const ipRateLimiter = new RateLimiter(15, 60000, 300000)

// Authenticated developer rate limiter: standard sliding window per API key (default 60 req/min, 0 lockout)
const devRateLimiter = new RateLimiter(60, 60000, 0)

export async function GET(request: NextRequest) {
    try {
        const geo = extractGeo(request)
        const ip = geo.ip

        // 1. Check for Developer API Key
        const authHeader = request.headers.get('authorization')
        const rawApiKey =
            request.headers.get('x-api-key') ||
            (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null)

        let isDeveloper = false
        let rateStatus: ReturnType<typeof ipRateLimiter.checkLimit>
        let rateHeaders: Record<string, string> = {}

        if (rawApiKey) {
            const devKey = await validateDeveloperApiKey(rawApiKey)
            if (!devKey) {
                return NextResponse.json(
                    {
                        error: 'Invalid, revoked, or inactive API key. Please check your developer dashboard.',
                    },
                    { status: 401 }
                )
            }

            isDeveloper = true
            rateStatus = devRateLimiter.checkLimit(devKey.keyId, devKey.rateLimit)
            recordApiKeyUsage(devKey.keyId)

            rateHeaders = {
                'X-RateLimit-Limit': String(rateStatus.limit ?? devKey.rateLimit),
                'X-RateLimit-Remaining': String(rateStatus.remaining ?? 0),
                'X-RateLimit-Reset': String(rateStatus.reset ?? Math.ceil(Date.now() / 1000)),
            }
        } else {
            // Anonymous IP rate limiting
            rateStatus = ipRateLimiter.checkLimit(ip)

            rateHeaders = {
                'X-RateLimit-Limit': String(rateStatus.limit ?? 15),
                'X-RateLimit-Remaining': String(rateStatus.remaining ?? 0),
                'X-RateLimit-Reset': String(rateStatus.reset ?? Math.ceil(Date.now() / 1000)),
            }
        }

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
                        ...rateHeaders,
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
                {
                    status: 400,
                    headers: rateHeaders,
                }
            )
        }

        licenseNumber = sanitizeInput(licenseNumber).toUpperCase()

        const licenseRegex = /^\d{2}-\d{2}-\d{8}$/
        if (!licenseRegex.test(licenseNumber)) {
            return NextResponse.json(
                { error: 'Invalid license number format. Expected XX-XX-XXXXXXXX (e.g. 01-01-12345678)' },
                {
                    status: 400,
                    headers: rateHeaders,
                }
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

            // Record search log asynchronously in background
            logSearch({
                license_number: licenseNumber,
                status: 'found',
                holder_name: row.holder_name,
                office: row.office,
                category: row.category,
                ip: geo.ip,
                country: geo.country,
                city: geo.city,
                region: geo.region,
                user_agent: request.headers.get('user-agent'),
            }).catch(() => {})

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
                        'Cache-Control': isDeveloper
                            ? 'no-cache, no-store'
                            : 'public, s-maxage=300, stale-while-revalidate=600',
                        ...rateHeaders,
                    },
                }
            )
        }

        // Not found in database — card is not printed yet
        // Record search log asynchronously in background
        logSearch({
            license_number: licenseNumber,
            status: 'not_found',
            ip: geo.ip,
            country: geo.country,
            city: geo.city,
            region: geo.region,
            user_agent: request.headers.get('user-agent'),
        }).catch(() => {})

        return NextResponse.json(
            {
                status: 'success',
                data: null,
                message: 'License not found in printed records',
            },
            {
                headers: {
                    'Cache-Control': isDeveloper
                        ? 'no-cache, no-store'
                        : 'public, s-maxage=60, stale-while-revalidate=120',
                    ...rateHeaders,
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
