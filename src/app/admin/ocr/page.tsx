'use client'

import { useState } from 'react'
import {
  AdminOcrConfig,
  AdminOcrLog,
  AdminOcrStatsData,
} from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo, maskLicenseNumber, maskIpAddress } from '../helpers'
import AdminPagination from '../AdminPagination'

export interface AdminOcrProps {
  ocrConfig?: AdminOcrConfig | null
  ocrStats?: AdminOcrStatsData | null
  ocrLogs?: AdminOcrLog[]
  ocrTotal?: number
  ocrPage?: number
  ocrLimit?: number
  ocrTotalPages?: number
  ocrSearchFilter?: string
  ocrStatusFilter?: string
  ocrLoading?: boolean
  privacyMode?: boolean
  ocrSelectMode?: boolean
  selectedOcrIds?: number[]
  copiedKey?: string | null
  setOcrPage?: (page: number) => void
  setOcrLimit?: (limit: number) => void
  setOcrSearchFilter?: (filter: string) => void
  setOcrStatusFilter?: (status: string) => void
  setOcrSelectMode?: (mode: boolean) => void
  setSelectedOcrIds?: React.Dispatch<React.SetStateAction<number[]>>
  copyToClipboard?: (text: string, key: string) => void
  handleSaveOcrConfig?: (params: { apiKey?: string; model?: string; enabled?: boolean }) => Promise<void>
  handleTestOcrKey?: (keyToTest?: string, modelToTest?: string) => Promise<{ success: boolean; latencyMs: number; modelVersion?: string; error?: string }>
  handleDeleteOcrLogs?: (ids: number[]) => Promise<void>
  handleClearAllOcrLogs?: () => Promise<void>
  exportOcrCsv?: () => void
  startTransition?: (callback: () => void) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminOcr(props: any) {
  const {
    ocrConfig = null,
    ocrStats = null,
    ocrLogs = [],
    ocrTotal = 0,
    ocrPage = 1,
    ocrLimit = 15,
    ocrTotalPages = 1,
    ocrSearchFilter = '',
    ocrStatusFilter = 'all',
    ocrLoading = false,
    privacyMode = true,
    ocrSelectMode = false,
    selectedOcrIds = [],
    copiedKey = null,
    setOcrPage = () => {},
    setOcrLimit = () => {},
    setOcrSearchFilter = () => {},
    setOcrStatusFilter = () => {},
    setOcrSelectMode = () => {},
    setSelectedOcrIds = () => {},
    copyToClipboard = () => {},
    handleSaveOcrConfig = async () => {},
    handleTestOcrKey = async () => ({ success: false, latencyMs: 0 }),
    handleDeleteOcrLogs = async () => {},
    handleClearAllOcrLogs = async () => {},
    exportOcrCsv = () => {},
    startTransition = (cb) => cb(),
  }: AdminOcrProps = props || {}

  // Local form states
  const [editingKey, setEditingKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKeySecret, setShowKeySecret] = useState(false)
  const [modelOverride, setModelOverride] = useState<string | null>(null)
  const [testingKey, setTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    latencyMs: number
    modelVersion?: string
    error?: string
  } | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  const selectedModel = modelOverride ?? ocrConfig?.model ?? 'gemini-3.5-flash-lite'

  const activeKey = ocrConfig?.apiKey || ''
  const maskedKey =
    ocrConfig?.maskedApiKey ||
    (activeKey && activeKey.length >= 8
      ? `${activeKey.slice(0, 6)}••••••••${activeKey.slice(-4)}`
      : activeKey || '••••••••')

  const onStartEditKey = () => {
    setApiKeyInput(activeKey)
    setEditingKey(true)
    setTestResult(null)
  }

  const onCancelEdit = () => {
    setEditingKey(false)
    setApiKeyInput('')
  }

  const onSaveKey = async () => {
    setSavingConfig(true)
    try {
      await handleSaveOcrConfig({ apiKey: apiKeyInput, model: selectedModel })
      setEditingKey(false)
    } finally {
      setSavingConfig(false)
    }
  }

  const onModelChange = async (newModel: string) => {
    setModelOverride(newModel)
    await handleSaveOcrConfig({ model: newModel })
  }

  const onToggleEnabled = async () => {
    if (!ocrConfig) return
    await handleSaveOcrConfig({ enabled: !ocrConfig.enabled })
  }

  const onTestConnection = async () => {
    setTestingKey(true)
    setTestResult(null)
    try {
      const keyToUse = editingKey ? apiKeyInput : undefined
      const res = await handleTestOcrKey(keyToUse, selectedModel)
      setTestResult(res)
    } finally {
      setTestingKey(false)
    }
  }

  const allSelected = ocrLogs.length > 0 && ocrLogs.every((log) => selectedOcrIds.includes(log.id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedOcrIds([])
    } else {
      setSelectedOcrIds(ocrLogs.map((l) => l.id))
    }
  }

  const toggleSelectLog = (id: number) => {
    setSelectedOcrIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <section aria-label="AI OCR & Gemini Management">
      {/* KPI Metrics */}
      <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        {/* Total Scans */}
        <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--nepal-blue)] to-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Scans</span>
            <span className="rounded-xl bg-[var(--nepal-blue-soft)] p-2 text-[var(--nepal-blue)] shadow-xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
            {ocrStats ? ocrStats.totalScans.toLocaleString() : ocrTotal.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">All time receipt OCR requests</p>
        </div>

        {/* Scans Today & Daily Quota */}
        <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Daily Quota</span>
            <span className="rounded-xl bg-[var(--success-bg)] p-2 text-[var(--success)] shadow-xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
              {ocrStats ? ocrStats.todayScans.toLocaleString() : 0}
            </span>
            <span className="text-xs font-mono font-medium text-[var(--text-muted)]">/ 1,500 RPD</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${ocrStats ? ocrStats.dailyQuotaPercent : 0}%` }}
            />
          </div>
        </div>

        {/* Success Rate */}
        <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Recognition Rate</span>
            <span className="rounded-xl bg-blue-500/10 p-2 text-blue-500 shadow-xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
            {ocrStats ? `${ocrStats.successRate}%` : '100%'}
          </p>
          <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Valid Nepal license extracted</p>
        </div>

        {/* Avg Processing Latency */}
        <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-400 opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Avg Latency</span>
            <span className="rounded-xl bg-amber-500/10 p-2 text-amber-500 shadow-xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
              {ocrStats && ocrStats.avgLatencyMs > 0 ? (ocrStats.avgLatencyMs / 1000).toFixed(1) : '1.4'}s
            </span>
            <span className="text-xs font-mono font-medium text-[var(--text-muted)]">
              ({ocrStats?.avgLatencyMs || 1440}ms)
            </span>
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Max timeout: 10 seconds</p>
        </div>
      </div>

      {/* Main Gemini API Key & Model Configuration Card */}
      <div className="mt-5 dev-glass-card rounded-2xl p-5 sm:p-6 border border-[var(--border-default)] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-default)]/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Google Gemini API Key & AI Engine
              </h2>
              {ocrConfig && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    ocrConfig.enabled
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${ocrConfig.enabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {ocrConfig.enabled ? 'Scanner Active' : 'Scanner Disabled'}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Change the AI key, switch vision model tiers, and inspect quota usage directly without touching server code.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Kill switch toggle */}
            <button
              type="button"
              onClick={onToggleEnabled}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                ocrConfig?.enabled
                  ? 'border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                  : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
              }`}
            >
              {ocrConfig?.enabled ? 'Disable Scanner' : 'Enable Scanner'}
            </button>

            {/* Test Connection Button */}
            <button
              type="button"
              disabled={testingKey || (!activeKey && !apiKeyInput)}
              onClick={onTestConnection}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-97 disabled:opacity-50 cursor-pointer"
            >
              {testingKey ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Test Connection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Test Status Banner */}
        {testResult && (
          <div
            className={`mt-4 rounded-xl p-3 border text-xs font-medium animate-fade-in flex items-center justify-between ${
              testResult.success
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{testResult.success ? '✅' : '❌'}</span>
              <span>
                {testResult.success
                  ? `Successfully connected to Gemini API in ${testResult.latencyMs} ms! (Active Model: ${testResult.modelVersion})`
                  : `Gemini Test Failed: ${testResult.error}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-xs font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Key Display & Editor */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: API Key Details */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Current Active Key
              </span>
              <span
                className={`text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 border ${
                  ocrConfig?.keySource === 'database'
                    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-500'
                    : ocrConfig?.keySource === 'environment'
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-500'
                }`}
              >
                {ocrConfig?.keySource === 'database'
                  ? 'Database Override'
                  : ocrConfig?.keySource === 'environment'
                  ? 'Environment (.env)'
                  : 'Not Configured'}
              </span>
            </div>

            {editingKey ? (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your Google Gemini API Key here (starts with AIza... or AQ...)"
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-mono font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={savingConfig || !apiKeyInput.trim()}
                    onClick={onSaveKey}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--nepal-blue)] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:brightness-110 active:scale-97 disabled:opacity-50 cursor-pointer"
                  >
                    {savingConfig ? 'Saving...' : 'Save & Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-primary)] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[var(--border-default)]/60 bg-[var(--surface-primary)] px-3 py-2">
                <span className="font-mono text-xs font-bold text-[var(--text-primary)] truncate">
                  {showKeySecret ? activeKey : maskedKey}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowKeySecret((prev) => !prev)}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
                    title={showKeySecret ? 'Hide Key' : 'Reveal Key'}
                  >
                    {showKeySecret ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeKey, 'ocr-api-key')}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--nepal-blue)] hover:bg-[var(--bg-secondary)] transition"
                    title="Copy Key"
                  >
                    {copiedKey === 'ocr-api-key' ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onStartEditKey}
                    className="ml-1 inline-flex items-center gap-1 rounded-md bg-[var(--nepal-blue-soft)] px-2 py-1 text-xs font-bold text-[var(--nepal-blue)] transition hover:bg-[var(--nepal-blue)] hover:text-white cursor-pointer"
                  >
                    Change Key
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Model Selection & Free Tier Info */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Active Vision Engine
                </span>
                <span className="text-[11px] font-bold text-emerald-500">Free Tier (15 RPM / 1.5K RPD)</span>
              </div>
              <div className="mt-2.5">
                <select
                  value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)] cursor-pointer"
                >
                  <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Recommended · ~1.4s · Low Latency)</option>
                  <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (~2.2s · Fast & Efficient)</option>
                  <option value="gemini-flash-latest">gemini-flash-latest (Full Multimodal Flash Engine)</option>
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)] border-t border-[var(--border-default)]/60 pt-2.5">
              <span>Cost Estimate: <strong>$0.00 / month</strong></span>
              <span>Timeout Limit: <strong>10.0 seconds max</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* OCR Scan Activity Logs Header & Controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>Recent OCR Scans</span>
            <span className="rounded-full bg-[var(--nepal-blue-soft)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--nepal-blue)]">
              {ocrTotal}
            </span>
          </h3>

          {/* Status Filters */}
          <div className="flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-0.5 text-xs font-bold">
            {(['all', 'success', 'not_found', 'timeout', 'error'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setOcrStatusFilter(st)}
                className={`rounded-lg px-2.5 py-1 capitalize transition ${
                  ocrStatusFilter === st
                    ? 'bg-[var(--nepal-blue)] text-white shadow-2xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {st === 'not_found' ? 'Not Found' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={ocrSearchFilter}
              onChange={(e) => setOcrSearchFilter(e.target.value)}
              placeholder="Search license or IP..."
              className="h-8 w-44 sm:w-56 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] pl-8 pr-3 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--nepal-blue)]"
            />
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportOcrCsv}
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-bold text-[var(--text-secondary)] shadow-xs transition hover:text-[var(--text-primary)]"
            title="Export CSV"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Select Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              setOcrSelectMode(!ocrSelectMode)
              setSelectedOcrIds([])
            }}
            className={`inline-flex h-8 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold transition ${
              ocrSelectMode
                ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue)] text-white'
                : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)]'
            }`}
          >
            {ocrSelectMode ? 'Cancel' : 'Select'}
          </button>

          {ocrSelectMode && selectedOcrIds.length > 0 && (
            <button
              type="button"
              onClick={() => handleDeleteOcrLogs(selectedOcrIds)}
              className="inline-flex h-8 items-center gap-1 rounded-xl bg-rose-500 px-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-600"
            >
              Delete ({selectedOcrIds.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleClearAllOcrLogs}
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 text-xs font-bold text-rose-500 transition hover:bg-rose-500/20"
            title="Clear all OCR logs"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border-default)] dev-glass-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/70 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                {ocrSelectMode && (
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                )}
                <th className="py-3 px-3.5">Time</th>
                <th className="py-3 px-3.5">Detected License</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Latency</th>
                <th className="py-3 px-3.5">Source Type</th>
                <th className="py-3 px-3.5">Model Engine</th>
                <th className="py-3 px-3.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]/60 font-medium">
              {ocrLoading ? (
                <tr>
                  <td colSpan={ocrSelectMode ? 8 : 7} className="py-8 text-center text-[var(--text-muted)]">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                      <span>Loading OCR scan records...</span>
                    </div>
                  </td>
                </tr>
              ) : ocrLogs.length === 0 ? (
                <tr>
                  <td colSpan={ocrSelectMode ? 8 : 7} className="py-10 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className="text-2xl">📸</span>
                      <p className="font-bold text-[var(--text-primary)]">No OCR scans found</p>
                      <p className="text-xs">Scan requests will appear here with live latency and detection details.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ocrLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition hover:bg-[var(--bg-secondary)]/40"
                  >
                    {ocrSelectMode && (
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedOcrIds.includes(log.id)}
                          onChange={() => toggleSelectLog(log.id)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="py-3 px-3.5 whitespace-nowrap text-[var(--text-muted)] font-mono">
                      <div className="flex flex-col">
                        <span>{formatTimeAgo(log.created_at)}</span>
                        <span className="text-[10px] opacity-75">{formatNepalDateTime(log.created_at)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-[var(--text-primary)]">
                      {log.license_number ? (
                        <div className="flex items-center gap-1.5">
                          <span>{maskLicenseNumber(log.license_number, privacyMode)}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(log.license_number!, `ocr-${log.id}`)}
                            className="text-[var(--text-muted)] hover:text-[var(--nepal-blue)]"
                            title="Copy number"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] font-normal italic">None detected</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          log.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : log.status === 'not_found'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : log.status === 'timeout'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}
                      >
                        {log.status === 'success'
                          ? '✓ Extracted'
                          : log.status === 'not_found'
                          ? 'No DL Found'
                          : log.status === 'timeout'
                          ? '⏱ Timeout'
                          : 'Error'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-xs">
                      <span className="rounded-md bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                        {log.latency_ms} ms
                      </span>
                    </td>
                    <td className="py-3 px-3.5 capitalize text-[var(--text-secondary)]">
                      {log.detected_source ? log.detected_source.replace(/_/g, ' ') : '—'}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-[var(--text-muted)]">
                      {log.model_used || 'gemini-3.5-flash-lite'}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-[var(--text-muted)]">
                      {maskIpAddress(log.ip, privacyMode)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {ocrTotalPages > 1 && (
          <div className="border-t border-[var(--border-default)] px-4 py-3">
            <AdminPagination
              currentPage={ocrPage}
              totalPages={ocrTotalPages}
              pageSize={ocrLimit}
              totalItems={ocrTotal}
              itemLabel="scan logs"
              onPageChange={(p: number) => startTransition(() => setOcrPage(p))}
              onPageSizeChange={(l: number) => startTransition(() => setOcrLimit(l))}
            />
          </div>
        )}
      </div>
    </section>
  )
}
