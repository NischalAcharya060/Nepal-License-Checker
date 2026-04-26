import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { RateLimiter } from '@/lib/rateLimit'
import { sanitizeInput } from '@/utils/sanitize'
import { License } from '@/types'

const rateLimiter = new RateLimiter(15, 60000) // 15 requests per minute per IP

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'anonymous'

        if (!rateLimiter.check(ip)) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please wait a moment before trying again.', retryAfter: 60 },
                { status: 429, headers: { 'Retry-After': '60' } }
            )
        }

        // Parse & validate input
        const searchParams = request.nextUrl.searchParams
        let licenseNumber = searchParams.get('number')

        if (!licenseNumber) {
            return NextResponse.json(
                { error: 'License number is required' },
                { status: 400 }
            )
        }

        licenseNumber = sanitizeInput(licenseNumber).toUpperCase()

        const licenseRegex = /^\d{2}-\d{2}-\d{8}$/
        if (!licenseRegex.test(licenseNumber)) {
            return NextResponse.json(
                { error: 'Invalid license number format. Expected XX-XX-XXXXXXXX (e.g. 01-01-12345678)' },
                { status: 400 }
            )
        }

        // 1. Try Firestore first (fast path)
        const licensesRef = adminDb.collection('licenses')
        const snapshot = await licensesRef
            .where('license_number', '==', licenseNumber)
            .limit(1)
            .get()

        if (!snapshot.empty) {
            const doc = snapshot.docs[0]
            const licenseData = doc.data() as License

            return NextResponse.json({
                status: 'success',
                source: 'database',
                data: {
                    holder_name: licenseData.holder_name,
                    license_number: licenseData.license_number,
                    office: licenseData.office,
                    category: licenseData.category,
                    createdAt: licenseData.createdAt,
                    updatedAt: licenseData.updatedAt,
                },
            })
        }

        // 2. Not in Firestore — try live scrape from DOTM
        const liveResult = await scrapeLicenseLive(licenseNumber)

        if (liveResult) {
            // Save newly discovered license to Firestore for future lookups
            try {
                await licensesRef.doc(licenseNumber).set({
                    ...liveResult,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
            } catch {
                // Non-fatal: we still return the result even if save fails
            }

            return NextResponse.json({
                status: 'success',
                source: 'live',
                data: liveResult,
            })
        }

        // 3. Not found anywhere
        return NextResponse.json({
            status: 'success',
            data: null,
            message: 'License not found in printed records',
        })

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        )
    }
}

/**
 * Live scrape: fetch the DOTM category page, find the latest PDF links,
 * download them and search for the given license number.
 */
async function scrapeLicenseLive(licenseNumber: string): Promise<License | null> {
    try {
        const BASE_URL = 'https://dotm.gov.np'
        const CATEGORY_URL = `${BASE_URL}/category/details-of-printed-licenses/`

        const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

        // Fetch the category page
        const pageRes = await fetch(CATEGORY_URL, {
            headers: { 'User-Agent': UA, 'Accept': 'text/html' },
            signal: AbortSignal.timeout(20000),
        })

        if (!pageRes.ok) return null
        const html = await pageRes.text()

        // Find PDF URLs in the page
        const pdfMatches = html.match(/https?:\/\/[^\s"'<>]*\.pdf/gi) || []
        const seenUrls = new Set<string>()
        const pdfUrls: string[] = []
        for (const url of pdfMatches) {
            if (!seenUrls.has(url)) { seenUrls.add(url); pdfUrls.push(url) }
        }

        // Also extract /content/ page links so we can grab PDFs from sub-pages
        const contentLinks: string[] = []
        const contentMatches = html.matchAll(/href="((?:https?:\/\/dotm\.gov\.np)?\/content\/[^"]+)"/gi)
        for (const m of contentMatches) {
            const href = m[1].startsWith('http') ? m[1] : `${BASE_URL}${m[1]}`
            if (!contentLinks.includes(href)) contentLinks.push(href)
        }

        // Try to get PDFs from the first few content sub-pages too
        const subPageLimit = Math.min(contentLinks.length, 5)
        for (let i = 0; i < subPageLimit; i++) {
            try {
                const subRes = await fetch(contentLinks[i], {
                    headers: { 'User-Agent': UA },
                    signal: AbortSignal.timeout(10000),
                })
                if (!subRes.ok) continue
                const subHtml = await subRes.text()
                const subPdfs = subHtml.match(/https?:\/\/[^\s"'<>]*\.pdf/gi) || []
                for (const url of subPdfs) {
                    if (!seenUrls.has(url)) { seenUrls.add(url); pdfUrls.push(url) }
                }
            } catch { /* skip */ }
        }

        // Search each PDF for the license number
        for (const pdfUrl of pdfUrls.slice(0, 10)) {
            try {
                const found = await searchPdfForLicense(pdfUrl, licenseNumber, UA)
                if (found) return found
            } catch { /* try next */ }
        }

        return null
    } catch {
        return null
    }
}

/**
 * Download a PDF and search its text content for the license number.
 * Returns a License object if found, null otherwise.
 */
async function searchPdfForLicense(
    pdfUrl: string,
    licenseNumber: string,
    ua: string
): Promise<License | null> {
    const pdfRes = await fetch(pdfUrl, {
        headers: { 'User-Agent': ua },
        signal: AbortSignal.timeout(30000),
    })
    if (!pdfRes.ok) return null

    const buffer = await pdfRes.arrayBuffer()

    // Lightweight text extraction: look for the license number in raw PDF bytes
    const text = extractTextFromPDFBuffer(Buffer.from(buffer))

    if (!text.includes(licenseNumber)) return null

    // Parse the line containing our license number
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
        if (!line.includes(licenseNumber)) continue

        // Pattern: LICENSE_NUMBER  NAME  CATEGORY  OFFICE
        const pattern = /(\d{2}-\d{2}-\d{8})\s+(.+?)\s+([A-C](?:\/[A-C])*)\s*(.*)/
        const match = line.match(pattern)

        if (match) {
            const [, num, name, category, office] = match
            if (num === licenseNumber) {
                return {
                    license_number: num.trim(),
                    holder_name: name.trim().replace(/\s+/g, ' '),
                    category: category.trim(),
                    office: office.trim() || 'DOTM',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            }
        } else {
            // Fallback: found the number but pattern didn't match cleanly
            return {
                license_number: licenseNumber,
                holder_name: 'See DOTM records',
                category: '',
                office: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        }
    }

    return null
}

/**
 * Minimal PDF text extractor — pulls readable ASCII strings from raw PDF bytes.
 * Good enough to find license numbers and names without a heavy library.
 */
function extractTextFromPDFBuffer(buf: Buffer): string {
    const chunks: string[] = []
    let current = ''

    for (let i = 0; i < buf.length; i++) {
        const c = buf[i]
        if (c >= 0x20 && c < 0x7f) {
            // Printable ASCII
            current += String.fromCharCode(c)
        } else if (c === 0x0a || c === 0x0d) {
            if (current.length > 3) chunks.push(current)
            current = ''
        } else {
            if (current.length > 3) chunks.push(current)
            current = ''
        }
    }
    if (current.length > 3) chunks.push(current)
    return chunks.join('\n')
}
