// src/app/api/admin/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  getAdminSecret,
  verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
  getActiveOcrConfig,
  saveOcrConfig,
  getOcrStats,
  getOcrLogs,
  testGeminiKey,
  deleteOcrLogs,
  clearAllOcrLogs,
} from '@/lib/ocrSettings'

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const [config, stats, logsData] = await Promise.all([
      getActiveOcrConfig(),
      getOcrStats(),
      getOcrLogs({ page, limit, search, status }),
    ])

    return NextResponse.json({
      status: 'success',
      config,
      stats,
      logs: logsData.logs,
      pagination: {
        page,
        limit,
        total: logsData.total,
        totalPages: logsData.totalPages,
      },
    })
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { status: 'error', error: 'Failed to fetch OCR administration data', details: errMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'update_config') {
      const { apiKey, model, enabled } = body
      await saveOcrConfig({ apiKey, model, enabled })
      const updatedConfig = await getActiveOcrConfig()
      return NextResponse.json({
        status: 'success',
        message: 'OCR settings updated successfully',
        config: updatedConfig,
      })
    }

    if (action === 'test_key') {
      const { apiKey, model } = body
      const config = await getActiveOcrConfig()
      const keyToTest = apiKey ? apiKey.trim() : config.apiKey
      const modelToTest = model ? model.trim() : config.model

      if (!keyToTest) {
        return NextResponse.json(
          { status: 'error', message: 'No API key provided to test' },
          { status: 400 }
        )
      }

      const testResult = await testGeminiKey(keyToTest, modelToTest)
      return NextResponse.json({
        status: testResult.success ? 'success' : 'error',
        ...testResult,
      })
    }

    if (action === 'delete_logs') {
      const { ids } = body
      if (Array.isArray(ids) && ids.length > 0) {
        await deleteOcrLogs(ids)
      }
      return NextResponse.json({
        status: 'success',
        message: 'Selected logs deleted successfully',
      })
    }

    if (action === 'clear_logs') {
      await clearAllOcrLogs()
      return NextResponse.json({
        status: 'success',
        message: 'All OCR logs cleared',
      })
    }

    return NextResponse.json(
      { status: 'error', message: 'Invalid action specified' },
      { status: 400 }
    )
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { status: 'error', error: 'Action failed', details: errMessage },
      { status: 500 }
    )
  }
}
