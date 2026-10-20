import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Split text into chunks below 160 characters so Google Translate TTS handles them reliably.
 */
function chunkText(text: string, maxLength = 160): string[] {
  // Normalize whitespace
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return [clean]

  const sentences = clean.split(/([।!?\n]+)/)
  const chunks: string[] = []
  let current = ''

  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i]
    if ((current + part).length <= maxLength) {
      current += part
    } else {
      if (current.trim()) chunks.push(current.trim())
      if (part.length > maxLength) {
        // Fallback for long strings without punctuation: split by commas or words
        const words = part.split(' ')
        let sub = ''
        for (const w of words) {
          if ((sub + ' ' + w).length <= maxLength) {
            sub = sub ? sub + ' ' + w : w
          } else {
            if (sub.trim()) chunks.push(sub.trim())
            sub = w
          }
        }
        if (sub.trim()) current = sub
        else current = ''
      } else {
        current = part
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks.length > 0 ? chunks : [clean.slice(0, maxLength)]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const text = searchParams.get('text')?.trim()
    const lang = searchParams.get('lang') || 'ne'

    if (!text) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    // Limit length for protection
    const safeText = text.slice(0, 500)
    const chunks = chunkText(safeText, 160)

    const buffers: Buffer[] = []

    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
        lang
      )}&client=tw-ob&q=${encodeURIComponent(chunk)}`

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      })

      if (!res.ok) {
        throw new Error(`TTS service upstream responded with status ${res.status}`)
      }

      const arrayBuffer = await res.arrayBuffer()
      buffers.push(Buffer.from(arrayBuffer))
    }

    const fullAudio = Buffer.concat(buffers)

    return new NextResponse(fullAudio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fullAudio.length.toString(),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
      },
    })
  } catch (error) {
    console.error('Error generating Nepali TTS audio:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentic audio' },
      { status: 500 }
    )
  }
}
