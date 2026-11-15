import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, getAdminSecret, verifyAdminSessionToken } from '@/lib/adminAuth'
import { getSystemMode, setSystemMode, SystemMode } from '@/lib/systemMode'
import { MAINT_COOKIE, createSessionToken } from '@/lib/maintenanceAuth'

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
        return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const config = await getSystemMode()
        return NextResponse.json({ status: 'success', data: config })
    } catch (err) {
        console.error('Failed to get system mode:', err)
        return NextResponse.json({ status: 'error', error: 'Failed to get system mode' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    if (!(await checkAuth(request))) {
        return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json().catch(() => ({}))
        const mode = body?.mode as SystemMode
        const message = typeof body?.message === 'string' ? body.message : ''

        if (mode !== 'normal' && mode !== 'maintenance' && mode !== 'degraded') {
            return NextResponse.json(
                { status: 'error', error: 'Invalid mode. Must be "normal", "maintenance", or "degraded"' },
                { status: 400 }
            )
        }

        const updated = await setSystemMode(mode, message, 'admin')
        const response = NextResponse.json({ status: 'success', data: updated })

        // If switching to maintenance mode, issue maintenance bypass cookie to admin so they are never blocked
        const maintSecret = process.env.MAINTENANCE_PASSWORD
        if (mode === 'maintenance' && maintSecret) {
            const token = await createSessionToken(maintSecret)
            response.cookies.set(MAINT_COOKIE, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 12 * 60 * 60,
            })
        }

        return response
    } catch (err) {
        console.error('Failed to update system mode:', err)
        return NextResponse.json({ status: 'error', error: 'Failed to update system mode' }, { status: 500 })
    }
}
