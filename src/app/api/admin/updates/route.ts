import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  getAdminSecret,
  verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
  getAdminUpdatesList,
  toggleUpdateDateVisibility,
  saveUpdateEntry,
  deleteUpdateEntry,
  resetDefaultUpdates,
} from '@/lib/updates'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    const { updates, stats } = await getAdminUpdatesList()
    return NextResponse.json({
      status: 'success',
      data: {
        updates,
        stats,
      },
    })
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { status: 'error', error: 'Failed to fetch update entries', details: errMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'toggle') {
      const { id, dateStr, hidden } = body
      if (id === undefined && !dateStr) {
        return NextResponse.json(
          { status: 'error', error: 'Missing entry id or dateStr to toggle' },
          { status: 400 }
        )
      }

      const { updates, stats, updatedItem } = await toggleUpdateDateVisibility(
        { id: id !== undefined ? Number(id) : undefined, dateStr },
        Boolean(hidden)
      )

      return NextResponse.json({
        status: 'success',
        message: `Date ${updatedItem?.dateStr || dateStr} visibility set to ${hidden ? 'hidden' : 'visible'}.`,
        data: {
          updates,
          stats,
          updatedItem,
        },
      })
    }

    if (action === 'save') {
      const { entry } = body
      if (!entry || !entry.dateStr) {
        return NextResponse.json(
          { status: 'error', error: 'Missing update entry data or dateStr' },
          { status: 400 }
        )
      }

      const { updates, stats, savedItem } = await saveUpdateEntry(entry)

      return NextResponse.json({
        status: 'success',
        message: `Update record for ${savedItem.dateStr} saved successfully.`,
        data: {
          updates,
          stats,
          savedItem,
        },
      })
    }

    if (action === 'delete') {
      const { id, dateStr } = body
      if (id === undefined && !dateStr) {
        return NextResponse.json(
          { status: 'error', error: 'Missing entry id or dateStr to delete' },
          { status: 400 }
        )
      }

      const { updates, stats } = await deleteUpdateEntry({
        id: id !== undefined ? Number(id) : undefined,
        dateStr,
      })

      return NextResponse.json({
        status: 'success',
        message: `Update record deleted successfully.`,
        data: {
          updates,
          stats,
        },
      })
    }

    if (action === 'reset') {
      const { updates, stats } = await resetDefaultUpdates()
      return NextResponse.json({
        status: 'success',
        message: 'Sync history reset to default timeline.',
        data: {
          updates,
          stats,
        },
      })
    }

    return NextResponse.json(
      { status: 'error', error: `Unknown action "${action}"` },
      { status: 400 }
    )
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { status: 'error', error: 'Failed to process updates request', details: errMessage },
      { status: 500 }
    )
  }
}
