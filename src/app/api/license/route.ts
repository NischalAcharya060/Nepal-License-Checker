import { NextRequest, NextResponse } from 'next/server'
import { getTurso, type LicenseRow } from '@/lib/turso'
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

        // 1. Try Turso first (fast path)
        const db = getTurso()
        const result = await db.execute({
            sql: `SELECT license_number, holder_name, office, category, created_at, updated_at
                  FROM licenses WHERE license_number = ? LIMIT 1`,
            args: [licenseNumber],
        })

        if (result.rows.length) {
            const row = result.rows[0] as unknown as LicenseRow
            return NextResponse.json({
                status: 'success',
                source: 'database',
                data: {
                    holder_name: row.holder_name,
                    license_number: row.license_number,
                    office: row.office,
                    category: row.category,
                    createdAt: new Date(Number(row.created_at)),
                    updatedAt: new Date(Number(row.updated_at)),
                },
            })
        }

        // 2. Not in DB — try live scrape from DOTM
        const liveResult = await scrapeLicenseLive(licenseNumber)

        if (liveResult) {
            // Save newly discovered license to Turso for future lookups
            try {
                const now = Date.now()
                await db.execute({
                    sql: `INSERT INTO licenses
                            (license_number, holder_name, office, category, created_at, updated_at)
                          VALUES (?, ?, ?, ?, ?, ?)
                          ON CONFLICT(license_number) DO UPDATE SET
                            holder_name = excluded.holder_name,
                            office      = CASE
                                            WHEN excluded.office IS NULL
                                              OR TRIM(excluded.office) = ''
                                              OR excluded.office IN ('Unknown', 'DOTM')
                                            THEN licenses.office
                                            ELSE excluded.office
                                          END,
                            category    = CASE
                                            WHEN excluded.category IS NULL
                                              OR TRIM(excluded.category) = ''
                                            THEN licenses.category
                                            ELSE excluded.category
                                          END,
                            updated_at  = excluded.updated_at`,
                    args: [
                        liveResult.license_number,
                        liveResult.holder_name,
                        liveResult.office,
                        liveResult.category,
                        now,
                        now,
                    ],
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

        // Also extract /content/ page links so we can grab PDFs from sub-pages.
        // Match any /content/<id>/<slug>/ path — DOTM's listing markup doesn't always
        // wrap them in href="..." cleanly.
        const contentLinks: string[] = []
        const contentMatches = html.matchAll(/\/content\/\d+\/[A-Za-z0-9_\-]+\/?/gi)
        for (const m of contentMatches) {
            const path = m[0].endsWith('/') ? m[0] : m[0] + '/'
            const href = `${BASE_URL}${path}`
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

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
        if (!line.includes(licenseNumber)) continue

        const parsed = parseLicenseLine(line)
        if (parsed && parsed.license_number === licenseNumber) {
            return {
                ...parsed,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        } else {
            // Fallback: found the number but couldn't parse fields cleanly.
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

// Shared row parsing helpers for live PDF matches.
const LICENSE_NUMBER_RE = /^\d{2}-\d{2}-\d{8}$/
const DATE_VALUE_RE = /^\d{4}-(?:[A-Za-z]{3,9}|\d{2})-\d{2}$/i
const DATE_SUFFIX_RE = /\s*\d{4}-(?:[A-Za-z]{3,9}|\d{2})-\d{2}\s*$/i
const CATEGORY_CODES = new Set([
    'A', 'B', 'C', 'C1', 'D', 'E', 'F', 'G', 'H', 'H1', 'H2',
    'I', 'I1', 'I2', 'I3', 'J1', 'J2', 'J3', 'J4', 'J5', 'K', 'K1',
])
const CATEGORY_PATTERN_SOURCE = [...CATEGORY_CODES].sort((a, b) => b.length - a.length).join('|')
const CATEGORY_LIST_PATTERN_SOURCE = `(?:${CATEGORY_PATTERN_SOURCE})(?:\\s*[,/]\\s*(?:${CATEGORY_PATTERN_SOURCE}))*`
const LEADING_CATEGORY_LIST_RE = new RegExp(`^(${CATEGORY_LIST_PATTERN_SOURCE})\\s+(.+)$`, 'i')
const LEGACY_ROW_RE = new RegExp(
    `^(?:\\d+\\s+)?(.+?)\\s+(\\d{2}-\\d{2}-\\d{8})\\s+(${CATEGORY_LIST_PATTERN_SOURCE},?)\\s+(.+?)(?:\\s+(\\d{4}-(?:[A-Za-z]{3,9}|\\d{2})-\\d{2}))?$`,
    'i'
)
const MODERN_ROW_RE = new RegExp(
    `^(\\d{2}-\\d{2}-\\d{8})\\s+(.+?)\\s+(${CATEGORY_LIST_PATTERN_SOURCE},?)$`,
    'i'
)

function isCategoryToken(raw: string): boolean {
    return CATEGORY_CODES.has((raw || '').toUpperCase())
}

function normalizeCategory(raw: string): string {
    const tokens = raw
        .toUpperCase()
        .replace(/[^A-Z0-9,/\s]/g, ' ')
        .split(/[,\s/]+/)
        .filter(Boolean)

    if (!tokens.length || !tokens.every(isCategoryToken)) return ''
    return tokens.join(',')
}

function normalizeOffice(raw: string): string {
    return raw
        .replace(DATE_SUFFIX_RE, '')
        .replace(/\s+/g, ' ')
        .replace(/^[,;]+|[,;]+$/g, '')
        .trim()
}

function normalizeFinalOffice(raw: string): string {
    const office = normalizeOffice(raw)
    return office && !DATE_VALUE_RE.test(office) && !normalizeCategory(office) ? office : 'Unknown'
}

function repairCategoryOffice(category: string, office: string) {
    const normalizedCategory = normalizeCategory(category)
    const normalizedOffice = normalizeOffice(office)
    if (!normalizedCategory || !normalizedOffice || !isCategoryToken(normalizedCategory)) {
        return { category: normalizedCategory, office: normalizedOffice }
    }

    const swapMatch = normalizedOffice.match(LEADING_CATEGORY_LIST_RE)
    if (!swapMatch) {
        return { category: normalizedCategory, office: normalizedOffice }
    }

    const leadingCategory = normalizeCategory(swapMatch[1])
    const officeRest = normalizeOffice(swapMatch[2])
    if (!leadingCategory || !officeRest) {
        return { category: normalizedCategory, office: normalizedOffice }
    }

    return {
        category: leadingCategory,
        office: normalizeOffice(`${officeRest} ${normalizedCategory}`),
    }
}

function splitNameOfficeFromTail(raw: string) {
    const cleaned = normalizeOffice(raw)
    const tokens = cleaned.split(/\s+/).filter(Boolean)
    if (tokens.length < 2) return null

    let officeStart = tokens.length - 1
    while (officeStart > 1 && normalizeCategory(tokens[officeStart - 1])) {
        officeStart -= 1
    }

    const holder_name = tokens.slice(0, officeStart).join(' ').trim().replace(/\s+/g, ' ')
    const office = normalizeOffice(tokens.slice(officeStart).join(' '))
    if (!holder_name || !office) return null

    return { holder_name, office }
}

function parseLicenseLine(rawLine: string) {
    const columns = rawLine
        .split(/\t+|\s{2,}/)
        .map(c => c.trim())
        .filter(Boolean)

    if (columns.length >= 3) {
        const licenseIndex = columns.findIndex(c => LICENSE_NUMBER_RE.test(c))
        if (licenseIndex !== -1) {
            let holder_name = ''
            let office = ''
            let category = ''

            if (licenseIndex > 0) {
                holder_name = columns
                    .slice(0, licenseIndex)
                    .filter(c => !/^\d+$/.test(c))
                    .join(' ')
                    .trim()

                const after = columns.slice(licenseIndex + 1)
                const categoryFirst = normalizeCategory(after[0] || '')
                const categoryLast = normalizeCategory(after[after.length - 1] || '')

                if (categoryFirst) {
                    category = categoryFirst
                    office = after.slice(1).join(' ')
                } else if (categoryLast) {
                    category = categoryLast
                    office = after.slice(0, -1).join(' ')
                }
            } else {
                holder_name = (columns[1] || '').trim()
                category = normalizeCategory(columns[columns.length - 1] || '')
                office = columns.slice(2, -1).join(' ')
            }

            if (holder_name && category) {
                const repaired = repairCategoryOffice(category, office)
                if (repaired.category) {
                    return {
                        license_number: columns[licenseIndex],
                        holder_name: holder_name.replace(/\s+/g, ' '),
                        category: repaired.category,
                        office: normalizeFinalOffice(repaired.office),
                    }
                }
            }
        }
    }

    const legacyMatch = rawLine.match(LEGACY_ROW_RE)
    if (legacyMatch) {
        const [, nameRaw, license_number, categoryRaw, officeRaw] = legacyMatch
        const repaired = repairCategoryOffice(categoryRaw, officeRaw)
        if (!repaired.category) return null

        return {
            license_number,
            holder_name: nameRaw.trim().replace(/\s+/g, ' '),
            category: repaired.category,
            office: normalizeFinalOffice(repaired.office),
        }
    }

    const modernMatch = rawLine.match(MODERN_ROW_RE)
    if (!modernMatch) return null

    const [, license_number, nameOfficeRaw, categoryRaw] = modernMatch
    const nameOffice = splitNameOfficeFromTail(nameOfficeRaw)
    if (!nameOffice) return null

    const repaired = repairCategoryOffice(categoryRaw, nameOffice.office)
    if (!repaired.category) return null

    return {
        license_number,
        holder_name: nameOffice.holder_name,
        category: repaired.category,
        office: normalizeFinalOffice(repaired.office),
    }
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
