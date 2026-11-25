// src/app/api/admin/push/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  getAdminSecret,
  verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
  getPushLogs,
  getPushStats,
  broadcastPushNotification,
  sendTestPush,
  deletePushSubscriptionById,
  deletePushSubscriptionsByStatus,
} from '@/lib/push'

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
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '10', 10) || 10))
  const search = searchParams.get('search') || ''
  const statusParam = searchParams.get('status') || 'all'

  try {
    const [logsData, stats] = await Promise.all([
      getPushLogs({ page, limit, search, status: statusParam }),
      getPushStats(),
    ])

    return NextResponse.json({
      status: 'success',
      data: {
        ...logsData,
        stats,
      },
    })
  } catch (err: unknown) {
    console.error('Failed to retrieve push logs:', err)
    const error = err as Error
    return NextResponse.json(
      { status: 'error', error: error?.message || 'Failed to retrieve push logs.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json(
      { status: 'error', error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.action) {
      return NextResponse.json(
        { status: 'error', error: 'Action is required' },
        { status: 400 }
      )
    }

    if (body.action === 'broadcast') {
      const { title, body: messageBody, url, targetLicense } = body
      if (!title || !messageBody) {
        return NextResponse.json(
          { status: 'error', error: 'Title and Message are required for broadcast' },
          { status: 400 }
        )
      }

      const result = await broadcastPushNotification({
        title,
        body: messageBody,
        url: url || '/',
        targetLicense: targetLicense || null,
      })

      return NextResponse.json({
        status: 'success',
        message: `Broadcast delivered to ${result.sentCount} devices (${result.expiredCount} expired tokens cleaned up).`,
        data: result,
      })
    }

    if (body.action === 'send_test') {
      const { endpoint, p256dh, auth } = body
      if (!endpoint || !p256dh || !auth) {
        return NextResponse.json(
          { status: 'error', error: 'Subscription endpoint, p256dh, and auth keys required' },
          { status: 400 }
        )
      }

      const result = await sendTestPush({ endpoint, p256dh, auth })
      if (!result.success) {
        return NextResponse.json(
          { status: 'error', error: result.error || 'Failed to dispatch test notification' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        status: 'success',
        message: 'Test notification delivered successfully to device.',
      })
    }

    return NextResponse.json(
      { status: 'error', error: 'Invalid action' },
      { status: 400 }
    )
  } catch (err: unknown) {
    console.error('Failed to process push action:', err)
    const error = err as Error
    return NextResponse.json(
      { status: 'error', error: error?.message || 'Internal error' },
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

  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  const statusParam = searchParams.get('status')

  try {
    if (id) {
      const res = await deletePushSubscriptionById(id)
      return NextResponse.json({
        status: 'success',
        message: 'Push subscription deleted successfully.',
        data: res,
      })
    }

    if (statusParam === 'expired' || statusParam === 'unsubscribed') {
      const res = await deletePushSubscriptionsByStatus(statusParam)
      return NextResponse.json({
        status: 'success',
        message: `Deleted ${res.affected} ${statusParam} push subscription(s).`,
        data: res,
      })
    }

    return NextResponse.json(
      { status: 'error', error: 'Must provide either id or valid status (expired/unsubscribed) to delete' },
      { status: 400 }
    )
  } catch (err: unknown) {
    console.error('Failed to delete push subscription:', err)
    const error = err as Error
    return NextResponse.json(
      { status: 'error', error: error?.message || 'Failed to delete' },
      { status: 500 }
    )
  }
}
