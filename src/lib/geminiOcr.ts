// src/lib/geminiOcr.ts
import { devanagariToAsciiDigits } from '@/utils/sanitize'
import { formatLicenseNumber, validateLicenseNumber } from '@/utils/validation'
import { getActiveOcrConfig } from './ocrSettings'

export interface OcrResult {
  success: boolean
  licenseNumber?: string
  confidence?: 'high' | 'medium' | 'low'
  detectedSource?: string
  rawDetected?: string
  modelUsed?: string
  error?: string
  message?: string
}

const SYSTEM_INSTRUCTION = `You are an expert OCR vision system specialized in reading Nepal Driving Licenses, Department of Transport Management (DOTM / Yatayat Karyalaya) temporary revenue receipts (रसिद / Chit), and biometric application slips.

Your goal is to identify and extract the Nepal Driving License Number or Application / Registration Number from the image.

Key Characteristics of Nepal Driving License Numbers:
- Standard Format: XX-XX-XXXXXXXX (e.g., 01-06-00123456, 01-01-12345678, total 12 digits).
- The first 2 digits represent the Office code (e.g. 01 for Bagmati/Ekantakuna, 02 for Gandaki, etc.).
- On receipts, the number may appear with hyphens, slashes, spaces, or as 12 continuous digits.
- The numbers may be printed OR handwritten in ballpoint pen by Yatayat clerks.
- The numbers may be in Western digits (0-9) OR Nepali Devanagari numerals (०, १, २, ३, ४, ५, ६, ७, ८, ९).

Rules:
1. Carefully inspect the entire receipt or card for a 12-digit number (or pattern matching XX-XX-XXXXXXXX).
2. If numbers are in Nepali/Devanagari numerals, accurately identify the corresponding digits.
3. If multiple numbers exist (e.g., fiscal year, date, voucher number), prioritize the one that matches the 12-digit driving license / application format.
4. Output strictly valid JSON matching this schema:
{
  "found": boolean,
  "license_number": string | null,
  "confidence": "high" | "medium" | "low",
  "detected_source": "smart_card" | "revenue_receipt" | "handwritten_slip" | "biometric_token" | "unknown",
  "notes": string
}`

export async function extractLicenseFromImage(params: {
  base64Data: string
  mimeType?: string
}): Promise<OcrResult> {
  const config = await getActiveOcrConfig()

  if (!config.enabled) {
    return {
      success: false,
      error: 'OCR_DISABLED',
      message: 'AI receipt scanner is temporarily disabled by administrator.',
    }
  }

  const apiKey = config.apiKey
  if (!apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY_MISSING',
      message:
        'GEMINI_API_KEY is not configured. Please set your Gemini API key in the admin dashboard.',
    }
  }

  // Clean data URI prefix if present (e.g., "data:image/jpeg;base64,...")
  let cleanBase64 = params.base64Data
  let resolvedMimeType = params.mimeType || 'image/jpeg'

  const dataUriMatch = cleanBase64.match(/^data:([^;]+);base64,(.+)$/)
  if (dataUriMatch) {
    resolvedMimeType = dataUriMatch[1]
    cleanBase64 = dataUriMatch[2]
  }

  // Models to attempt: user configured model first, then ultra-fast fallback tiers (<2s)
  const models = [
    config.model,
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ].filter(Boolean) as string[]

  // Deduplicate models preserving order
  const uniqueModels = Array.from(new Set(models))

  let lastError: Error | null = null

  for (const model of uniqueModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const payload = {
        contents: [
          {
            parts: [
              { text: SYSTEM_INSTRUCTION },
              {
                inline_data: {
                  mime_type: resolvedMimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }

      // Hard timeout at 9.5 seconds per model to keep total time strictly under 10 seconds
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(9500),
      })

      if (!response.ok) {
        const errorText = await response.text()
        // If model not found (404), try the next model
        if (response.status === 404 && model !== uniqueModels[uniqueModels.length - 1]) {
          continue
        }
        throw new Error(`Gemini API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      const textOutput =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

      if (!textOutput) {
        return {
          success: false,
          modelUsed: model,
          error: 'EMPTY_RESPONSE',
          message: 'Could not extract text from the provided image.',
        }
      }

      let parsed: {
        found?: boolean
        license_number?: string | null
        confidence?: 'high' | 'medium' | 'low'
        detected_source?: string
        notes?: string
      }

      try {
        parsed = JSON.parse(textOutput)
      } catch {
        // Fallback: extract pattern via regex if JSON parse fails
        const ascii = devanagariToAsciiDigits(textOutput)
        const match = ascii.match(/\d{2}[-\s/]?\d{2}[-\s/]?\d{8}/)
        if (match) {
          const formatted = formatLicenseNumber(match[0])
          if (validateLicenseNumber(formatted)) {
            return {
              success: true,
              licenseNumber: formatted,
              confidence: 'medium',
              detectedSource: 'regex_fallback',
              modelUsed: model,
            }
          }
        }
        return {
          success: false,
          modelUsed: model,
          error: 'PARSE_ERROR',
          message: 'Unable to parse AI response.',
        }
      }

      if (!parsed.found || !parsed.license_number) {
        return {
          success: false,
          modelUsed: model,
          error: 'NOT_FOUND',
          message:
            'No valid 12-digit Nepal driving license number found in this image. Please ensure the number or receipt is clear and readable.',
          notes: parsed.notes,
        } as OcrResult
      }

      // Sanitize Devanagari numerals -> ASCII digits and format to XX-XX-XXXXXXXX
      const ascii = devanagariToAsciiDigits(parsed.license_number)
      const formatted = formatLicenseNumber(ascii)

      if (!validateLicenseNumber(formatted)) {
        return {
          success: false,
          modelUsed: model,
          error: 'INVALID_FORMAT',
          rawDetected: parsed.license_number,
          message: `Detected number "${parsed.license_number}" does not match standard 12-digit format (XX-XX-XXXXXXXX).`,
        }
      }

      return {
        success: true,
        licenseNumber: formatted,
        confidence: parsed.confidence || 'high',
        detectedSource: parsed.detected_source || 'unknown',
        rawDetected: parsed.license_number,
        modelUsed: model,
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        return {
          success: false,
          error: 'TIMEOUT',
          message: 'AI recognition timed out (10s limit). Please ensure good lighting and try again.',
        }
      }
      lastError = err instanceof Error ? err : new Error(String(err))
      // Continue to next model if available
    }
  }

  return {
    success: false,
    error: 'API_ERROR',
    message: lastError?.message || 'Failed to process image with Gemini Vision.',
  }
}
