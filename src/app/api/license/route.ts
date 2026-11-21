// src/app/api/license/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTurso, type LicenseRow } from '@/lib/turso'
import { RateLimiter, dashboardUserRateLimiter } from '@/lib/rateLimit'
import { sanitizeInput } from '@/utils/sanitize'
import { extractGeo } from '@/lib/geo'
import { logSearch } from '@/lib/searchLogger'
import { validateDeveloperApiKey, recordApiKeyUsage, recordDeveloperUsageMetric } from '@/lib/developerAuth'
import { getCurrentUser } from '@/lib/userAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Standard anonymous IP rate limiter: 15 req/min, with a 5-minute (300,000ms) lockout penalty
export const ipRateLimiter = new RateLimiter(15, 60000, 300000)

// Authenticated developer rate limiter: standard sliding window per API key (default 60 req/min, 0 lockout)
export const devRateLimiter = new RateLimiter(60, 60000, 0)

export async function GET(request: NextRequest) {
    const startTime = performance.now()
    let devKeyInfo: { developerId: string; keyId: string } | null = null
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
            if (!devKey.valid) {
                if (devKey.reason === 'suspended') {
                    // Record metric so the developer and admin see 403 in their analytics
                    recordDeveloperUsageMetric({
                        developerId: devKey.developerId,
                        keyId: devKey.keyId,
                        statusCode: 403,
                        latencyMs: Math.round(performance.now() - startTime),
                    })

                    return NextResponse.json(
                        {
                            error: 'This API key has been suspended by an administrator. Requests using this key are blocked.',
                            code: 'API_KEY_SUSPENDED',
                        },
                        { status: 403 }
                    )
                }

                return NextResponse.json(
                    {
                        error: 'Invalid, revoked, or non-existent API key. Please check your developer dashboard.',
                        code: 'INVALID_API_KEY',
                    },
                    { status: 401 }
                )
            }

            isDeveloper = true
            devKeyInfo = { developerId: devKey.developerId, keyId: devKey.keyId }
            rateStatus = devRateLimiter.checkLimit(devKey.keyId, devKey.rateLimit)
            recordApiKeyUsage(devKey.keyId)

            rateHeaders = {
                'X-RateLimit-Limit': String(rateStatus.limit ?? devKey.rateLimit),
                'X-RateLimit-Remaining': String(rateStatus.remaining ?? 0),
                'X-RateLimit-Reset': String(rateStatus.reset ?? Math.ceil(Date.now() / 1000)),
            }
        } else if (request.nextUrl.searchParams.get('source') === 'dashboard') {
            // Citizen user dashboard live check rate limiting: 5 req per 5 minutes, 1-hour lockout
            const user = await getCurrentUser(request).catch(() => null)
            const rateKey = user ? `user_${user.id}` : `dash_ip_${ip}`
            rateStatus = dashboardUserRateLimiter.checkLimit(rateKey)

            rateHeaders = {
                'X-RateLimit-Limit': String(rateStatus.limit ?? 5),
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

        const logDevMetric = (statusCode: number) => {
            if (devKeyInfo) {
                recordDeveloperUsageMetric({
                    developerId: devKeyInfo.developerId,
                    keyId: devKeyInfo.keyId,
                    statusCode,
                    latencyMs: Math.round(performance.now() - startTime),
                })
            }
        }

        if (!rateStatus.allowed) {
            logDevMetric(429)
            const isDashboard = request.nextUrl.searchParams.get('source') === 'dashboard'
            const minutes = Math.ceil(rateStatus.retryAfter / 60)
            const hours = Math.floor(rateStatus.retryAfter / 3600)
            const waitMsg =
                hours >= 1
                    ? `${hours} hour${hours > 1 ? 's' : ''}`
                    : minutes > 1
                    ? `${minutes} minutes`
                    : `${rateStatus.retryAfter} seconds`
            const errorMessage = isDashboard
                ? `Rate limit reached. You can check up to 5 times per 5 minutes. Please wait ${waitMsg} before checking again.`
                : `Too many searches. Please wait ${waitMsg} before searching again.`
            return NextResponse.json(
                {
                    status: 'error',
                    code: 'RATE_LIMIT_EXCEEDED',
                    error: errorMessage,
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
        const rawSource = searchParams.get('source')
        const searchSource: string =
            rawSource === 'scanner' ? 'scanner' : rawSource === 'dashboard' ? 'dashboard' : 'manual'

        if (!licenseNumber) {
            logDevMetric(400)
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
            logDevMetric(400)
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
            logDevMetric(200)
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
                source: searchSource,
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
        logDevMetric(200)
        // Record search log asynchronously in background
        logSearch({
            license_number: licenseNumber,
            status: 'not_found',
            ip: geo.ip,
            country: geo.country,
            city: geo.city,
            region: geo.region,
            user_agent: request.headers.get('user-agent'),
            source: searchSource,
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
        if (devKeyInfo) {
            recordDeveloperUsageMetric({
                developerId: devKeyInfo.developerId,
                keyId: devKeyInfo.keyId,
                statusCode: 500,
                latencyMs: Math.round(performance.now() - startTime),
            })
        }
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        )
    }
}
