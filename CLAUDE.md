# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build & serve
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + TS)
- `node scripts/scraper.js` — run the full DOTM PDF scrape against Firestore directly (requires Firebase Admin env vars in `.env`)
- `node scripts/update-data.js` — same scrape, wrapped to print a JSON summary (used by the cron route)

There is no test suite configured.

## Architecture

This is a Next.js 16 (App Router, React 19) app that lets users check whether their Nepal driving license has been printed by DOTM. It is essentially a thin search UI over a Firestore mirror of PDFs published at `dotm.gov.np/category/details-of-printed-licenses/`.

**Data flow — three tiers, in order of preference:**

1. **Firestore cache** (`licenses` collection, doc id = license number). Populated by the scraper. Fast path for `GET /api/license`.
2. **Live scrape on miss.** If a license isn't in Firestore, `src/app/api/license/route.ts` fetches the DOTM category page, walks `/content/` sub-pages, downloads up to 10 PDFs, extracts ASCII text, and regex-matches `XX-XX-XXXXXXXX  NAME  CATEGORY  OFFICE`. A hit is written back to Firestore so future lookups stay on the fast path.
3. **Scheduled batch scrape.** `vercel.json` registers a daily cron (`0 2 * * *`) hitting `/api/cron`, which runs `scripts/update-data.js` → `scripts/scraper.js` to bulk-refresh Firestore from all linked PDFs. The cron route checks `Authorization: Bearer ${CRON_SECRET}` (Vercel sends this automatically for its crons).

**Two scraper implementations exist intentionally** — keep them in sync if you change parsing:
- `scripts/scraper.js` (Node, batch): uses `pdf-parse` with a raw-byte fallback, batches 500 docs per Firestore commit, paces sub-page fetches with `sleep(500)`.
- `src/app/api/license/route.ts` (per-request live fallback): pure runtime, capped at 10 PDFs and ~5 sub-pages with `AbortSignal.timeout`, uses only the inline ASCII extractor (no `pdf-parse`) to stay light. Both share the same line regex `/^(\d{2}-\d{2}-\d{8})\s+(.+?)\s+([A-C](?:\/[A-C])*)\s*(.*)/`.

**Firebase has two init paths.** Don't cross them:
- `src/lib/firebase.ts` — client SDK, public `NEXT_PUBLIC_FIREBASE_*` env. Currently unused by app code; keep only if you add client-side Firebase.
- `src/lib/firebase-admin.ts` — Admin SDK, server-only `FIREBASE_ADMIN_*` env. `private_key` arrives with literal `\n` and is unescaped at init time. All API routes and the scraper go through this.

**Rate limiting** is in-process (`src/lib/rateLimit.ts`, 15 req/min/IP). On Vercel this is per-instance, not global — fine for current traffic, but don't treat it as a hard ceiling.

**Input validation.** Both `src/utils/validation.ts` and the API route enforce `^\d{2}-\d{2}-\d{8}$`; `src/utils/sanitize.ts` strips HTML/specials before the regex. The duplication is deliberate (defense in depth at the boundary) — keep the API check even if you tighten client validation.

**API CORS.** `next.config.ts` sets `Access-Control-Allow-Origin: *` for `/api/*`. The license endpoint is intentionally public.

**UI** is a single client page (`src/app/page.tsx`) driving `LicenseForm` and `LicenseResult` via a `SearchState` state machine (`idle | loading | found | not_found | error`). Styling is mostly inline styles + Tailwind v4 (`@tailwindcss/postcss`). `react-hot-toast` for feedback.

## Things to know before changing the scraper

- DOTM's PDFs are published per-office and the category page links to `/content/...` sub-pages. The PDF URL extraction must handle both absolute `https://dotm.gov.np/...pdf` links and relative `href="/...pdf"` — see `extractPDFUrls` in `scripts/scraper.js`.
- The raw-bytes PDF extractor only recovers ASCII strings ≥ 3–4 chars. It works because DOTM PDFs embed text uncompressed in tabular form. If DOTM ever switches to image-only PDFs, both scrapers break and OCR is required.
- Firestore writes are idempotent (`set({...}, { merge: true })` keyed on `license_number`). Re-running the scraper is safe.

## Environment

Required env vars (see `vercel.json` for the full list):
- Server: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `CRON_SECRET`
- Client (currently unused at runtime but wired up): `NEXT_PUBLIC_FIREBASE_*`

A service-account JSON (`nepal-license-print-status-firebase-adminsdk-*.json`) is checked into the repo root — treat as sensitive; do not log, copy, or expose it.
