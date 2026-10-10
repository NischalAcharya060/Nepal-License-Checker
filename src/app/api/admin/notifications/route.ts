// src/app/api/admin/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  getAdminSecret,
  verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
  getNotificationLogs,
  getNotificationStats,
} from '@/lib/notifications'
import { getTurso } from '@/lib/turso'

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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10) || 50))
  const search = searchParams.get('search') || ''
  const statusParam = searchParams.get('status') || 'all'

  try {
    const [logsData, stats] = await Promise.all([
      getNotificationLogs({ page, limit, search, status: statusParam }),
      getNotificationStats(),
    ])

    return NextResponse.json({
      status: 'success',
      data: {
        ...logsData,
        stats,
      },
    })
  } catch (err: unknown) {
    console.error('Failed to retrieve notification logs:', err)
    const error = err as Error
    return NextResponse.json(
      { status: 'error', error: error?.message || 'Failed to retrieve notification logs.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json(
      { status: 'error', error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const db = getTurso()

    if (id) {
      await db.execute({
        sql: 'DELETE FROM license_notifications WHERE id = ?',
        args: [id],
      })
      return NextResponse.json({ status: 'success', message: 'Notification log deleted.' })
    }

    if (status === 'cancelled') {
      await db.execute({
        sql: "DELETE FROM license_notifications WHERE status = 'cancelled'",
      })
      return NextResponse.json({ status: 'success', message: 'All cancelled notifications pruned.' })
    }

    return NextResponse.json(
      { status: 'error', error: 'Specify an id or status to delete.' },
      { status: 400 }
    )
  } catch (err: unknown) {
    console.error('Failed to delete notification:', err)
    const error = err as Error
    return NextResponse.json(
      { status: 'error', error: error?.message || 'Failed to delete notification log.' },
      { status: 500 }
    )
  }
}
