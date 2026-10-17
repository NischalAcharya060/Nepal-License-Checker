// src/components/developer/DeveloperTrafficChart.tsx
'use client'

import { useState, useId } from 'react'
import type { AnalyticsTimelinePoint } from '@/app/api/developer/analytics/route'

interface DeveloperTrafficChartProps {
  timeline: AnalyticsTimelinePoint[]
  timeframe: '24h' | '7d' | '30d'
  onTimeframeChange: (tf: '24h' | '7d' | '30d') => void
  isSampleData?: boolean
  loading?: boolean
}

type ChartMetric = 'traffic' | 'status' | 'latency'

export default function DeveloperTrafficChart({
  timeline,
  timeframe,
  onTimeframeChange,
  isSampleData = false,
  loading = false,
}: DeveloperTrafficChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('traffic')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const chartId = useId()

  const width = 800
  const height = 280
  const padding = { top: 25, right: 30, bottom: 40, left: 55 }

  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  // Extract values based on active metric
  const points = timeline && timeline.length > 0 ? timeline : []
  const count = points.length

  const getMetricValue = (pt: AnalyticsTimelinePoint) => {
    if (metric === 'latency') return pt.latencyMs
    return pt.total
  }

  const values = points.map(getMetricValue)
  const maxValueRaw = Math.max(...values, metric === 'latency' ? 60 : 10)
  // Round max value up to a clean ceiling
  const maxValue = Math.ceil(maxValueRaw * 1.15)
  const minValue = 0

  // Calculate coordinates
  const getX = (index: number) => {
    if (count <= 1) return padding.left + innerWidth / 2
    return padding.left + (index / (count - 1)) * innerWidth
  }

  const getY = (val: number) => {
    const range = maxValue - minValue || 1
    const normalized = (val - minValue) / range
    return padding.top + innerHeight - normalized * innerHeight
  }

  // Generate smooth cubic Bézier path
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return ''
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`

    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    }
    return d
  }

  // Coordinates for main line
  const mainCoords = points.map((pt, i) => ({
    x: getX(i),
    y: getY(getMetricValue(pt)),
  }))

  const linePath = createSmoothPath(mainCoords)
  const areaPath =
    mainCoords.length > 0
      ? `${linePath} L ${mainCoords[mainCoords.length - 1].x} ${padding.top + innerHeight} L ${mainCoords[0].x} ${padding.top + innerHeight} Z`
      : ''

  // For 'status' view: second line for Rate Limited (429) & Errors
  const errorCoords = points.map((pt, i) => ({
    x: getX(i),
    y: getY(pt.rateLimited + pt.error),
  }))
  const errorLinePath = createSmoothPath(errorCoords)

  // Active hover point
  const activePt = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null
  const activeX = hoverIndex !== null ? getX(hoverIndex) : 0
  const activeY = hoverIndex !== null && activePt ? getY(getMetricValue(activePt)) : 0

  // Y-axis grid ticks (4 ticks)
  const yTicks = [0, 0.33, 0.66, 1].map((pct) => ({
    value: Math.round(minValue + (maxValue - minValue) * pct),
    y: padding.top + innerHeight - pct * innerHeight,
  }))

  // X-axis label filtering (show at most 6-8 labels cleanly)
  const xLabelStep = count > 15 ? Math.ceil(count / 7) : 1

  const activeColor =
    metric === 'latency'
      ? '#8b5cf6' // Purple for latency
      : '#0055ff' // Nepal Blue for traffic

  return (
    <div className="space-y-4">
      {/* Header controls: Switchers & Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border-default)]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector Tabs */}
          <div className="flex rounded-xl border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric('traffic')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metric === 'traffic'
                  ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] font-bold shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Traffic Volume
            </button>
            <button
              type="button"
              onClick={() => setMetric('status')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metric === 'status'
                  ? 'bg-[var(--surface-primary)] text-[var(--success)] font-bold shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Status Distribution
            </button>
            <button
              type="button"
              onClick={() => setMetric('latency')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metric === 'latency'
                  ? 'bg-[var(--surface-primary)] text-purple-600 dark:text-purple-400 font-bold shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Response Latency
            </button>
          </div>

          {/* Sample data preview pill indicator */}
          {isSampleData && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Sample Preview Data</span>
            </span>
          )}
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
            Range:
          </span>
          {(['24h', '7d', '30d'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                timeframe === tf
                  ? 'bg-[var(--nepal-blue)] text-white shadow-2xs'
                  : 'border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Canvas Container */}
      <div className="relative rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-3 sm:p-5">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-primary)]/70 backdrop-blur-xs rounded-2xl">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Smooth linear gradient for traffic fill */}
            <linearGradient id={`grad-traffic-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeColor} stopOpacity="0.35" />
              <stop offset="90%" stopColor={activeColor} stopOpacity="0.02" />
            </linearGradient>

            {/* Error / Throttled Line Gradient */}
            <linearGradient id={`grad-error-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="90%" stopColor="#ef4444" stopOpacity="0.01" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id={`glow-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={padding.left + innerWidth}
                y2={tick.y}
                stroke="currentColor"
                className="text-[var(--border-default)]/60"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-[var(--text-muted)] text-[10.5px] font-mono font-medium"
              >
                {tick.value}
                {metric === 'latency' ? 'ms' : ''}
              </text>
            </g>
          ))}

          {/* X-Axis Baseline */}
          <line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight}
            stroke="currentColor"
            className="text-[var(--border-default)]"
            strokeWidth="1"
          />

          {/* Main Area Fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#grad-traffic-${chartId})`}
              className="transition-all duration-300"
            />
          )}

          {/* Main Smooth Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={activeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* In Status mode: Secondary Line for Rate Limited & Errors */}
          {metric === 'status' && errorLinePath && (
            <path
              d={errorLinePath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Data Nodes / Dots */}
          {mainCoords.map((pt, idx) => {
            const isHovered = hoverIndex === idx
            return (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : count > 20 ? 0 : 3.5}
                fill="var(--surface-primary)"
                stroke={activeColor}
                strokeWidth={isHovered ? 3 : 2}
                className="transition-all duration-150 cursor-pointer"
                filter={isHovered ? `url(#glow-${chartId})` : undefined}
              />
            )
          })}

          {/* Invisible interactive vertical touch/hover bars */}
          {points.map((_, idx) => {
            const x = getX(idx)
            const sliceWidth = innerWidth / count
            return (
              <rect
                key={idx}
                x={x - sliceWidth / 2}
                y={padding.top}
                width={sliceWidth}
                height={innerHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            )
          })}

          {/* Hover Crosshair & Vertical Guide */}
          {hoverIndex !== null && (
            <g className="pointer-events-none">
              <line
                x1={activeX}
                y1={padding.top}
                x2={activeX}
                y2={padding.top + innerHeight}
                stroke={activeColor}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="opacity-70"
              />
              <circle
                cx={activeX}
                cy={activeY}
                r="6"
                fill={activeColor}
                stroke="white"
                strokeWidth="2"
                filter={`url(#glow-${chartId})`}
              />
            </g>
          )}

          {/* X-Axis Labels */}
          {points.map((pt, idx) => {
            if (idx % xLabelStep !== 0 && idx !== count - 1) return null
            const x = getX(idx)
            const isHovered = hoverIndex === idx
            return (
              <text
                key={idx}
                x={x}
                y={padding.top + innerHeight + 22}
                textAnchor="middle"
                className={`text-[10px] font-mono transition-colors ${
                  isHovered
                    ? 'fill-[var(--nepal-blue)] font-bold'
                    : 'fill-[var(--text-muted)] font-medium'
                }`}
              >
                {pt.label}
              </text>
            )
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {activePt && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs shadow-xl backdrop-blur-md transition-all duration-100 min-w-[170px]"
            style={{
              left: `${(activeX / width) * 100}%`,
              top: `${Math.max(15, (activeY / height) * 100 - 8)}%`,
            }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-1.5 mb-1.5 font-bold">
              <span className="text-[var(--text-primary)]">{activePt.label}</span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                {timeframe === '24h' ? 'Hourly' : 'Daily'}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--text-secondary)] font-sans">Total Requests:</span>
                <span className="font-bold text-[var(--text-primary)]">{activePt.total.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--success)] font-sans flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                  Success (200):
                </span>
                <span className="font-bold text-[var(--success)]">{activePt.success}</span>
              </div>

              {activePt.rateLimited > 0 && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-[var(--danger)] font-sans flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
                    Throttled (429):
                  </span>
                  <span className="font-bold text-[var(--danger)]">{activePt.rateLimited}</span>
                </div>
              )}

              <div className="flex justify-between items-center gap-3 pt-1 border-t border-[var(--border-default)]/60">
                <span className="text-[var(--text-muted)] font-sans">Avg Latency:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  ⚡ {activePt.latencyMs}ms
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)] pt-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--nepal-blue)]" />
            <span className="font-medium">Total API Queries</span>
          </div>
          {metric === 'status' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
                <span className="font-medium">200 OK Status</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
                <span className="font-medium">429 Throttled / 4xx</span>
              </div>
            </>
          )}
          {metric === 'latency' && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              <span className="font-medium">Response Latency (ms)</span>
            </div>
          )}
        </div>

        <span className="font-mono text-[11px] text-[var(--text-muted)]">
          Mirrored Database • Sliding Window Throttled
        </span>
      </div>
    </div>
  )
}
