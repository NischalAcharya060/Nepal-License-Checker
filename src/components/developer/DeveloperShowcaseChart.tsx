// src/components/developer/DeveloperShowcaseChart.tsx
'use client'

import { useState } from 'react'

export default function DeveloperShowcaseChart() {
  const [activeTab, setActiveTab] = useState<'throughput' | 'latency'>('throughput')

  return (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Performance & Throughput Visualizer
            </h2>
            <span className="rounded-full bg-[var(--nepal-blue)]/10 px-2.5 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)]">
              Interactive Preview
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Compare public rate ceilings with authenticated developer keys in real time.
          </p>
        </div>

        <div className="flex rounded-xl border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('throughput')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'throughput'
                ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] font-bold shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Sustained Throughput
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('latency')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'latency'
                ? 'bg-[var(--surface-primary)] text-[var(--success)] font-bold shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Response Latency
          </button>
        </div>
      </div>

      {activeTab === 'throughput' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Visual SVG Comparison Bars */}
          <div className="space-y-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-5">
            {/* Developer Tier Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[var(--nepal-blue)] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--nepal-blue)]" />
                  <span>Developer Tier (API Key)</span>
                </span>
                <span className="font-mono font-bold text-[var(--text-primary)]">60 req/min (100%)</span>
              </div>
              <div className="h-4 w-full rounded-full bg-[var(--border-default)]/40 overflow-hidden p-0.5">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-[var(--nepal-blue)] to-blue-400" />
              </div>
              <span className="text-[10.5px] text-[var(--text-muted)] block">
                Continuous sliding window • 0s penalty lockout
              </span>
            </div>

            {/* Public Anonymous Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
                  <span>Public Anonymous (IP)</span>
                </span>
                <span className="font-mono font-bold text-[var(--danger)]">15 req/min (25%)</span>
              </div>
              <div className="h-4 w-full rounded-full bg-[var(--border-default)]/40 overflow-hidden p-0.5">
                <div className="h-full w-1/4 rounded-full bg-[var(--danger)]/70" />
              </div>
              <span className="text-[10.5px] text-[var(--danger)]/80 block">
                5-minute IP lockout on exceeding 15 calls
              </span>
            </div>
          </div>

          {/* Key Advantages Summary */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Why upgrade to Developer Tier?</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--success)]/15 text-[var(--success)] font-bold text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <strong className="text-[var(--text-primary)]">4x Higher Throughput:</strong> Sustained 60 requests every 60-second sliding window without dropping calls.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--success)]/15 text-[var(--success)] font-bold text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <strong className="text-[var(--text-primary)]">Zero Lockout Penalties:</strong> Unlike public IP blocks that freeze you for 300 seconds, API keys return RFC standard <code className="font-mono text-[10px]">Retry-After</code> headers.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--success)]/15 text-[var(--success)] font-bold text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <strong className="text-[var(--text-primary)]">Cloud Server Safe:</strong> Independent of shared NAT or public IP collisions in AWS, Vercel, or DigitalOcean.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Latency Comparison */}
          <div className="space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[var(--success)]">Mirrored DOTM Database (Turso Edge)</span>
                <span className="font-mono font-bold text-[var(--success)]">~38ms</span>
              </div>
              <div className="h-3 w-full rounded-full bg-[var(--border-default)]/40 overflow-hidden">
                <div className="h-full w-[15%] rounded-full bg-[var(--success)]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[var(--text-muted)]">Legacy Government DOTM Portal</span>
                <span className="font-mono font-bold text-amber-500">~2,400ms (High variance)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-[var(--border-default)]/40 overflow-hidden">
                <div className="h-full w-[85%] rounded-full bg-amber-500/80" />
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-default)]">
              Our automated nightly scrapers mirror all verified driving license records into high-speed Turso edge replicas, delivering sub-50ms query speeds.
            </p>
          </div>

          <div className="space-y-3.5">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Production-Grade Infrastructure</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--nepal-blue)]/15 text-[var(--nepal-blue)] font-bold text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </span>
                <div>
                  <strong className="text-[var(--text-primary)]">Edge Mirroring:</strong> Requests execute with minimal latency across Kathmandu and regional nodes.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--nepal-blue)]/15 text-[var(--nepal-blue)] font-bold text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <div>
                  <strong className="text-[var(--text-primary)]">99.98% Uptime SLA:</strong> Even when the official DOTM government website is down for maintenance, our replicas remain operational.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
