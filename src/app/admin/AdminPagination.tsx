'use client'

import React, { useState } from 'react'

export interface AdminPaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (pageSize: number) => void
    pageSizeOptions?: number[]
    itemLabel?: string
    loading?: boolean
    lastUpdated?: Date | null
    className?: string
}

export function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, 'ellipsis', totalPages]
    }

    if (currentPage >= totalPages - 3) {
        return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages]
}

export default function AdminPagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100, 200],
    itemLabel = 'items',
    loading = false,
    lastUpdated = null,
    className = '',
}: AdminPaginationProps) {
    const [jumpInput, setJumpInput] = useState<string | null>(null)
    const displayJump = jumpInput !== null ? jumpInput : String(currentPage)

    const safeTotalPages = Math.max(1, totalPages)
    const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0
    const endItem = Math.min(currentPage * pageSize, totalItems)
    const pageNumbers = getPageNumbers(currentPage, safeTotalPages)

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const parsed = parseInt(displayJump, 10)
        setJumpInput(null)
        if (!isNaN(parsed) && parsed >= 1 && parsed <= safeTotalPages && parsed !== currentPage) {
            onPageChange(parsed)
        }
    }

    return (
        <div
            className={`flex flex-col gap-3.5 border-t border-[var(--border-default)] px-3.5 py-3.5 sm:px-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
        >
            {/* Left: Summary and Page Size Selector */}
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 text-xs text-[var(--text-muted)]">
                <div>
                    {totalItems === 0 ? (
                        <span>No {itemLabel} found</span>
                    ) : (
                        <span>
                            Showing <strong className="font-mono tabular-nums text-[var(--text-primary)]">{startItem.toLocaleString()}</strong> to{' '}
                            <strong className="font-mono tabular-nums text-[var(--text-primary)]">{endItem.toLocaleString()}</strong> of{' '}
                            <strong className="font-mono tabular-nums text-[var(--text-primary)]">{totalItems.toLocaleString()}</strong> {itemLabel}
                        </span>
                    )}
                    {lastUpdated && (
                        <span className="ml-2 hidden text-[11px] font-mono text-[var(--text-muted)] sm:inline">
                            (Updated: {lastUpdated.toLocaleTimeString('en-NP', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', second: '2-digit' })} NPT)
                        </span>
                    )}
                </div>

                {onPageSizeChange && (
                    <div className="flex items-center gap-1.5 pl-0 sm:pl-2 sm:border-l sm:border-[var(--border-default)]">
                        <label htmlFor="admin-page-size" className="text-[11px] font-medium text-[var(--text-muted)]">
                            Rows:
                        </label>
                        <select
                            id="admin-page-size"
                            value={pageSize}
                            onChange={(e) => {
                                const newSize = Number(e.target.value)
                                onPageSizeChange(newSize)
                                onPageChange(1)
                            }}
                            disabled={loading}
                            aria-label={`Rows per page for ${itemLabel}`}
                            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition hover:border-[var(--nepal-blue)] focus:border-[var(--nepal-blue)] focus:outline-hidden disabled:opacity-50 cursor-pointer"
                        >
                            {pageSizeOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt} rows
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Right: Page Navigation Controls */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5">
                {/* First Page Button */}
                <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage <= 1 || loading}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs text-[var(--text-secondary)] shadow-2xs transition active:scale-95 hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    title="First page"
                    aria-label="First page"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="11 17 6 12 11 7" />
                        <polyline points="18 17 13 12 18 7" />
                    </svg>
                </button>

                {/* Previous Page Button */}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1 || loading}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition active:scale-95 hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    title="Previous page"
                    aria-label="Previous page"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Numbered Page Buttons (Desktop / Tablet) */}
                <div className="hidden md:flex items-center gap-1">
                    {pageNumbers.map((num, idx) => {
                        if (num === 'ellipsis') {
                            return (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className="flex h-8 w-7 items-center justify-center text-xs font-bold text-[var(--text-muted)] select-none"
                                >
                                    …
                                </span>
                            )
                        }

                        const isActive = num === currentPage
                        return (
                            <button
                                key={`page-${num}`}
                                type="button"
                                onClick={() => onPageChange(num)}
                                disabled={loading}
                                aria-current={isActive ? 'page' : undefined}
                                className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-bold font-mono tabular-nums transition shadow-2xs active:scale-95 cursor-pointer ${
                                    isActive
                                        ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                        : 'border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)]'
                                }`}
                            >
                                {num}
                            </button>
                        )
                    })}
                </div>

                {/* Compact Page Display on Mobile (< md) */}
                <div className="md:hidden px-2 font-mono tabular-nums text-xs font-bold text-[var(--text-secondary)]">
                    {currentPage} / {safeTotalPages}
                </div>

                {/* Next Page Button */}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
                    disabled={currentPage >= safeTotalPages || loading}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition active:scale-95 hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    title="Next page"
                    aria-label="Next page"
                >
                    <span className="hidden sm:inline">Next</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>

                {/* Last Page Button */}
                <button
                    type="button"
                    onClick={() => onPageChange(safeTotalPages)}
                    disabled={currentPage >= safeTotalPages || loading}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs text-[var(--text-secondary)] shadow-2xs transition active:scale-95 hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    title="Last page"
                    aria-label="Last page"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="13 17 18 12 13 7" />
                        <polyline points="6 17 11 12 6 7" />
                    </svg>
                </button>

                {/* Quick Jump Input when there are multiple pages */}
                {safeTotalPages > 3 && (
                    <form onSubmit={handleJumpSubmit} className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-[var(--border-default)] text-xs">
                        <span className="text-[11px] text-[var(--text-muted)]">Go to:</span>
                        <input
                            type="number"
                            min={1}
                            max={safeTotalPages}
                            value={displayJump}
                            onChange={(e) => setJumpInput(e.target.value)}
                            onBlur={() => {
                                const parsed = parseInt(displayJump, 10)
                                setJumpInput(null)
                                if (!isNaN(parsed) && parsed >= 1 && parsed <= safeTotalPages && parsed !== currentPage) {
                                    onPageChange(parsed)
                                }
                            }}
                            disabled={loading}
                            className="h-8 w-12 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-1.5 text-center font-mono text-xs font-bold text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-hidden"
                            title={`Jump directly to page 1-${safeTotalPages}`}
                            aria-label="Jump to page"
                        />
                    </form>
                )}
            </div>
        </div>
    )
}
