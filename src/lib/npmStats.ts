import {
  FALLBACK_NPM_STATS,
  NPM_PACKAGE_NAME,
  type NpmStats,
} from './sdkMeta'

const REVALIDATE_SECONDS = 3600
const FETCH_TIMEOUT_MS = 4000

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Resolves live npm metadata for the published SDK.
 *
 * Every upstream is optional: the npm registry supplies the version/license,
 * the npm downloads API supplies the weekly counter and bundlephobia supplies
 * the minzipped bundle size. If any of them is unavailable (offline, rate
 * limited, blocked) the local package metadata is used instead so the docs
 * never render a broken or misleading badge.
 */
export async function getNpmStats(): Promise<NpmStats> {
  const [registry, downloads, bundle] = await Promise.all([
    fetchJson<{ version?: string; license?: string }>(
      `https://registry.npmjs.org/${NPM_PACKAGE_NAME}/latest`
    ),
    fetchJson<{ downloads?: number }>(
      `https://api.npmjs.org/downloads/point/last-week/${NPM_PACKAGE_NAME}`
    ),
    fetchJson<{ gzip?: number; dependencyCount?: number }>(
      `https://bundlephobia.com/api/size?package=${NPM_PACKAGE_NAME}`
    ),
  ])

  const version = typeof registry?.version === 'string' ? registry.version : null
  const license = typeof registry?.license === 'string' ? registry.license : null
  const weeklyDownloads =
    typeof downloads?.downloads === 'number' && Number.isFinite(downloads.downloads)
      ? downloads.downloads
      : null
  const minzippedBytes =
    typeof bundle?.gzip === 'number' && Number.isFinite(bundle.gzip) ? bundle.gzip : null

  return {
    version: version ?? FALLBACK_NPM_STATS.version,
    license: license ?? FALLBACK_NPM_STATS.license,
    weeklyDownloads,
    minzippedBytes,
    dependencyCount:
      typeof bundle?.dependencyCount === 'number'
        ? bundle.dependencyCount
        : FALLBACK_NPM_STATS.dependencyCount,
    live: Boolean(version || weeklyDownloads !== null || minzippedBytes !== null),
  }
}
