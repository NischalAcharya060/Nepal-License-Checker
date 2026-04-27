const FALLBACK_SITE_URL = 'https://nepal-license-checker.vercel.app'

export function getSiteUrl(): string {
  const direct = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (direct) {
    const normalized = direct.startsWith('http') ? direct : `https://${direct}`
    return normalized.replace(/\/+$/, '')
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelProduction) {
    return `https://${vercelProduction.replace(/\/+$/, '')}`
  }

  return FALLBACK_SITE_URL
}
