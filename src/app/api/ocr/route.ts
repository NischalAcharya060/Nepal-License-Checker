// src/app/api/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { extractGeo } from '@/lib/geo'
import { RateLimiter } from '@/lib/rateLimit'
import { extractLicenseFromImage } from '@/lib/geminiOcr'
import { logOcrScan } from '@/lib/ocrSettings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Rate limiter: 10 requests per minute per IP, with a 2-minute cooldown if breached
const ocrRateLimiter = new RateLimiter(10, 60000, 120000)

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  let clientIp = '127.0.0.1'

  try {
    const geo = extractGeo(request)
    clientIp = geo.ip
    const ip = geo.ip

    const rateStatus = ocrRateLimiter.checkLimit(ip)
    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'RATE_LIMITED',
          message: `Too many scan requests. Please wait ${rateStatus.retryAfter} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateStatus.retryAfter),
          },
        }
      )
    }

    const contentType = request.headers.get('content-type') || ''
    let base64Data = ''
    let mimeType = 'image/jpeg'

    if (contentType.includes('application/json')) {
      const body = await request.json()
      base64Data = body?.image || body?.base64 || ''
      mimeType = body?.mimeType || 'image/jpeg'
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('image') || formData.get('file')

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          {
            status: 'error',
            code: 'MISSING_FILE',
            message: 'No image file uploaded. Please upload a receipt or card image.',
          },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      base64Data = buffer.toString('base64')
      mimeType = file.type || 'image/jpeg'
    } else {
      return NextResponse.json(
        {
          status: 'error',
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Expected application/json or multipart/form-data payload.',
        },
        { status: 415 }
      )
    }

    if (!base64Data) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'EMPTY_IMAGE',
          message: 'No image data provided. Please provide an image to scan.',
        },
        { status: 400 }
      )
    }

    // Safety guard: max 6MB base64 payload (~4.5MB image)
    if (base64Data.length > 6 * 1024 * 1024) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'IMAGE_TOO_LARGE',
          message: 'The image is too large. Please upload an image smaller than 4MB.',
        },
        { status: 413 }
      )
    }

    const ocrResult = await extractLicenseFromImage({
      base64Data,
      mimeType,
    })

    const latencyMs = Math.round(performance.now() - startTime)

    // Log scan asynchronously in Turso
    logOcrScan({
      license_number: ocrResult.licenseNumber || null,
      status: ocrResult.success
        ? 'success'
        : ocrResult.error === 'TIMEOUT'
        ? 'timeout'
        : ocrResult.error === 'NOT_FOUND'
        ? 'not_found'
        : 'error',
      latency_ms: latencyMs,
      confidence: ocrResult.confidence || null,
      detected_source: ocrResult.detectedSource || null,
      model_used: ocrResult.modelUsed || null,
      ip: clientIp,
      error_message: !ocrResult.success ? ocrResult.message : null,
    }).catch(() => {})

    if (!ocrResult.success) {
      const statusCode =
        ocrResult.error === 'GEMINI_API_KEY_MISSING' || ocrResult.error === 'OCR_DISABLED'
          ? 503
          : 422

      return NextResponse.json(
        {
          status: 'error',
          code: ocrResult.error || 'OCR_FAILED',
          message: ocrResult.message || 'Failed to detect a valid driving license number.',
          rawDetected: ocrResult.rawDetected,
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      status: 'success',
      data: {
        licenseNumber: ocrResult.licenseNumber,
        confidence: ocrResult.confidence,
        detectedSource: ocrResult.detectedSource,
        rawDetected: ocrResult.rawDetected,
      },
    })
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error)
    const latencyMs = Math.round(performance.now() - startTime)

    logOcrScan({
      status: 'error',
      latency_ms: latencyMs,
      ip: clientIp,
      error_message: errMessage,
    }).catch(() => {})

    return NextResponse.json(
      {
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing the image. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errMessage : undefined,
      },
      { status: 500 }
    )
  }
}
