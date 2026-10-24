'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function DeveloperMobileDeviceWarning() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem('nlc_dev_dismissed_mobile_modal')
      if (dismissed === 'true') return
    } catch {
      // Ignore sessionStorage errors
    }

    // Trigger on screens smaller than standard desktop laptops (< 1024px)
    if (window.innerWidth < 1024) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('nlc_dev_dismissed_mobile_modal', 'true')
    } catch {
      // Ignore
    }
    setIsOpen(false)
  }

  const handleCopyUrl = () => {
    if (typeof window === 'undefined') return
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true)
        toast.success('Link copied!')
        setTimeout(() => setCopied(false), 2500)
      })
      .catch(() => {
        toast.error('Could not copy link')
      })
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-dev-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={handleDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-cyan-500/30 bg-slate-950 p-5 sm:p-6 text-slate-100 shadow-2xl animate-rise-in max-h-[90vh] overflow-y-auto"
      >
        {/* Top Header Badge & Close Button */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            REAL_DEV_CHECK.sh
          </span>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close dialog"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 text-slate-400 transition hover:border-slate-700 hover:text-slate-100 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Fun visual icon & headline */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950 shadow-inner">
            <span className="text-2xl select-none" role="img" aria-label="Laptop and smartphone">
              💻📱
            </span>
          </div>

          <h2 id="mobile-dev-title" className="text-base font-black tracking-tight text-white sm:text-xl">
            Wait... are you really coding on a phone? 🤨
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
            Bro, real developers don’t inspect REST API keys, copy cURL commands, and read OpenAPI schemas on a 6-inch touchscreen!
          </p>

          {/* Humorous Terminal / JSON Snippet */}
          <div className="mt-3 w-full rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 text-left font-mono text-[11px] leading-5 text-slate-400 shadow-inner">
            <div className="flex items-center gap-1.5 pb-2 text-[10px] text-slate-500 border-b border-slate-800/60">
              <span className="h-2 w-2 rounded-full bg-red-500/60" />
              <span className="h-2 w-2 rounded-full bg-amber-500/60" />
              <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
              <span className="ml-1 text-slate-400 font-semibold">sanity_check.json</span>
            </div>
            <div className="pt-2 text-slate-300">
              <span className="text-cyan-400 font-semibold">&quot;device&quot;</span>: <span className="text-amber-300">&quot;smartphone&quot;</span>,<br />
              <span className="text-cyan-400 font-semibold">&quot;developer_suffering&quot;</span>: <span className="text-emerald-400 font-bold">true</span>,<br />
              <span className="text-cyan-400 font-semibold">&quot;recommendation&quot;</span>: <span className="text-amber-300">&quot;switch_to_laptop_or_monitor&quot;</span>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            For the best developer experience (and to save your eyesight), open this portal on your <strong>PC, Mac, or Laptop</strong> with a mechanical keyboard and 47 Chrome tabs!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{copied ? 'Link copied!' : 'Copy Link to Open on PC / Mac'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-slate-100 active:scale-[0.98] cursor-pointer"
          >
            I like suffering (Continue on Phone)
          </button>
        </div>
      </div>
    </div>
  )
}
