// src/app/api/developer/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    DEV_SESSION_COOKIE,
    verifyDeveloperSessionToken,
    ensureDeveloperTables,
} from '@/lib/developerAuth'
import { getTurso } from '@/lib/turso'
import { devRateLimiter } from '@/app/api/license/route'

export const dynamic = 'force-dynamic'

export interface AnalyticsTimelinePoint {
    label: string
    timestamp: number
    total: number
    success: number
    rateLimited: number
    error: number
    latencyMs: number
}

export interface KeyBreakdownItem {
    id: string
    name: string
    prefix: string
    total: number
    percentage: number
}

export interface DeveloperAnalyticsResponse {
    timeframe: '24h' | '7d' | '30d'
    summary: {
        totalRequests: number
        successRequests: number
        rateLimitedRequests: number
        errorRequests: number
        avgLatencyMs: number
        successRate: number
        activeKeysCount: number
    }
    quota: {
        limit: number
        used: number
        remaining: number
        resetInSeconds: number
    }
    timeline: AnalyticsTimelinePoint[]
    keysBreakdown: KeyBreakdownItem[]
    isSampleData: boolean
}

// 25-second in-memory cache per developer + timeframe to prevent Turso database read spam
interface CachedAnalytics {
    data: DeveloperAnalyticsResponse
    cachedAt: number
}
const ANALYTICS_CACHE = new Map<string, CachedAnalytics>()
const CACHE_TTL_MS = 25000 // 25 seconds

export async function GET(request: NextRequest) {
    const sessionToken = request.cookies.get(DEV_SESSION_COOKIE)?.value
    const session = await verifyDeveloperSessionToken(sessionToken)

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in with GitHub.' }, { status: 401 })
    }

    try {
        const searchParams = request.nextUrl.searchParams
        const timeframeParam = searchParams.get('timeframe') || '7d'
        const timeframe = (['24h', '7d', '30d'].includes(timeframeParam) ? timeframeParam : '7d') as
            | '24h'
            | '7d'
            | '30d'

        const forceRefresh = searchParams.get('refresh') === 'true'
        const cacheKey = `${session.id}:${timeframe}`
        const now = Date.now()

        // Return from memory cache if recent, saving database reads
        const cached = ANALYTICS_CACHE.get(cacheKey)
        if (!forceRefresh && cached && now - cached.cachedAt < CACHE_TTL_MS) {
            return NextResponse.json(cached.data, {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'X-Analytics-Cache': 'HIT',
                },
            })
        }

        await ensureDeveloperTables()
        const db = getTurso()

        // 1. Fetch developer's keys
        const keysRes = await db.execute({
            sql: `SELECT id, name, key_prefix, rate_limit_per_minute, is_active, COALESCE(total_requests, 0) as total_requests
                  FROM developer_api_keys
                  WHERE developer_id = ?
                  ORDER BY created_at DESC`,
            args: [session.id],
        })

        const activeKeys = keysRes.rows.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            prefix: String(row.key_prefix),
            rateLimit: Number(row.rate_limit_per_minute) || 60,
            isActive: Boolean(row.is_active),
            totalRequests: Number(row.total_requests) || 0,
        }))

        // 2. Compute current sliding window quota across active keys
        let quotaLimit = 60
        let quotaUsed = 0
        let quotaRemaining = 60
        let quotaResetSec = 0

        for (const k of activeKeys) {
            const usage = devRateLimiter.getCurrentUsage(k.id, k.rateLimit)
            quotaLimit = Math.max(quotaLimit, usage.limit)
            quotaUsed += usage.used
            if (usage.reset > 0) {
                const diff = usage.reset - Math.ceil(Date.now() / 1000)
                if (diff > 0 && (quotaResetSec === 0 || diff < quotaResetSec)) {
                    quotaResetSec = diff
                }
            }
        }
        quotaRemaining = Math.max(0, quotaLimit - quotaUsed)

        // 3. Define time buckets
        let bucketCount = 7
        let bucketDurationMs = 24 * 60 * 60 * 1000
        let startTimeMs = now - 7 * 24 * 60 * 60 * 1000

        if (timeframe === '24h') {
            bucketCount = 24
            bucketDurationMs = 60 * 60 * 1000
            startTimeMs = now - 24 * 60 * 60 * 1000
        } else if (timeframe === '30d') {
            bucketCount = 30
            bucketDurationMs = 24 * 60 * 60 * 1000
            startTimeMs = now - 30 * 24 * 60 * 60 * 1000
        }

        // Initialize empty timeline buckets
        const timeline: AnalyticsTimelinePoint[] = []
        for (let i = 0; i < bucketCount; i++) {
            const bucketStart = startTimeMs + i * bucketDurationMs
            const dateObj = new Date(bucketStart)

            let label = ''
            if (timeframe === '24h') {
                label = dateObj.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    hour12: true,
                })
            } else if (timeframe === '7d') {
                label = i === bucketCount - 1 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' })
            } else {
                label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }

            timeline.push({
                label,
                timestamp: bucketStart,
                total: 0,
                success: 0,
                rateLimited: 0,
                error: 0,
                latencyMs: 38,
            })
        }

        // 4. Query recorded metrics for this developer
        const metricsRes = await db.execute({
            sql: `SELECT status_code, latency_ms, created_at, key_id
                  FROM developer_usage_metrics
                  WHERE developer_id = ? AND created_at >= ?
                  ORDER BY created_at ASC`,
            args: [session.id, startTimeMs],
        })

        const rows = metricsRes.rows
        const hasRealMetrics = rows.length > 0

        let totalRequests = 0
        let successRequests = 0
        let rateLimitedRequests = 0
        let errorRequests = 0
        let totalLatencySum = 0

        const keyCounts = new Map<string, number>()

        if (hasRealMetrics) {
            // Populate timeline with real metrics
            const bucketLatencySum = new Array(bucketCount).fill(0)
            const bucketLatencyCount = new Array(bucketCount).fill(0)

            for (const row of rows) {
                const ts = Number(row.created_at)
                const code = Number(row.status_code)
                const latency = Math.max(1, Number(row.latency_ms) || 35)
                const keyId = String(row.key_id)

                const bucketIndex = Math.min(
                    bucketCount - 1,
                    Math.max(0, Math.floor((ts - startTimeMs) / bucketDurationMs))
                )

                timeline[bucketIndex].total++
                totalRequests++
                totalLatencySum += latency

                bucketLatencySum[bucketIndex] += latency
                bucketLatencyCount[bucketIndex]++

                if (code >= 200 && code < 300) {
                    timeline[bucketIndex].success++
                    successRequests++
                } else if (code === 429) {
                    timeline[bucketIndex].rateLimited++
                    rateLimitedRequests++
                } else {
                    timeline[bucketIndex].error++
                    errorRequests++
                }

                keyCounts.set(keyId, (keyCounts.get(keyId) || 0) + 1)
            }

            // Average latency per bucket
            for (let i = 0; i < bucketCount; i++) {
                if (bucketLatencyCount[i] > 0) {
                    timeline[i].latencyMs = Math.round(bucketLatencySum[i] / bucketLatencyCount[i])
                } else {
                    timeline[i].latencyMs = 38
                }
            }
        }

        // 5. If no recorded metrics in table yet, provide realistic preview data
        let isSampleData = false
        const lifetimeKeyRequests = activeKeys.reduce((sum, k) => sum + k.totalRequests, 0)

        if (!hasRealMetrics) {
            isSampleData = true
            // If the keys have lifetime requests, scale sample points realistically, otherwise use clean starter demo
            const baseMultiplier = lifetimeKeyRequests > 0 ? Math.min(30, Math.max(5, Math.round(lifetimeKeyRequests / bucketCount))) : 12

            for (let i = 0; i < bucketCount; i++) {
                // Natural curved variance: slight rise mid-week/mid-day
                const sinVariance = Math.sin((i / bucketCount) * Math.PI) * 0.4
                const pseudoRandom = ((i * 17) % 7) / 10 - 0.3
                const count = Math.max(1, Math.round(baseMultiplier * (1 + sinVariance + pseudoRandom)))

                const successes = Math.max(1, count - (i % 5 === 0 ? 1 : 0))
                const rateLimited = i % 8 === 0 ? 1 : 0
                const errors = count - successes - rateLimited
                const latency = 34 + ((i * 13) % 18)

                timeline[i].total = count
                timeline[i].success = successes
                timeline[i].rateLimited = rateLimited
                timeline[i].error = Math.max(0, errors)
                timeline[i].latencyMs = latency

                totalRequests += count
                successRequests += successes
                rateLimitedRequests += rateLimited
                errorRequests += Math.max(0, errors)
                totalLatencySum += latency * count
            }
        }

        const avgLatencyMs =
            totalRequests > 0 ? Math.round(totalLatencySum / totalRequests) : 38
        const successRate =
            totalRequests > 0 ? Number(((successRequests / totalRequests) * 100).toFixed(1)) : 100.0

        // 6. Build key breakdown
        const keysBreakdown: KeyBreakdownItem[] = activeKeys.map((k) => {
            const count = hasRealMetrics
                ? keyCounts.get(k.id) || 0
                : k.totalRequests > 0
                ? k.totalRequests
                : Math.max(1, Math.round(totalRequests / (activeKeys.length || 1)))

            return {
                id: k.id,
                name: k.name,
                prefix: k.prefix,
                total: count,
                percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 100,
            }
        })

        const response: DeveloperAnalyticsResponse = {
            timeframe,
            summary: {
                totalRequests,
                successRequests,
                rateLimitedRequests,
                errorRequests,
                avgLatencyMs,
                successRate,
                activeKeysCount: activeKeys.length,
            },
            quota: {
                limit: quotaLimit,
                used: quotaUsed,
                remaining: quotaRemaining,
                resetInSeconds: quotaResetSec,
            },
            timeline,
            keysBreakdown,
            isSampleData,
        }

        // Cache in memory for subsequent requests
        ANALYTICS_CACHE.set(cacheKey, { data: response, cachedAt: Date.now() })

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-Analytics-Cache': 'MISS',
            },
        })
    } catch (error) {
        console.error('Error calculating developer analytics:', error)
        return NextResponse.json({ error: 'Failed to generate developer analytics' }, { status: 500 })
    }
}
