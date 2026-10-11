// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createFeedback, FEEDBACK_CATEGORIES } from '@/lib/feedback'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-memory rate limiting map (IP -> timestamps[])
const rateLimitMap = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxSubmissions = 5

    const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < windowMs)
    if (timestamps.length >= maxSubmissions) {
        return true
    }
    timestamps.push(now)
    rateLimitMap.set(ip, timestamps)

    // Cleanup old map entries
    if (rateLimitMap.size > 1000) {
        for (const [key, times] of rateLimitMap.entries()) {
            if (times.every((t) => now - t >= windowMs)) {
                rateLimitMap.delete(key)
            }
        }
    }

    return false
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, email, licenseNumber, category, subject, message } = body

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json(
                { status: 'error', error: 'Please provide your name.' },
                { status: 400 }
            )
        }

        if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
            return NextResponse.json(
                { status: 'error', error: 'Please provide a valid email address.' },
                { status: 400 }
            )
        }

        if (!category || typeof category !== 'string' || !category.trim()) {
            return NextResponse.json(
                { status: 'error', error: 'Please select a problem or inquiry category.' },
                { status: 400 }
            )
        }

        if (!message || typeof message !== 'string' || message.trim().length < 5) {
            return NextResponse.json(
                { status: 'error', error: 'Please describe your problem or suggestion (at least 5 characters).' },
                { status: 400 }
            )
        }

        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1'

        if (isRateLimited(ip)) {
            return NextResponse.json(
                {
                    status: 'error',
                    error: 'You have submitted multiple messages recently. Please wait a few minutes before submitting again.',
                },
                { status: 429 }
            )
        }

        const result = await createFeedback({
            name,
            email,
            licenseNumber,
            category,
            subject,
            message,
            ip,
        })

        return NextResponse.json({
            status: 'success',
            message: 'Thank you! Your feedback has been received. Our team will review it shortly.',
            id: result.id,
        })
    } catch (err: unknown) {
        console.error('Failed to submit feedback:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to submit feedback.' },
            { status: 500 }
        )
    }
}

export async function GET() {
    // Return categories list for frontend options
    return NextResponse.json({
        status: 'success',
        categories: FEEDBACK_CATEGORIES,
    })
}
