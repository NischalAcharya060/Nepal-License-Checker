// src/app/api/testimonials/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    createTestimonialSubmission,
    getPublicTestimonials,
} from '@/lib/testimonials'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-memory rate limiting map (IP -> timestamps[])
const rateLimitMap = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxSubmissions = 3 // max 3 submissions per IP in 15 minutes

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

export async function GET() {
    try {
        const data = await getPublicTestimonials()
        return NextResponse.json(
            {
                status: 'success',
                data,
            },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                },
            }
        )
    } catch (err: unknown) {
        console.error('Failed to fetch public testimonials:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to fetch testimonials.' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, role, rating, message, email } = body

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return NextResponse.json(
                { status: 'error', error: 'Please provide your full name (at least 2 characters).' },
                { status: 400 }
            )
        }

        const numRating = Number(rating)
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return NextResponse.json(
                { status: 'error', error: 'Please choose a rating between 1 and 5 stars.' },
                { status: 400 }
            )
        }

        if (!message || typeof message !== 'string' || message.trim().length < 5) {
            return NextResponse.json(
                { status: 'error', error: 'Please write your feedback or testimonial (at least 5 characters).' },
                { status: 400 }
            )
        }

        if (email && (typeof email !== 'string' || !email.includes('@'))) {
            return NextResponse.json(
                { status: 'error', error: 'Please provide a valid email address or leave it blank.' },
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
                    error: 'You have submitted testimonials recently. Please wait a few minutes before submitting again.',
                },
                { status: 429 }
            )
        }

        const result = await createTestimonialSubmission({
            name,
            role,
            rating: numRating,
            message,
            email,
            ip,
        })

        return NextResponse.json({
            status: 'success',
            message: 'Thank you for your valuable feedback! It has been submitted and will be displayed once approved by our admin team.',
            id: result.id,
        })
    } catch (err: unknown) {
        console.error('Failed to submit testimonial:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to submit feedback.' },
            { status: 500 }
        )
    }
}
