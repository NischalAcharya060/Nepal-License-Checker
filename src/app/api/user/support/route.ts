// src/app/api/user/support/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/userAuth'
import { getTurso } from '@/lib/turso'
import { ensureFeedbackTable, createFeedback, FEEDBACK_CATEGORIES, type FeedbackItem } from '@/lib/feedback'
import { sendFeedbackConfirmationEmail } from '@/lib/email'
import { extractGeo } from '@/lib/geo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        await ensureFeedbackTable()
        const db = getTurso()

        const res = await db.execute({
            sql: `SELECT id, name, email, license_number, category, subject, message, status, admin_notes, created_at, updated_at 
                  FROM user_feedbacks 
                  WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) 
                  ORDER BY created_at DESC`,
            args: [user.email],
        })

        const tickets: FeedbackItem[] = res.rows.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            email: String(row.email),
            license_number: (row.license_number as string) || null,
            category: String(row.category),
            subject: String(row.subject),
            message: String(row.message),
            status: (row.status as FeedbackItem['status']) || 'new',
            admin_notes: (row.admin_notes as string) || null,
            created_at: Number(row.created_at),
            updated_at: Number(row.updated_at),
        }))

        return NextResponse.json({ tickets })
    } catch (err: unknown) {
        console.error('[API user/support GET] Error:', err)
        return NextResponse.json({ error: 'Failed to retrieve support history.' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const { category, subject, message, licenseNumber, name } = body

        if (!category || typeof category !== 'string' || !category.trim()) {
            return NextResponse.json({ error: 'Please choose an inquiry category.' }, { status: 400 })
        }

        if (!message || typeof message !== 'string' || message.trim().length < 5) {
            return NextResponse.json({ error: 'Please enter your message (at least 5 characters).' }, { status: 400 })
        }

        const senderName = (name && typeof name === 'string' && name.trim()) || user.name || user.email.split('@')[0]
        const geo = extractGeo(request)

        const result = await createFeedback({
            name: senderName,
            email: user.email,
            licenseNumber: licenseNumber ? String(licenseNumber).trim().toUpperCase() : undefined,
            category: String(category).trim(),
            subject: subject ? String(subject).trim() : undefined,
            message: String(message).trim(),
            ip: geo.ip,
        })

        // Send confirmation email in background
        const categoryObj = FEEDBACK_CATEGORIES.find((c) => c.id === category)
        const displaySubject = (subject || categoryObj?.label || category).trim()
        sendFeedbackConfirmationEmail({
            to: user.email,
            name: senderName,
            ticketId: result.id,
            subject: displaySubject,
            category: String(category).trim(),
            licenseNumber: licenseNumber ? String(licenseNumber).trim().toUpperCase() : null,
            userMessage: String(message).trim(),
        }).catch((err) => console.error('[UserSupport] Error sending confirmation email:', err))

        return NextResponse.json({
            success: true,
            id: result.id,
            message: 'Support inquiry submitted successfully. Our team will review it shortly.',
        })
    } catch (err: unknown) {
        console.error('[API user/support POST] Error:', err)
        return NextResponse.json({ error: 'Failed to submit support inquiry.' }, { status: 500 })
    }
}
