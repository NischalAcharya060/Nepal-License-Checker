// src/components/developer/DeveloperKeyDistribution.tsx
'use client'

import type { KeyBreakdownItem } from '@/app/api/developer/analytics/route'

interface DeveloperKeyDistributionProps {
  keysBreakdown: KeyBreakdownItem[]
}

const ACCENT_COLORS = [
  'bg-[var(--nepal-blue)]',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
]

export default function DeveloperKeyDistribution({ keysBreakdown }: DeveloperKeyDistributionProps) {
  if (!keysBreakdown || keysBreakdown.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Key Traffic Distribution</h3>
        <p className="text-xs text-[var(--text-muted)]">No active API keys found.</p>
      </div>
    )
  }

  const totalQueries = keysBreakdown.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Workload Balance
          </span>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Key Distribution</h3>
        </div>
        <span className="font-mono text-xs font-bold text-[var(--text-secondary)]">
          {keysBreakdown.length} {keysBreakdown.length === 1 ? 'Key' : 'Keys'}
        </span>
      </div>

      {/* Multi-segment combined horizontal progress bar */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden flex shadow-inner">
          {keysBreakdown.map((item, idx) => {
            const widthPct = totalQueries > 0 ? (item.total / totalQueries) * 100 : 100 / keysBreakdown.length
            const colorClass = ACCENT_COLORS[idx % ACCENT_COLORS.length]
            return (
              <div
                key={item.id}
                style={{ width: `${Math.max(2, widthPct)}%` }}
                className={`h-full ${colorClass} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                title={`${item.name}: ${item.total.toLocaleString()} queries (${Math.round(widthPct)}%)`}
              />
            )
          })}
        </div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-mono">
          <span>0%</span>
          <span>50%</span>
          <span>100% Share</span>
        </div>
      </div>

      {/* Ranked Per-Key List */}
      <div className="space-y-2.5 pt-1">
        {keysBreakdown.map((item, idx) => {
          const colorClass = ACCENT_COLORS[idx % ACCENT_COLORS.length]
          const pct = totalQueries > 0 ? Math.round((item.total / totalQueries) * 100) : 100
          return (
            <div key={item.id} className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full ${colorClass} shrink-0`} />
                  <span className="font-semibold text-[var(--text-primary)] truncate">{item.name}</span>
                  <span className="font-mono text-[10.5px] text-[var(--text-muted)] shrink-0 hidden sm:inline">
                    ({item.prefix})
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                  <span className="text-[var(--text-primary)] font-bold">{item.total.toLocaleString()}</span>
                  <span className="text-[var(--text-muted)]">({pct}%)</span>
                </div>
              </div>

              {/* Individual Key Progress Track */}
              <div className="h-1.5 w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                <div
                  style={{ width: `${Math.max(3, pct)}%` }}
                  className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
