import sdkPackage from '../../packages/sdk/package.json'

export const NPM_PACKAGE_NAME = 'nepal-license-checker'
export const NPM_REGISTRY_URL = `https://www.npmjs.com/package/${NPM_PACKAGE_NAME}`
export const NPM_BUNDLEPHOBIA_URL = `https://bundlephobia.com/package/${NPM_PACKAGE_NAME}`
export const SDK_LICENSE_URL =
  'https://github.com/NischalAcharya060/Nepal-License-Checker/blob/main/packages/sdk/LICENSE'

export const SDK_VERSION: string = sdkPackage.version
export const SDK_LICENSE: string = sdkPackage.license ?? 'MIT'
export const SDK_DEPENDENCY_COUNT: number = Object.keys(
  (sdkPackage as { dependencies?: Record<string, string> }).dependencies ?? {}
).length

export interface NpmStats {
  /** Latest published version on the npm registry */
  version: string
  /** SPDX license of the published package */
  license: string
  /** Downloads in the last 7 days (null when the registry API is unreachable) */
  weeklyDownloads: number | null
  /** Minzipped (gzip) bundle size in bytes (null when bundlephobia is unreachable) */
  minzippedBytes: number | null
  /** Number of runtime dependencies */
  dependencyCount: number
  /** True when the values came from the live registry instead of local fallbacks */
  live: boolean
}

export const FALLBACK_NPM_STATS: NpmStats = {
  version: SDK_VERSION,
  license: SDK_LICENSE,
  weeklyDownloads: null,
  minzippedBytes: null,
  dependencyCount: SDK_DEPENDENCY_COUNT,
  live: false,
}

/**
 * Formats a byte count the way bundlephobia/shields.io do (e.g. 1338 -> "1.34 kB").
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return '—'
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1000000) return `${(bytes / 1000).toFixed(2)} kB`
  return `${(bytes / 1000000).toFixed(2)} MB`
}

/**
 * Formats a download counter (e.g. 1234 -> "1,234/week").
 */
export function formatDownloads(downloads: number | null | undefined): string {
  if (downloads === null || downloads === undefined || !Number.isFinite(downloads) || downloads < 0) {
    return '—'
  }
  return `${downloads.toLocaleString('en-US')}/week`
}
