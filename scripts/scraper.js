// scripts/scraper.js
require('dotenv').config();

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { createClient } = require('@libsql/client');
const { DEFAULT_CRON_SCHEDULE, getNextCronRun } = require('./cronHelper');
const { ensureNotificationsTable, processPendingNotifications } = require('./notifications');

// ── Turso (libSQL) init ──────────────────────────────────────────────────────
let dbClient = null;
function getDb() {
    if (dbClient) return dbClient;
    if (!process.env.TURSO_DATABASE_URL) {
        throw new Error('TURSO_DATABASE_URL is not set — add it to .env');
    }
    dbClient = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return dbClient;
}

async function ensureSchema() {
    const db = getDb();
    await db.execute(`
        CREATE TABLE IF NOT EXISTS licenses (
            license_number TEXT PRIMARY KEY,
            holder_name    TEXT NOT NULL,
            office         TEXT NOT NULL,
            category       TEXT NOT NULL,
            created_at     INTEGER NOT NULL,
            updated_at     INTEGER NOT NULL
        )
    `);
    await db.execute(`DELETE FROM licenses WHERE license_number IS NULL OR TRIM(license_number) = ''`);

    try {
        await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS licenses_license_number_uq ON licenses(license_number)`);
    } catch (err) {
        // Legacy tables can contain duplicates before unique index exists.
        if (!/UNIQUE constraint failed/i.test(String(err.message || err))) throw err;
        await db.execute(`
            DELETE FROM licenses
            WHERE rowid NOT IN (
                SELECT MAX(rowid)
                FROM licenses
                WHERE license_number IS NOT NULL AND TRIM(license_number) != ''
                GROUP BY license_number
            )
        `);
        await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS licenses_license_number_uq ON licenses(license_number)`);
    }

    // Optional secondary indexes for "search by name" / "list by office"
    await db.execute(`CREATE INDEX IF NOT EXISTS licenses_office_idx ON licenses(office)`);

    // Track processed PDFs so future workflow runs can skip already extracted files
    await db.execute(`
        CREATE TABLE IF NOT EXISTS processed_pdfs (
            url             TEXT PRIMARY KEY,
            extracted_count INTEGER NOT NULL DEFAULT 0,
            processed_at    INTEGER NOT NULL
        )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS processed_pdfs_processed_at_idx ON processed_pdfs(processed_at)`);

    // Track discovered office content pages to enable rapid early-exit on subsequent runs
    await db.execute(`
        CREATE TABLE IF NOT EXISTS processed_content_pages (
            url           TEXT PRIMARY KEY,
            pdf_urls      TEXT NOT NULL DEFAULT '[]',
            discovered_at INTEGER NOT NULL
        )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS processed_content_pages_discovered_at_idx ON processed_content_pages(discovered_at)`);

    // Ensure email notifications schema
    await ensureNotificationsTable(db);
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchUrl(url, binary = false, retries = 4) {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            const parsed = new URL(url);
            const lib = parsed.protocol === 'https:' ? https : http;
            const opts = {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'GET',
                timeout: binary ? 60000 : 25000,
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': binary ? 'application/pdf,*/*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://dotm.gov.np/category/details-of-printed-licenses/',
                    'Connection': 'keep-alive',
                },
            };

            const req = lib.request(opts, (res) => {
                // Follow redirects
                if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                    const location = res.headers.location;
                    if (location) {
                        const next = location.startsWith('http') ? location : new URL(location, url).href;
                        return attempt.call({ _url: next }, n);
                    }
                }
                if (res.statusCode < 200 || res.statusCode >= 400) {
                    res.resume();
                    if ((res.statusCode === 403 || res.statusCode >= 500) && n < retries) {
                        const wait = (res.statusCode === 403 ? 3000 : 2000) * n;
                        console.warn(`  HTTP ${res.statusCode} for ${url} — retry ${n}/${retries} in ${wait}ms`);
                        return setTimeout(() => attempt(n + 1), wait);
                    }
                    return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                }

                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    const buf = Buffer.concat(chunks);
                    resolve(binary ? buf : buf.toString('utf8'));
                });
                res.on('error', reject);
            });

            req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
            req.on('error', (err) => {
                if (n < retries) {
                    console.warn(`  Retry ${n}/${retries} for ${url}`);
                    setTimeout(() => attempt(n + 1), 1500 * n);
                } else {
                    reject(err);
                }
            });
            req.end();
        };
        attempt(1);
    });
}

// ── PDF text extractor (no external deps) ───────────────────────────────────
function extractTextFromPDF(buf) {
    const chunks = [];
    let cur = '';
    for (let i = 0; i < buf.length; i++) {
        const c = buf[i];
        if (c >= 0x20 && c < 0x7f) {
            cur += String.fromCharCode(c);
        } else if (c === 0x0a || c === 0x0d) {
            if (cur.length > 2) chunks.push(cur);
            cur = '';
        } else {
            if (cur.length > 2) chunks.push(cur);
            cur = '';
        }
    }
    if (cur.length > 2) chunks.push(cur);
    return chunks.join('\n');
}

// Try pdf-parse if available, fall back to raw extraction
async function parsePDF(buf) {
    try {
        const mod = require('pdf-parse');
        // pdf-parse v2: class-based API, returns { numpages: [{ text, num }, ...] }
        if (mod && typeof mod.PDFParse === 'function') {
            const parser = new mod.PDFParse({ data: buf });
            const result = await parser.getText();
            if (typeof result.text === 'string') return result.text;
            if (Array.isArray(result.pages)) {
                return result.pages.map(p => p.text || '').join('\n');
            }
            if (Array.isArray(result.numpages)) {
                return result.numpages.map(p => p.text || '').join('\n');
            }
        }
        // pdf-parse v1: function API
        if (typeof mod === 'function') {
            const data = await mod(buf);
            return data.text;
        }
        throw new Error('Unrecognized pdf-parse export shape');
    } catch (err) {
        console.warn(`    pdf-parse failed (${err.message}); using raw byte fallback`);
        return extractTextFromPDF(buf);
    }
}

// ── License parser ───────────────────────────────────────────────────────────
const LICENSE_NUMBER_RE = /^\d{2}-\d{2}-\d{8}$/;
const LICENSE_IN_TEXT_RE = /\b\d{2}-\d{2}-\d{8}\b/;
const DATE_VALUE_RE = /^\d{4}-(?:[A-Za-z]{3,9}|\d{2})-\d{2}$/i;
const DATE_SUFFIX_RE = /\s*\d{4}-(?:[A-Za-z]{3,9}|\d{2})-\d{2}\s*$/i;
const CATEGORY_CODES = new Set([
    'A', 'B', 'C', 'C1', 'D', 'E', 'F', 'G', 'H', 'H1', 'H2',
    'I', 'I1', 'I2', 'I3', 'J1', 'J2', 'J3', 'J4', 'J5', 'K', 'K1',
]);
const CATEGORY_PATTERN_SOURCE = [...CATEGORY_CODES].sort((a, b) => b.length - a.length).join('|');
const CATEGORY_LIST_PATTERN_SOURCE = `(?:${CATEGORY_PATTERN_SOURCE})(?:\\s*[,/]\\s*(?:${CATEGORY_PATTERN_SOURCE}))*`;
const LEADING_CATEGORY_LIST_RE = new RegExp(`^(${CATEGORY_LIST_PATTERN_SOURCE})\\s+(.+)$`, 'i');
const LEGACY_ROW_RE = new RegExp(
    `^(?:\\d+\\s+)?(.+?)\\s+(\\d{2}-\\d{2}-\\d{8})\\s+(${CATEGORY_LIST_PATTERN_SOURCE},?)\\s+(.+?)(?:\\s+(\\d{4}-(?:[A-Za-z]{3,9}|\\d{2})-\\d{2}))?$`,
    'i'
);
const MODERN_ROW_RE = new RegExp(
    `^(\\d{2}-\\d{2}-\\d{8})\\s+(.+?)\\s+(${CATEGORY_LIST_PATTERN_SOURCE},?)$`,
    'i'
);

function isCategoryToken(raw) {
    return CATEGORY_CODES.has((raw || '').toUpperCase());
}

function normalizeCategory(raw) {
    if (!raw) return '';
    const tokens = raw
        .toUpperCase()
        .replace(/[^A-Z0-9,/\s]/g, ' ')
        .split(/[,\s/]+/)
        .filter(Boolean);

    if (!tokens.length || !tokens.every(isCategoryToken)) return '';
    return tokens.join(',');
}

function normalizeName(raw) {
    return (raw || '').trim().replace(/\s+/g, ' ');
}

function normalizeOffice(raw) {
    return (raw || '')
        .replace(DATE_SUFFIX_RE, '')
        .replace(/\s+/g, ' ')
        .replace(/^[,;]+|[,;]+$/g, '')
        .trim();
}

function normalizeFinalOffice(raw) {
    const office = normalizeOffice(raw);
    return office && !DATE_VALUE_RE.test(office) && !normalizeCategory(office) ? office : 'Unknown';
}

// Some PDFs emit "... <category-list> <office> <single-category>".
// When we detect that shape, rotate values back to the expected columns.
function repairCategoryOffice(category, office) {
    const normalizedCategory = normalizeCategory(category);
    const normalizedOffice = normalizeOffice(office);
    if (!normalizedCategory || !normalizedOffice) {
        return { category: normalizedCategory, office: normalizedOffice };
    }

    if (!isCategoryToken(normalizedCategory)) {
        return { category: normalizedCategory, office: normalizedOffice };
    }

    const swapMatch = normalizedOffice.match(LEADING_CATEGORY_LIST_RE);
    if (!swapMatch) {
        return { category: normalizedCategory, office: normalizedOffice };
    }

    const leadingCategory = normalizeCategory(swapMatch[1]);
    const officeRest = normalizeOffice(swapMatch[2]);
    if (!leadingCategory || !officeRest) {
        return { category: normalizedCategory, office: normalizedOffice };
    }

    return {
        category: leadingCategory,
        office: normalizeOffice(`${officeRest} ${normalizedCategory}`),
    };
}

function parseLineByColumns(rawLine) {
    const columns = rawLine
        .split(/\t+|\s{2,}/)
        .map(c => c.trim())
        .filter(Boolean);

    if (columns.length < 3) return null;

    const licenseIndex = columns.findIndex(c => LICENSE_NUMBER_RE.test(c));
    if (licenseIndex === -1) return null;

    const license_number = columns[licenseIndex];
    let holder_name = '';
    let office = '';
    let category = '';

    if (licenseIndex > 0) {
        // Layout: [SN] [NAME] [LICENSE] [CATEGORY] [OFFICE] [DATE?]
        holder_name = normalizeName(
            columns
                .slice(0, licenseIndex)
                .filter(c => !/^\d+$/.test(c))
                .join(' ')
        );

        const after = columns.slice(licenseIndex + 1);
        const categoryFirst = normalizeCategory(after[0] || '');
        const categoryLast = normalizeCategory(after[after.length - 1] || '');

        if (categoryFirst) {
            category = categoryFirst;
            office = after.slice(1).join(' ');
        } else if (categoryLast) {
            category = categoryLast;
            office = after.slice(0, -1).join(' ');
        } else {
            return null;
        }
    } else {
        // Layout: [LICENSE] [NAME] [OFFICE] [DATE?] [CATEGORY]
        holder_name = normalizeName(columns[1] || '');
        category = normalizeCategory(columns[columns.length - 1] || '');
        if (!category) return null;
        office = columns.slice(2, -1).join(' ');
    }

    if (!holder_name || /license\s+holder\s+name/i.test(holder_name)) return null;

    const repaired = repairCategoryOffice(category, office);
    const finalOffice = normalizeFinalOffice(repaired.office);
    const finalCategory = repaired.category;
    if (!finalCategory) return null;

    return {
        license_number,
        holder_name,
        category: finalCategory,
        office: finalOffice,
    };
}

function splitNameOfficeFromTail(raw) {
    const cleaned = normalizeOffice(raw);
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return null;

    let officeStart = tokens.length - 1;
    while (officeStart > 1 && normalizeCategory(tokens[officeStart - 1])) {
        officeStart -= 1;
    }

    const holder_name = normalizeName(tokens.slice(0, officeStart).join(' '));
    const office = normalizeOffice(tokens.slice(officeStart).join(' '));
    if (!holder_name || !office) return null;

    return { holder_name, office };
}

function parseLineByRegex(rawLine) {
    // Legacy text layout:
    //   "<sn> <NAME...> <XX-XX-XXXXXXXX> <CATEGORY> <OFFICE> <DATE?>"
    const match = rawLine.trim().match(LEGACY_ROW_RE);
    if (match) {
        const [, nameRaw, license_number, categoryRaw, officeRaw] = match;
        const holder_name = normalizeName(nameRaw);
        if (!holder_name || /license\s+holder\s+name/i.test(holder_name)) return null;

        const repaired = repairCategoryOffice(categoryRaw, officeRaw);
        if (!repaired.category) return null;

        return {
            license_number,
            holder_name,
            category: repaired.category,
            office: normalizeFinalOffice(repaired.office),
        };
    }

    // Modern layout sometimes appears as:
    //   "<LICENSE> <NAME...> <OFFICE> <DATE?> <CATEGORY>"
    // (all single-spaced after raw-byte extraction).
    const modernMatch = rawLine.trim().match(MODERN_ROW_RE);
    if (!modernMatch) return null;

    const [, modernLicense, nameOfficeRaw, modernCategoryRaw] = modernMatch;
    const nameOffice = splitNameOfficeFromTail(nameOfficeRaw);
    if (!nameOffice || /license\s+holder\s+name/i.test(nameOffice.holder_name)) return null;

    const modernRepaired = repairCategoryOffice(modernCategoryRaw, nameOffice.office);
    if (!modernRepaired.category) return null;

    return {
        license_number: modernLicense,
        holder_name: nameOffice.holder_name,
        category: modernRepaired.category,
        office: normalizeFinalOffice(modernRepaired.office),
    };
}

function parseLicenses(text) {
    const results = [];
    const seen = new Set();
    const officeCounts = new Map();
    const lines = text.split('\n').map(l => l.replace(/\r/g, '')).filter(l => l.trim());

    for (const rawLine of lines) {
        if (!LICENSE_IN_TEXT_RE.test(rawLine)) continue;

        const parsed = parseLineByColumns(rawLine) || parseLineByRegex(rawLine);
        if (!parsed) continue;
        if (seen.has(parsed.license_number)) continue;
        if (!LICENSE_NUMBER_RE.test(parsed.license_number)) continue;

        seen.add(parsed.license_number);
        if (parsed.office && parsed.office !== 'Unknown') {
            officeCounts.set(parsed.office, (officeCounts.get(parsed.office) || 0) + 1);
        }
        results.push({
            ...parsed,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    if (officeCounts.size) {
        const fallbackOffice = [...officeCounts.entries()]
            .sort((a, b) => b[1] - a[1])[0][0];
        for (const row of results) {
            if (row.office === 'Unknown') row.office = fallbackOffice;
        }
    }

    return results;
}

// ── Non-license document detection ──────────────────────────────────────────
const NON_LICENSE_KEYWORDS = [
    'tender',
    'sealed_quotation',
    'sealed-quotation',
    'quotation',
    'furniture',
    'firewall',
    'route-nirdharan',
    'route%20nirdharan',
    'route_nirdharan',
    'route nirdharan',
    'fare-rate',
    'fare_rate',
    'fares',
    'bhada',
    'bhadadar',
    'carrying-capacity',
    'weight-carrying',
    'reserved-seats',
    'purchase-agreement',
    'digital-sop',
    'digital_sop',
    'digital sop',
    'annual-progress',
    'annual_progress',
    'satarkata',
    'magazine',
    'journal',
    'bolpatra',
    'prastab',
    'intranet',
    'internet-and-intranet',
    'construction-of-repair',
    'construction_of_repair',
];

function isNonLicenseDocument(url) {
    if (!url) return false;
    let decoded = '';
    try {
        decoded = decodeURIComponent(url).toLowerCase();
    } catch {
        decoded = (url || '').toLowerCase();
    }

    // Always preserve if explicitly marked as driver license (unless IT firewall)
    const isLicenseNamed = /driving[-_ ]?licen[sc]e|smart[-_ ]?card|regular[-_ ]?print|urgent[-_ ]?driving|printed[-_ ]?license|license[-_ ]?print|चालक[-_ ]?अनुमतिपत्र|लाइसेन्स/i.test(decoded);
    if (isLicenseNamed && !decoded.includes('firewall')) {
        return false;
    }

    // Check non-license indicators
    for (const kw of NON_LICENSE_KEYWORDS) {
        if (decoded.includes(kw)) return true;
    }

    // Nepali non-license keywords (fares, tenders, proposals, progress reports, seat reservations, weight capacity)
    if (/भाडादर|भाडा|बोलपत्र|प्रस्ताव|वार्षिक प्रगति|सतर्कता|सर्तकता|भारवहन|आरक्षित सीट/i.test(decoded)) {
        return true;
    }

    return false;
}

function parseCliArgs() {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--force') {
            options.force = true;
        } else if (arg.startsWith('--office=')) {
            options.office = arg.split('=')[1].trim();
        } else if (arg === '--office' && i + 1 < args.length) {
            options.office = args[++i].trim();
        } else if (arg.startsWith('--url=')) {
            options.url = arg.split('=')[1].trim();
        } else if (arg === '--url' && i + 1 < args.length) {
            options.url = args[++i].trim();
        }
    }
    return options;
}

// ── Scraper class ─────────────────────────────────────────────────────────────
class DOTMScraper {
    constructor() {
        this.BASE = 'https://dotm.gov.np';
        this.CATEGORY = `${this.BASE}/category/details-of-printed-licenses/`;
        this.stats = { scraped: 0, saved: 0, updated: 0, failed: 0, skipped: 0, circuitBreakerTripped: false, officeBreakdown: {} };
    }

    async getPageHTML(url) {
        try {
            return await fetchUrl(url);
        } catch (err) {
            console.error(`  Failed to fetch page ${url}: ${err.message}`);
            return '';
        }
    }

    extractPDFUrls(html, baseUrl) {
        const urls = new Set();
        // Direct PDF links
        for (const m of (html.matchAll(/https?:\/\/[^\s"'<>]*\.pdf/gi) || [])) {
            urls.add(m[0]);
        }
        // Relative PDF links
        for (const m of (html.matchAll(/href="([^"]*\.pdf)"/gi) || [])) {
            const href = m[1];
            try {
                urls.add(new URL(href, baseUrl).href);
            } catch { /* skip invalid */ }
        }
        return [...urls];
    }

    extractContentLinks(html) {
        const links = new Set();

        // 1. Cheerio extraction for clean DOM card links
        try {
            const cheerio = require('cheerio');
            const $ = cheerio.load(html);
            $('.grid__card').each((_, el) => {
                let href = $(el).find('.card__title a').attr('href') || $(el).find('a').attr('href');
                if (href) {
                    href = href.trim();
                    const full = href.startsWith('http') ? href : new URL(href, this.BASE).href;
                    links.add(full.endsWith('/') ? full : full + '/');
                }
            });
        } catch {
            // fallback to regex if cheerio unavailable
        }

        // 2. Comprehensive pattern matching /content/<id>/<slug>/
        const pattern = /\/content\/\d+\/[A-Za-z0-9_\-]+\/?/gi;
        for (const m of (html.matchAll(pattern) || [])) {
            const path = m[0].endsWith('/') ? m[0] : m[0] + '/';
            links.add(`${this.BASE}${path}`);
        }
        return [...links];
    }

    async getProcessedContentPages() {
        const db = getDb();
        try {
            const res = await db.execute('SELECT url, pdf_urls FROM processed_content_pages');
            const map = new Map();
            for (const row of res.rows) {
                let pdfs = [];
                try {
                    pdfs = JSON.parse(row.pdf_urls || '[]');
                } catch {
                    pdfs = [];
                }
                map.set(row.url, Array.isArray(pdfs) ? pdfs : []);
            }
            return map;
        } catch {
            return new Map();
        }
    }

    async markContentPageProcessed(contentUrl, pdfUrls = []) {
        const db = getDb();
        try {
            await db.execute({
                sql: `INSERT INTO processed_content_pages (url, pdf_urls, discovered_at)
                      VALUES (?, ?, ?)
                      ON CONFLICT(url) DO UPDATE SET
                        pdf_urls      = excluded.pdf_urls,
                        discovered_at = excluded.discovered_at`,
                args: [contentUrl, JSON.stringify(pdfUrls || []), Date.now()],
            });
        } catch (err) {
            console.warn(`  Failed to record processed content page ${contentUrl}: ${err.message}`);
        }
    }

    async getOfficePDFs(options = {}) {
        const force = Boolean(options.force);
        const targetOffice = (options.office || '').toLowerCase().trim();
        const targetUrl = (options.url || '').trim();

        // 1. Direct targeted URL mode (--url https://...)
        if (targetUrl) {
            console.log(`🎯 Targeted URL mode: ${targetUrl}`);
            if (/\.pdf$/i.test(targetUrl.split('?')[0])) {
                return [targetUrl];
            }
            // If targeted URL is an office content page, resolve its PDF(s)
            const html = await this.getPageHTML(targetUrl);
            const pdfs = this.extractPDFUrls(html, targetUrl);
            console.log(`  Found ${pdfs.length} PDF(s) in targeted URL: ${targetUrl}`);
            return pdfs;
        }

        console.log('Fetching DOTM category pages (walking pagination)...');

        let pdfUrls = [];
        const contentLinks = new Set();
        const processedContentPages = (force || targetOffice) ? new Map() : await this.getProcessedContentPages();
        if (processedContentPages.size > 0) {
            console.log(`📑 Found ${processedContentPages.size} previously indexed office pages in cache.`);
        }

        // Walk paginated category pages until page returns 404 or empty response
        const MAX_PAGES = 30;
        let consecutiveEmptyPages = 0;

        for (let page = 1; page <= MAX_PAGES; page++) {
            const url = page === 1 ? this.CATEGORY : `${this.CATEGORY}?page=${page}`;
            const html = await this.getPageHTML(url);

            if (!html || html.length < 500) {
                consecutiveEmptyPages++;
                if (consecutiveEmptyPages >= 1) {
                    console.log(`  page ${page}: reached end of pagination (status 404 or empty response).`);
                    break;
                }
                continue;
            }

            consecutiveEmptyPages = 0;

            const pagePdfs = this.extractPDFUrls(html, url);
            pdfUrls = pdfUrls.concat(pagePdfs);

            const pageContentLinks = this.extractContentLinks(html);
            const before = contentLinks.size;
            let newLinksOnPage = 0;

            for (const link of pageContentLinks) {
                if (targetOffice && !link.toLowerCase().includes(targetOffice)) {
                    continue;
                }
                contentLinks.add(link);
                if (!processedContentPages.has(link)) {
                    newLinksOnPage++;
                }
            }

            const added = contentLinks.size - before;
            console.log(`  page ${page}: +${added} sub-pages (${pagePdfs.length} direct PDFs, ${newLinksOnPage} new to cache)`);

            // Early-exit check:
            // If running normal incremental scrape and all content links on this pagination page
            // are already known in processedContentPages, older pagination pages only contain even older posts.
            if (!force && !targetOffice && pageContentLinks.length > 0 && newLinksOnPage === 0) {
                console.log(`  💡 Page ${page} contains only previously cached office posts. Stopping pagination early.`);
                break;
            }

            await sleep(400);
        }

        console.log(`Found ${contentLinks.size} candidate office page(s), ${pdfUrls.length} direct PDFs from listings`);

        // Separate cached vs uncached office sub-pages
        const pagesToFetch = [];
        for (const link of contentLinks) {
            if (!force && !targetOffice && processedContentPages.has(link)) {
                const cached = processedContentPages.get(link) || [];
                pdfUrls = pdfUrls.concat(cached);
            } else {
                pagesToFetch.push(link);
            }
        }

        const cachedPagesCount = contentLinks.size - pagesToFetch.length;
        if (cachedPagesCount > 0) {
            console.log(`⚡ Skipped fetching HTML for ${cachedPagesCount} already-cached office sub-page(s).`);
        }

        // Fetch new / uncached sub-pages using controlled concurrency pool
        if (pagesToFetch.length > 0) {
            console.log(`Visiting ${pagesToFetch.length} new/un-cached office sub-page(s) (concurrency: 2)...`);
            const CONCURRENCY = 2;
            let activeIdx = 0;
            const workers = Array.from({ length: Math.min(CONCURRENCY, pagesToFetch.length) }, async () => {
                while (activeIdx < pagesToFetch.length) {
                    const link = pagesToFetch[activeIdx++];
                    try {
                        if (isNonLicenseDocument(link)) {
                            console.log(`  ⏭️  Skipping non-license office page (tender/circular slug): ${link}`);
                            await this.markContentPageProcessed(link, []);
                            continue;
                        }

                        const subHtml = await this.getPageHTML(link);
                        if (!subHtml) continue;
                        const subPDFs = this.extractPDFUrls(subHtml, link);
                        if (subPDFs.length) console.log(`  ${link} → ${subPDFs.length} pdf(s)`);
                        pdfUrls = pdfUrls.concat(subPDFs);
                        await this.markContentPageProcessed(link, subPDFs);
                        await sleep(650);
                    } catch (err) {
                        console.warn(`  Sub-page error for ${link}: ${err.message}`);
                    }
                }
            });
            await Promise.all(workers);
        }

        // Deduplicate
        let unique = [...new Set(pdfUrls)];
        if (targetOffice) {
            unique = unique.filter(u => u.toLowerCase().includes(targetOffice));
            console.log(`🎯 Target office filter [${targetOffice}]: ${unique.length} matching PDF(s)`);
        }
        console.log(`Total unique PDFs to process: ${unique.length}`);
        return unique;
    }

    async getProcessedPDFs() {
        const db = getDb();
        try {
            const res = await db.execute('SELECT url, extracted_count, processed_at FROM processed_pdfs');
            const map = new Map();
            for (const row of res.rows) {
                map.set(row.url, {
                    extracted_count: Number(row.extracted_count || 0),
                    processed_at: Number(row.processed_at || 0),
                });
            }
            return map;
        } catch (err) {
            console.warn(`  Could not read processed_pdfs table (${err.message}). Will process without cache.`);
            return new Map();
        }
    }

    async markPDFProcessed(pdfUrl, extractedCount) {
        const db = getDb();
        try {
            await db.execute({
                sql: `INSERT INTO processed_pdfs (url, extracted_count, processed_at)
                      VALUES (?, ?, ?)
                      ON CONFLICT(url) DO UPDATE SET
                        extracted_count = excluded.extracted_count,
                        processed_at    = excluded.processed_at`,
                args: [pdfUrl, extractedCount, Date.now()],
            });
        } catch (err) {
            console.warn(`  Failed to record processed PDF ${pdfUrl}: ${err.message}`);
        }
    }

    async processPDF(pdfUrl) {
        console.log(`  PDF: ${pdfUrl}`);
        try {
            const buf = await fetchUrl(pdfUrl, true);
            const text = await parsePDF(buf);
            const licenses = parseLicenses(text);
            console.log(`    → ${licenses.length} licenses extracted`);
            return { success: true, licenses };
        } catch (err) {
            console.error(`    → Failed: ${err.message}`);
            return { success: false, error: err.message, licenses: [] };
        }
    }

    async saveBatch(licenses) {
        const db = getDb();
        // libSQL batches: chunk to keep request payload manageable
        const BATCH_SIZE = 200;
        for (let i = 0; i < licenses.length; i += BATCH_SIZE) {
            const chunk = licenses.slice(i, i + BATCH_SIZE);
            const stmts = chunk.map(lic => ({
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
                    lic.license_number,
                    lic.holder_name,
                    lic.office,
                    lic.category,
                    lic.createdAt instanceof Date ? lic.createdAt.getTime() : Date.now(),
                    lic.updatedAt instanceof Date ? lic.updatedAt.getTime() : Date.now(),
                ],
            }));

            let batchSaved = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await db.batch(stmts, 'write');
                    this.stats.saved += chunk.length;
                    batchSaved = true;
                    if ((i / BATCH_SIZE) % 25 === 0) {
                        console.log(`    saved ${this.stats.saved} so far...`);
                    }
                    break;
                } catch (err) {
                    if (attempt < 3) {
                        console.warn(`    Batch write attempt ${attempt}/3 failed (${err.message}). Retrying in ${attempt * 1500}ms...`);
                        await sleep(attempt * 1500);
                    } else {
                        console.error(`Batch write failed (${chunk.length} rows after 3 attempts): ${err.message}`);
                        this.stats.failed += chunk.length;
                    }
                }
            }
        }
    }

    async scrapeAll(options = {}) {
        const cliOpts = parseCliArgs();
        const force = Boolean(
            options.force ||
            cliOpts.force ||
            process.argv.includes('--force') ||
            process.env.FORCE_SCRAPE === '1' ||
            process.env.FORCE_SCRAPE === 'true'
        );
        const targetOffice = (options.office || cliOpts.office || process.env.TARGET_OFFICE || '').toLowerCase().trim();
        const targetUrl = (options.url || cliOpts.url || process.env.TARGET_URL || '').trim();
        const isTargeted = Boolean(targetOffice || targetUrl);

        console.log('\n═══ DOTM License Scraper ═══\n');
        if (targetUrl) {
            console.log(`🎯 Targeted URL mode: processing only ${targetUrl}\n`);
        } else if (targetOffice) {
            console.log(`🎯 Targeted office mode: processing only office [${targetOffice}]\n`);
        } else if (force) {
            console.log('⚡ Force mode enabled: will re-extract all PDFs regardless of previous history.\n');
        } else {
            console.log('💡 Incremental mode: previously extracted PDFs will be skipped automatically.\n');
        }

        const startTime = Date.now();
        await ensureSchema();

        const pdfUrls = await this.getOfficePDFs({ force, office: targetOffice, url: targetUrl });
        if (!pdfUrls.length) {
            console.log('No PDFs found. Exiting.');
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            await this.recordRunStats({
                status: 'empty',
                elapsed,
                newPdfsCount: 0,
                skippedPdfsCount: 0,
                totalPdfsCount: 0,
            });
            return false;
        }

        const processedMap = (force || isTargeted) ? new Map() : await this.getProcessedPDFs();
        if (!force && !isTargeted && processedMap.size > 0) {
            console.log(`📋 Found ${processedMap.size} previously extracted PDFs in database history.`);
        }

        let newPdfsCount = 0;
        let skippedPdfsCount = 0;
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = Math.max(1, Number(
            options.maxConsecutiveFailures ||
            process.env.SCRAPER_CIRCUIT_BREAKER ||
            5
        ));

        for (let i = 0; i < pdfUrls.length; i++) {
            const pdfUrl = pdfUrls[i];
            console.log(`\n[${i + 1}/${pdfUrls.length}] ${pdfUrl}`);

            // Pre-filtering non-license documents before downloading
            if (isNonLicenseDocument(pdfUrl)) {
                console.log(`  ℹ️  Skipping: identified as non-license document (tender/fare notice/circular)`);
                await this.markPDFProcessed(pdfUrl, 0);
                this.stats.skipped++;
                skippedPdfsCount++;
                continue;
            }

            // Skip if already extracted in a previous workflow run (targeted runs force re-processing)
            if (!force && !isTargeted && processedMap.has(pdfUrl)) {
                const prev = processedMap.get(pdfUrl);
                const dateStr = prev.processed_at ? new Date(prev.processed_at).toISOString().split('T')[0] : 'previously';
                console.log(`  ⏭️  Skipping: already extracted on ${dateStr} (${prev.extracted_count} licenses previously indexed)`);
                this.stats.skipped++;
                skippedPdfsCount++;
                continue;
            }

            newPdfsCount++;
            const result = await this.processPDF(pdfUrl);
            if (!result.success) {
                this.stats.failed++;
                consecutiveFailures++;

                if (consecutiveFailures >= maxConsecutiveFailures) {
                    this.stats.circuitBreakerTripped = true;
                    console.warn(`\n🛑 [CIRCUIT BREAKER] Tripped after ${consecutiveFailures} consecutive PDF download failures.`);
                    console.warn(`   Last error encountered: ${result.error || 'Unknown network error'}`);
                    console.warn(`   The DOTM CDN (giwmscdnone.gov.np) is currently offline or actively dropping connections.`);
                    console.warn(`   Aborting remaining ${pdfUrls.length - (i + 1)} PDF(s) to avoid hanging and save CI runner minutes.\n`);
                    break;
                }
                continue;
            }

            consecutiveFailures = 0;
            this.stats.scraped += result.licenses.length;

            if (result.licenses.length > 0) {
                for (const lic of result.licenses) {
                    const off = (lic.office || 'Other').trim();
                    this.stats.officeBreakdown[off] = (this.stats.officeBreakdown[off] || 0) + 1;
                }
                await this.saveBatch(result.licenses);
            }

            // Mark this PDF as processed so future workflows skip it
            await this.markPDFProcessed(pdfUrl, result.licenses.length);

            await sleep(1000);
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n═══ Done in ${elapsed}s ═══`);
        console.log(`PDFs: ${pdfUrls.length} total | ${newPdfsCount} attempted | ${skippedPdfsCount} skipped (already in DB)`);
        console.log(`Licenses: ${this.stats.scraped} scraped | ${this.stats.saved} saved | ${this.stats.failed} failed`);
        if (this.stats.circuitBreakerTripped) {
            console.log(`Status: ⚠️ Aborted early by circuit breaker due to government CDN outage.`);
        }

        try {
            const countRes = await getDb().execute('SELECT COUNT(*) AS total FROM licenses');
            const total = Number(countRes.rows[0]?.total || 0);
            await getDb().execute({
                sql: `INSERT INTO site_stats (key, value, updated_at)
                      VALUES ('total_records', ?, ?)
                      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                args: [total, Date.now()],
            });
            console.log(`Updated site_stats total_records: ${total}`);

            // Also cache office totals so the public API and UI load instantly
            const officeRes = await getDb().execute(
                'SELECT office, COUNT(*) AS count FROM licenses GROUP BY office ORDER BY count DESC'
            );
            const officeTotals = {};
            for (const r of officeRes.rows) {
                if (r.office) officeTotals[String(r.office)] = Number(r.count || 0);
            }
            await getDb().execute({
                sql: `INSERT INTO site_stats (key, value, updated_at)
                      VALUES ('office_totals', ?, ?)
                      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                args: [JSON.stringify(officeTotals), Date.now()],
            });
        } catch (e) {
            console.warn(`Could not update total_records stat: ${e.message}`);
        }

        const runStatus = this.stats.circuitBreakerTripped
            ? 'circuit_breaker'
            : (this.stats.failed > 0 ? 'partial' : 'success');

        await this.recordRunStats({
            status: runStatus,
            elapsed,
            newPdfsCount,
            skippedPdfsCount,
            totalPdfsCount: pdfUrls.length,
        });

        // Check and send pending email notifications for newly printed records
        if (!this.stats.circuitBreakerTripped) {
            try {
                console.log('Checking for pending user email notifications...');
                const db = getDb();
                const notifStats = await processPendingNotifications(db);
                if (notifStats.sentCount > 0) {
                    console.log(`✉️ Processed pending notifications: sent ${notifStats.sentCount} emails.`);
                }
            } catch (notifErr) {
                console.warn(`Could not process pending notifications: ${notifErr.message}`);
            }
        }

        return !this.stats.circuitBreakerTripped;
    }

    async recordRunStats({ status, elapsed, newPdfsCount = 0, skippedPdfsCount = 0, totalPdfsCount = 0 }) {
        try {
            const db = getDb();
            const now = Date.now();
            const rawEvent = process.env.GITHUB_EVENT_NAME;
            const trigger = rawEvent === 'schedule'
                ? 'scheduled'
                : rawEvent === 'workflow_dispatch'
                    ? 'manual_github'
                    : rawEvent
                        ? rawEvent
                        : 'manual';

            const runSummary = {
                timestamp: now,
                trigger,
                status,
                scraped: this.stats.scraped,
                saved: this.stats.saved,
                failed: this.stats.failed,
                officeBreakdown: this.stats.officeBreakdown || {},
                newPdfsCount,
                skippedPdfsCount,
                totalPdfsCount,
                durationSeconds: parseFloat(elapsed) || 0,
                circuitBreakerTripped: Boolean(this.stats.circuitBreakerTripped),
            };

            // 1. Record last run summary
            await db.execute({
                sql: `INSERT INTO site_stats (key, value, updated_at)
                      VALUES ('scraper_last_run', ?, ?)
                      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                args: [JSON.stringify(runSummary), now],
            });

            // 2. If new licenses were added, also record/update latest_batch_breakdown
            if (this.stats.saved > 0 && Object.keys(this.stats.officeBreakdown || {}).length > 0) {
                await db.execute({
                    sql: `INSERT INTO site_stats (key, value, updated_at)
                          VALUES ('latest_batch_breakdown', ?, ?)
                          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                    args: [
                        JSON.stringify({
                            timestamp: now,
                            total: this.stats.saved,
                            offices: this.stats.officeBreakdown,
                        }),
                        now,
                    ],
                });
            }

            // 2. Calculate and record next scheduled run
            const cronSchedule = process.env.SCRAPER_CRON_SCHEDULE || DEFAULT_CRON_SCHEDULE;
            const nextRun = getNextCronRun(cronSchedule);
            if (nextRun) {
                await db.execute({
                    sql: `INSERT INTO site_stats (key, value, updated_at)
                          VALUES ('next_scraper_run', ?, ?)
                          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                    args: [nextRun.getTime(), now],
                });
            }

            // 3. Store schedule string
            await db.execute({
                sql: `INSERT INTO site_stats (key, value, updated_at)
                      VALUES ('scraper_schedule', ?, ?)
                      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                args: [cronSchedule, now],
            });

            console.log(`📊 Scraper stats recorded in site_stats. Trigger: ${trigger} | Next run: ${nextRun ? nextRun.toISOString() : 'N/A'}`);
        } catch (err) {
            console.warn(`Could not update scraper site_stats: ${err.message}`);
        }
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
    const scraper = new DOTMScraper();
    scraper.scrapeAll(parseCliArgs())
        .then(ok => process.exit(ok ? 0 : 1))
        .catch(err => { console.error(err); process.exit(1); });
}

module.exports = DOTMScraper;
