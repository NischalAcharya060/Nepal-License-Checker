// scripts/scraper.js
require('dotenv').config();

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// ── Firebase init ────────────────────────────────────────────────────────────
if (!getApps().length) {
    initializeApp({
        credential: cert({
            project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
            client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}
const db = getFirestore();

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
                    'Accept': binary ? 'application/pdf,*/*' : 'text/html,application/xhtml+xml,*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
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
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buf);
        return data.text;
    } catch {
        return extractTextFromPDF(buf);
    }
}

// ── License parser ───────────────────────────────────────────────────────────
function parseLicenses(text) {
    const results = [];
    const seen = new Set();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const pattern = /^(\d{2}-\d{2}-\d{8})\s+(.+?)\s+([A-C](?:\/[A-C])*)\s*(.*)/;

    for (const line of lines) {
        const m = line.match(pattern);
        if (!m) continue;
        const [, num, name, category, officeRaw] = m;
        if (seen.has(num)) continue;
        seen.add(num);

        const holder_name = name.trim().replace(/\s+/g, ' ');
        if (!holder_name || holder_name.length < 2) continue;

        results.push({
            license_number: num.trim(),
            holder_name,
            category: category.trim(),
            office: officeRaw.trim() || 'Unknown',
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
        for (const m of (html.matchAll(/href="((?:https?:\/\/dotm\.gov\.np)?\/content\/[^"]+)"/gi) || [])) {
            const href = m[1];
            links.add(href.startsWith('http') ? href : `${this.BASE}${href}`);
        }
        return [...links];
    }

    async getOfficePDFs() {
        console.log('Fetching DOTM category page...');
        const html = await this.getPageHTML(this.CATEGORY);
        if (!html) return [];

        let pdfUrls = this.extractPDFUrls(html, this.CATEGORY);
        const contentLinks = this.extractContentLinks(html);

        console.log(`Found ${contentLinks.length} office pages, ${pdfUrls.length} direct PDFs`);

        // Visit each office sub-page to find their PDFs
        for (const link of contentLinks) {
            try {
                const subHtml = await this.getPageHTML(link);
                if (!subHtml) continue;
                const subPDFs = this.extractPDFUrls(subHtml, link);
                pdfUrls = pdfUrls.concat(subPDFs);
                await sleep(500);
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
        const BATCH_SIZE = 500;
        for (let i = 0; i < licenses.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = licenses.slice(i, i + BATCH_SIZE);

            for (const lic of chunk) {
                const ref = db.collection('licenses').doc(lic.license_number);
                batch.set(ref, lic, { merge: true });
            }

            try {
                await batch.commit();
                this.stats.saved += chunk.length;
            } catch (err) {
                console.error(`Batch write failed: ${err.message}`);
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
