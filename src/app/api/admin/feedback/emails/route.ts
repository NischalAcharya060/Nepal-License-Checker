// src/app/api/admin/feedback/emails/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import { getEmailLogsForRecipient } from '@/lib/emailLogs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest): Promise<boolean> {
    const secret = getAdminSecret()
    if (!secret) return false
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    return verifyAdminSessionToken(token, secret)
}

export async function GET(request: NextRequest) {
    if (!(await checkAuth(request))) {
        return NextResponse.json(
            { status: 'error', error: 'Unauthorized' },
            { status: 401 }
        )
    }

    const { searchParams } = request.nextUrl
    const email = searchParams.get('email') || ''
    const ticketId = searchParams.get('ticketId') || searchParams.get('id') || ''

    if (!email && !ticketId) {
        return NextResponse.json(
            { status: 'error', error: 'Email or Ticket ID is required.' },
            { status: 400 }
        )
    }

    try {
        const logs = await getEmailLogsForRecipient({ email, ticketId })
        return NextResponse.json({
            status: 'success',
            data: {
                email,
                ticketId,
                total: logs.length,
                logs,
            },
        })
    } catch (err: unknown) {
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error.message || 'Failed to fetch email logs' },
            { status: 500 }
        )
    }
}
