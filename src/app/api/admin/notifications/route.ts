// src/app/api/admin/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  ADMIN_COOKIE,
  getAdminSecret,
  verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
  getNotificationLogs,
  getNotificationStats,
} from '@/lib/notifications'
import { sendSubscriptionConfirmationEmail } from '@/lib/email'
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
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '10', 10) || 10))
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

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json(
      { status: 'error', error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid JSON request payload' },
        { status: 400 }
      )
    }

    const { action, id, ids, allPending } = body
    const db = getTurso()

    // 1. Single email dispatch
    if (action === 'send_single' || (id && !ids && !allPending)) {
      const targetId = String(id || body.notificationId).trim()
      if (!targetId) {
        return NextResponse.json(
          { status: 'error', error: 'Notification ID is required.' },
          { status: 400 }
        )
      }

      const res = await db.execute({
        sql: `SELECT id, license_number, email, unsubscribe_token, status FROM license_notifications WHERE id = ? LIMIT 1`,
        args: [targetId],
      })

      if (!res.rows || res.rows.length === 0) {
        return NextResponse.json(
          { status: 'error', error: 'Notification subscription not found.' },
          { status: 404 }
        )
      }

      const row = res.rows[0]
      let token = String(row.unsubscribe_token || '').trim()
      if (!token) {
        token = crypto.randomBytes(24).toString('hex')
        await db.execute({
          sql: `UPDATE license_notifications SET unsubscribe_token = ? WHERE id = ?`,
          args: [token, targetId],
        })
      }

      const sendRes = await sendSubscriptionConfirmationEmail({
        to: String(row.email),
        licenseNumber: String(row.license_number),
        unsubscribeToken: token,
        isResend: true,
      })

      if (sendRes.success) {
        await db.execute({
          sql: `UPDATE license_notifications SET confirmation_sent_at = ? WHERE id = ?`,
          args: [Date.now(), targetId],
        })
      }

      return NextResponse.json({
        status: 'success',
        message: `Confirmation email dispatched to ${row.email} for license ${row.license_number}.`,
        data: {
          id: targetId,
          email: row.email,
          licenseNumber: row.license_number,
          provider: sendRes.provider,
          success: sendRes.success,
        },
      })
    }

    // 2. Bulk by IDs (e.g. selected rows)
    if (Array.isArray(ids) && ids.length > 0) {
      const cleanIds = ids.map((x) => String(x).trim()).filter(Boolean)
      if (cleanIds.length === 0) {
        return NextResponse.json(
          { status: 'error', error: 'No valid notification IDs provided.' },
          { status: 400 }
        )
      }

      const placeholders = cleanIds.map(() => '?').join(', ')
      const res = await db.execute({
        sql: `SELECT id, license_number, email, unsubscribe_token, status FROM license_notifications WHERE id IN (${placeholders})`,
        args: cleanIds,
      })

      const rows = res.rows || []
      let sentCount = 0
      let failedCount = 0

      for (const row of rows) {
        let token = String(row.unsubscribe_token || '').trim()
        if (!token) {
          token = crypto.randomBytes(24).toString('hex')
          await db.execute({
            sql: `UPDATE license_notifications SET unsubscribe_token = ? WHERE id = ?`,
            args: [token, String(row.id)],
          })
        }

        try {
          const sendRes = await sendSubscriptionConfirmationEmail({
            to: String(row.email),
            licenseNumber: String(row.license_number),
            unsubscribeToken: token,
            isResend: true,
          })
          if (sendRes.success) {
            sentCount++
            await db.execute({
              sql: `UPDATE license_notifications SET confirmation_sent_at = ? WHERE id = ?`,
              args: [Date.now(), String(row.id)],
            })
          } else {
            failedCount++
          }
        } catch {
          failedCount++
        }
      }

      return NextResponse.json({
        status: 'success',
        message: `Processed ${rows.length} notification(s): ${sentCount} sent successfully, ${failedCount} failed.`,
        data: {
          total: rows.length,
          sentCount,
          failedCount,
        },
      })
    }

    // 3. Send to all unnotified pending subscribers
    if (allPending || action === 'send_all_pending') {
      const res = await db.execute({
        sql: `SELECT id, license_number, email, unsubscribe_token, status
              FROM license_notifications
              WHERE status = 'pending' AND (confirmation_sent_at IS NULL OR confirmation_sent_at = 0)`,
      })

      const rows = res.rows || []
      if (rows.length === 0) {
        return NextResponse.json({
          status: 'success',
          message: 'All pending subscribers have already received their confirmation email.',
          data: { total: 0, sentCount: 0, failedCount: 0 },
        })
      }

      let sentCount = 0
      let failedCount = 0

      for (const row of rows) {
        let token = String(row.unsubscribe_token || '').trim()
        if (!token) {
          token = crypto.randomBytes(24).toString('hex')
          await db.execute({
            sql: `UPDATE license_notifications SET unsubscribe_token = ? WHERE id = ?`,
            args: [token, String(row.id)],
          })
        }

        try {
          const sendRes = await sendSubscriptionConfirmationEmail({
            to: String(row.email),
            licenseNumber: String(row.license_number),
            unsubscribeToken: token,
            isResend: true,
          })
          if (sendRes.success) {
            sentCount++
            await db.execute({
              sql: `UPDATE license_notifications SET confirmation_sent_at = ? WHERE id = ?`,
              args: [Date.now(), String(row.id)],
            })
          } else {
            failedCount++
          }
        } catch {
          failedCount++
        }
      }

      return NextResponse.json({
        status: 'success',
        message: `Successfully dispatched confirmation emails to ${sentCount} pending subscriber(s) (${failedCount} failed).`,
        data: {
          total: rows.length,
          sentCount,
          failedCount,
        },
      })
    }

    return NextResponse.json(
      { status: 'error', error: 'Invalid action. Provide id, ids, or allPending: true.' },
      { status: 400 }
    )
  } catch (err: unknown) {
    console.error('Failed to dispatch notification email(s):', err)
    const error = err as Error
    return NextResponse.json(
      { status: 'error', error: error.message || 'Failed to dispatch notification email.' },
      { status: 500 }
    )
  }
}
