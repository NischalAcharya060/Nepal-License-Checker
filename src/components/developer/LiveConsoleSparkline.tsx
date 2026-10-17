// src/components/developer/LiveConsoleSparkline.tsx
'use client'

export interface LiveRequestEntry {
  id: string
  duration: number
  status: number
  timestamp: number
  number: string
}

interface LiveConsoleSparklineProps {
  history: LiveRequestEntry[]
}

export default function LiveConsoleSparkline({ history }: LiveConsoleSparklineProps) {
  if (history.length === 0) return null

  const width = 360
  const height = 64
  const padding = { top: 10, right: 15, bottom: 20, left: 35 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const maxDuration = Math.max(...history.map((h) => h.duration), 60)
  const minDuration = 0

  const getX = (index: number) => {
    if (history.length <= 1) return padding.left + innerWidth / 2
    return padding.left + (index / (history.length - 1)) * innerWidth
  }

  const getY = (val: number) => {
    const range = maxDuration - minDuration || 1
    const normalized = (val - minDuration) / range
    return padding.top + innerHeight - normalized * innerHeight
  }

  const coords = history.map((entry, idx) => ({
    x: getX(idx),
    y: getY(entry.duration),
    entry,
  }))

  const linePath = coords.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  )

  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${padding.top + innerHeight} L ${coords[0].x} ${padding.top + innerHeight} Z`
      : ''

  const avgLatency = Math.round(
    history.reduce((sum, h) => sum + h.duration, 0) / history.length
  )

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--nepal-blue)]" />
          <span>Real-time Latency Sparkline</span>
        </span>
        <div className="flex items-center gap-2 font-mono text-[10.5px]">
          <span className="text-[var(--text-muted)]">Avg:</span>
          <span className="font-bold text-purple-600 dark:text-purple-400">⚡ {avgLatency}ms</span>
          <span className="text-[var(--text-muted)]">({history.length} {history.length === 1 ? 'test' : 'tests'})</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16 overflow-visible select-none">
        <defs>
          <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Axis Baseline */}
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={padding.left + innerWidth}
          y2={padding.top + innerHeight}
          stroke="currentColor"
          className="text-[var(--border-default)]"
          strokeWidth="1"
        />

        {/* Area */}
        {areaPath && <path d={areaPath} fill="url(#sparkline-grad)" />}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Nodes with color reflecting HTTP status */}
        {coords.map((pt, idx) => {
          const status = pt.entry.status
          const nodeColor =
            status < 300
              ? '#10b981' // Green
              : status === 429
              ? '#ef4444' // Red
              : '#f59e0b' // Amber

          return (
            <g key={pt.entry.id || idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill={nodeColor}
                stroke="white"
                strokeWidth="1.5"
              />
              <text
                x={pt.x}
                y={pt.y - 6}
                textAnchor="middle"
                className="fill-[var(--text-muted)] text-[8.5px] font-mono font-bold"
              >
                {pt.entry.duration}ms
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
