// src/components/developer/DeveloperQuotaGauge.tsx
'use client'

import { useEffect, useState } from 'react'

interface DeveloperQuotaGaugeProps {
  limit?: number
  used?: number
  remaining?: number
  resetInSeconds?: number
}

export default function DeveloperQuotaGauge({
  limit = 60,
  used = 0,
  remaining = 60,
  resetInSeconds = 0,
}: DeveloperQuotaGaugeProps) {
  const [prevReset, setPrevReset] = useState(resetInSeconds)
  const [countdown, setCountdown] = useState(resetInSeconds)

  if (resetInSeconds !== prevReset) {
    setPrevReset(resetInSeconds)
    setCountdown(resetInSeconds)
  }

  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  // SVG Gauge calculations
  const size = 160
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  const percentage = Math.min(100, Math.max(0, Math.round((used / limit) * 100)))
  // Dash offset: 0% used = full empty, 100% used = full ring
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Color selection based on load
  const gaugeColor =
    percentage > 85
      ? '#ef4444' // Red
      : percentage > 60
      ? '#f59e0b' // Amber
      : '#10b981' // Green

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Rate Limit Gauge
          </span>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Sliding Quota Status</h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            percentage > 85
              ? 'bg-[var(--danger)]/15 text-[var(--danger)]'
              : percentage > 60
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-[var(--success)]/15 text-[var(--success)]'
          }`}
        >
          {percentage > 85 ? 'High Load' : percentage > 60 ? 'Moderate' : 'Optimal'}
        </span>
      </div>

      {/* Circular Gauge Centerpiece */}
      <div className="relative flex items-center justify-center my-1">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-[var(--border-default)]/50 fill-none"
          />

          {/* Animated Filled Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="fill-none transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text Stats */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl font-black text-[var(--text-primary)] leading-tight">
            {used}
            <span className="text-xs font-normal text-[var(--text-muted)]">/{limit}</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Used / Min
          </span>
        </div>
      </div>

      {/* Quota Metrics Breakdown */}
      <div className="space-y-2 pt-2 border-t border-[var(--border-default)] text-xs">
        <div className="flex justify-between items-center text-[11px] font-mono">
          <span className="text-[var(--text-secondary)] font-sans">Remaining Capacity:</span>
          <span className="font-bold text-[var(--nepal-blue)]">{remaining} calls</span>
        </div>

        <div className="flex justify-between items-center text-[11px] font-mono">
          <span className="text-[var(--text-secondary)] font-sans">Window Reset:</span>
          <span className="font-bold text-[var(--text-primary)]">
            {countdown > 0 ? `in ${countdown}s` : 'Rolling continuously'}
          </span>
        </div>

        <div className="flex justify-between items-center text-[11px] font-mono">
          <span className="text-[var(--text-secondary)] font-sans">Breach Penalty:</span>
          <span className="font-bold text-[var(--success)]">0s (Zero Lockout)</span>
        </div>
      </div>
    </div>
  )
}
