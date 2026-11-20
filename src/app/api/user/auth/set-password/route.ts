// src/app/api/user/auth/set-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, setUserPassword } from '@/lib/userAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please sign in first.' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const newPassword = String(body.newPassword || '')
        const currentPassword = body.currentPassword ? String(body.currentPassword) : undefined

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json(
                { error: 'New password must be at least 6 characters long.' },
                { status: 400 }
            )
        }

        const result = await setUserPassword(user.id, newPassword, currentPassword)

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Failed to update password.' }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully.',
        })
    } catch (err: unknown) {
        console.error('[API user/auth/set-password] Error:', err)
        return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
    }
}
