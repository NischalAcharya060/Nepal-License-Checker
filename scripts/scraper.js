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
// Real DOTM PDF row format (after pdf-parse text extraction):
//   "<sn> <NAME...> <XX-XX-XXXXXXXX> <CATEGORY> <OFFICE> <PRINTED-DATE>"
// e.g. "1 AABAD SINGH 04-06-01453435 A CHABAHIL 2026-FEB-06"
//      "23 AABHUSHAN JYOTI KANSAKAR 01-06-00444068 B,A CHABAHIL 2026-FEB-06"
// Categories may contain commas/slashes (A,B  K,B  B,A,F,G  A/B). Office may be
// multi-word ("RADHE RADHE"). Date may be optional on legacy formats, so we
// keep it lenient.
function parseLicenses(text) {
    const results = [];
    const seen = new Set();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Anchor on the license number (the only strictly-shaped field), capture
    // what's before it as name and what's after as category/office/date.
    const pattern = /^(?:\d+\s+)?(.+?)\s+(\d{2}-\d{2}-\d{8})\s+([A-Z][A-Z,\/]*)\s+(.+?)(?:\s+(\d{4}-[A-Z]{3}-\d{2}|\d{4}-\d{2}-\d{2}))?$/;

    for (const line of lines) {
        const m = line.match(pattern);
        if (!m) continue;
        const [, nameRaw, num, category, officeRaw] = m;
        if (seen.has(num)) continue;

        const holder_name = nameRaw.trim().replace(/\s+/g, ' ');
        // Skip header line ("S.N. License Holder Name") and other non-data rows
        if (!holder_name || holder_name.length < 2) continue;
        if (/license\s+holder\s+name/i.test(holder_name)) continue;

        const office = officeRaw.trim().replace(/\s+/g, ' ') || 'Unknown';

        seen.add(num);
        results.push({
            license_number: num.trim(),
            holder_name,
            category: category.trim(),
            office,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
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
                        office      = excluded.office,
                        category    = excluded.category,
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
