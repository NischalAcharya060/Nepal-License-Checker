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
    const idsParam = searchParams.get('ids')
    const status = searchParams.get('status')
    const all = searchParams.get('all')
    const db = getTurso()

    if (id) {
      await db.execute({
        sql: 'DELETE FROM license_notifications WHERE id = ?',
        args: [id],
      })
      return NextResponse.json({ status: 'success', message: 'Notification log deleted.' })
    }

    if (idsParam) {
      const ids = idsParam
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(', ')
        await db.execute({
          sql: `DELETE FROM license_notifications WHERE id IN (${placeholders})`,
          args: ids,
        })
      }
      return NextResponse.json({ status: 'success', message: 'Selected notification logs deleted.' })
    }

    if (status === 'cancelled' || status === 'sent' || status === 'pending') {
      await db.execute({
        sql: 'DELETE FROM license_notifications WHERE status = ?',
        args: [status],
      })
      return NextResponse.json({ status: 'success', message: `All ${status} notifications deleted.` })
    }

    if (all === 'true') {
      await db.execute('DELETE FROM license_notifications')
      return NextResponse.json({ status: 'success', message: 'All notifications deleted.' })
    }

    return NextResponse.json(
      { status: 'error', error: 'Specify id, ids, status, or all=true to delete.' },
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
