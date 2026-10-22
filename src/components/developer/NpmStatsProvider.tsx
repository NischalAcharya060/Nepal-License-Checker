'use client'

import { createContext, useContext } from 'react'
import { FALLBACK_NPM_STATS, type NpmStats } from '@/lib/sdkMeta'

const NpmStatsContext = createContext<NpmStats>(FALLBACK_NPM_STATS)

export function NpmStatsProvider({
  stats,
  children,
}: {
  stats: NpmStats
  children: React.ReactNode
}) {
  return <NpmStatsContext.Provider value={stats}>{children}</NpmStatsContext.Provider>
}

/**
 * Live npm stats for the published SDK (version, weekly downloads, bundle size).
 * Falls back to the local package metadata when the provider is not mounted.
 */
export function useNpmStats(): NpmStats {
  return useContext(NpmStatsContext)
}
