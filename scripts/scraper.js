// scripts/scraper.js
require('dotenv').config();

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { createClient } = require('@libsql/client');

// ── Turso (libSQL) init ──────────────────────────────────────────────────────
if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is not set — add it to .env');
}
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function ensureSchema() {
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
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchUrl(url, binary = false, retries = 3) {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            const parsed = new URL(url);
            const lib = parsed.protocol === 'https:' ? https : http;
            const opts = {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'GET',
                timeout: binary ? 60000 : 20000,
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
                        const wait = 2000 * n;
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

// ── Scraper class ─────────────────────────────────────────────────────────────
class DOTMScraper {
    constructor() {
        this.BASE = 'https://dotm.gov.np';
        this.CATEGORY = `${this.BASE}/category/details-of-printed-licenses/`;
        this.stats = { scraped: 0, saved: 0, updated: 0, failed: 0, skipped: 0 };
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
        // Match any /content/<id>/<slug>/ path regardless of how it's wrapped
        // (the DOTM listing uses markup that the strict href="..." regex misses).
        const pattern = /\/content\/\d+\/[A-Za-z0-9_\-]+\/?/gi;
        for (const m of (html.matchAll(pattern) || [])) {
            const path = m[0].endsWith('/') ? m[0] : m[0] + '/';
            links.add(`${this.BASE}${path}`);
        }
        return [...links];
    }

    async getOfficePDFs() {
        console.log('Fetching DOTM category page (with pagination)...');

        let pdfUrls = [];
        const contentLinks = new Set();

        // Walk paginated category pages until one yields no new sub-page links.
        const MAX_PAGES = 20;
        for (let page = 1; page <= MAX_PAGES; page++) {
            const url = page === 1 ? this.CATEGORY : `${this.CATEGORY}?page=${page}`;
            const html = await this.getPageHTML(url);
            if (!html) break;

            pdfUrls = pdfUrls.concat(this.extractPDFUrls(html, url));

            const before = contentLinks.size;
            for (const link of this.extractContentLinks(html)) contentLinks.add(link);
            const added = contentLinks.size - before;

            console.log(`  page ${page}: +${added} new sub-pages (total ${contentLinks.size})`);
            if (added === 0) break;
            await sleep(400);
        }

        console.log(`Found ${contentLinks.size} office pages, ${pdfUrls.length} direct PDFs from listings`);

        // Visit each office sub-page to find their PDFs
        for (const link of contentLinks) {
            try {
                const subHtml = await this.getPageHTML(link);
                if (!subHtml) continue;
                const subPDFs = this.extractPDFUrls(subHtml, link);
                if (subPDFs.length) console.log(`  ${link} → ${subPDFs.length} pdf(s)`);
                pdfUrls = pdfUrls.concat(subPDFs);
                await sleep(1500);
            } catch (err) {
                console.warn(`  Sub-page error: ${err.message}`);
            }
        }

        // Deduplicate
        const unique = [...new Set(pdfUrls)];
        console.log(`Total unique PDFs to process: ${unique.length}`);
        return unique;
    }

    async processPDF(pdfUrl) {
        console.log(`  PDF: ${pdfUrl}`);
        try {
            const buf = await fetchUrl(pdfUrl, true);
            const text = await parsePDF(buf);
            const licenses = parseLicenses(text);
            console.log(`    → ${licenses.length} licenses extracted`);
            return licenses;
        } catch (err) {
            console.error(`    → Failed: ${err.message}`);
            return [];
        }
    }

    async saveBatch(licenses) {
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

            try {
                await db.batch(stmts, 'write');
                this.stats.saved += chunk.length;
                if ((i / BATCH_SIZE) % 25 === 0) {
                    console.log(`    saved ${this.stats.saved} so far...`);
                }
            } catch (err) {
                console.error(`Batch write failed (${chunk.length} rows): ${err.message}`);
                this.stats.failed += chunk.length;
            }
        }
    }

    async scrapeAll() {
        console.log('\n═══ DOTM License Scraper ═══\n');
        const startTime = Date.now();
        await ensureSchema();

        const pdfUrls = await this.getOfficePDFs();
        if (!pdfUrls.length) {
            console.log('No PDFs found. Exiting.');
            return false;
        }

        let pendingLicenses = [];

        for (let i = 0; i < pdfUrls.length; i++) {
            console.log(`\n[${i + 1}/${pdfUrls.length}]`);
            const licenses = await this.processPDF(pdfUrls[i]);
            this.stats.scraped += licenses.length;
            pendingLicenses = pendingLicenses.concat(licenses);

            // Save in batches of 1000 to avoid memory buildup
            if (pendingLicenses.length >= 1000) {
                await this.saveBatch(pendingLicenses);
                pendingLicenses = [];
            }

            await sleep(1000);
        }

        // Save remainder
        if (pendingLicenses.length) {
            await this.saveBatch(pendingLicenses);
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n═══ Done in ${elapsed}s ═══`);
        console.log(`Scraped: ${this.stats.scraped} | Saved: ${this.stats.saved} | Failed: ${this.stats.failed}`);
        return true;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
    const scraper = new DOTMScraper();
    scraper.scrapeAll()
        .then(ok => process.exit(ok ? 0 : 1))
        .catch(err => { console.error(err); process.exit(1); });
}

module.exports = DOTMScraper;
