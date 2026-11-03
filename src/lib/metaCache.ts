let cachedMetadata: {
  data: unknown
  cachedAt: number
} | null = null

const CACHE_TTL_MS = 30 * 1000 // 30 seconds cache

export function getCachedMetadata<T = unknown>(): T | null {
  const now = Date.now()
  if (cachedMetadata && now - cachedMetadata.cachedAt < CACHE_TTL_MS) {
    return cachedMetadata.data as T
  }
  return null
}

export function setCachedMetadata(data: unknown): void {
  cachedMetadata = {
    data,
    cachedAt: Date.now(),
  }
}

export function invalidateMetadataCache(): void {
  cachedMetadata = null
}
