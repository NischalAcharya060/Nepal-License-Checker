// src/app/api/feedback/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getFeedbackByEmail, getFeedbackById, FEEDBACK_CATEGORIES, FeedbackItem } from '@/lib/feedback'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const rateLimitMap = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const windowMs = 10 * 60 * 1000 // 10 minutes
    const maxLookups = 40 // allow up to 40 lookups in 10 mins

    const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < windowMs)
    if (timestamps.length >= maxLookups) {
        return true
    }
    timestamps.push(now)
    rateLimitMap.set(ip, timestamps)

    if (rateLimitMap.size > 1000) {
        for (const [key, times] of rateLimitMap.entries()) {
            if (times.every((t) => now - t >= windowMs)) {
                rateLimitMap.delete(key)
            }
        }
    }

    return false
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl
        const query = searchParams.get('query')?.trim() || searchParams.get('q')?.trim() || ''
        const rawEmail = searchParams.get('email')?.trim() || ''
        const rawId = searchParams.get('id')?.trim() || searchParams.get('ref')?.trim() || ''

        let email = rawEmail
        let referenceId = rawId.replace(/^#/, '')

        // If a smart unified query is provided, auto-detect email vs reference ID
        if (query) {
            if (query.includes('@')) {
                email = query
            } else {
                referenceId = query.replace(/^#/, '')
            }
        }

        if (!email && !referenceId) {
            return NextResponse.json(
                { status: 'error', error: 'Please provide either your submitted Email address or Tracking Reference No (e.g. fb_...).' },
                { status: 400 }
            )
        }

        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1'

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { status: 'error', error: 'Too many status inquiries. Please wait a few minutes before checking again.' },
                { status: 429 }
            )
        }

        let items: FeedbackItem[] = []

        if (referenceId && !email) {
            // Track by Reference ID alone
            const item = await getFeedbackById(referenceId)
            if (item) {
                items = [item]
            }
        } else if (email && !referenceId) {
            // Track by Email alone
            items = await getFeedbackByEmail(email)
        } else if (email && referenceId) {
            // Both provided: first try by reference ID, verify email
            const item = await getFeedbackById(referenceId)
            if (item && item.email.toLowerCase() === email.toLowerCase()) {
                items = [item]
            } else if (item) {
                // If ID found but email doesn't match, return empty or by email
                items = await getFeedbackByEmail(email)
            } else {
                items = await getFeedbackByEmail(email)
            }
        }

        // Enrich category labels
        const categoryMap = new Map(FEEDBACK_CATEGORIES.map((c) => [c.id, c]))

        const enriched = items.map((item) => {
            const catObj = categoryMap.get(item.category)
            return {
                id: item.id,
                name: item.name,
                email: item.email,
                license_number: item.license_number,
                category: item.category,
                categoryLabel: catObj?.label || item.category,
                categoryLabelNe: catObj?.labelNe || item.category,
                isProblem: catObj?.isProblem ?? true,
                subject: item.subject,
                message: item.message,
                status: item.status,
                admin_notes: item.admin_notes,
                created_at: item.created_at,
                updated_at: item.updated_at,
            }
        })

        // If a specific target reference ID was asked, sort it first
        if (referenceId && enriched.length > 1) {
            enriched.sort((a, b) => {
                if (a.id === referenceId) return -1
                if (b.id === referenceId) return 1
                return b.created_at - a.created_at
            })
        }

        return NextResponse.json({
            status: 'success',
            email: email || undefined,
            referenceId: referenceId || undefined,
            total: enriched.length,
            items: enriched,
        })
    } catch (err: unknown) {
        console.error('Failed to track feedback status:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to retrieve feedback status.' },
            { status: 500 }
        )
    }
}
