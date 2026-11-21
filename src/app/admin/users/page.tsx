// src/app/admin/users/page.tsx
'use client'

import React, { useState } from 'react'
import { AdminUserItem, AdminUserStatsData } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo } from '../helpers'
import AdminPagination from '../AdminPagination'

export interface AdminUsersProps {
    users?: AdminUserItem[]
    userStats?: AdminUserStatsData | null
    userTotal?: number
    userPage?: number
    userLimit?: number
    userTotalPages?: number
    userSearchFilter?: string
    userStatusFilter?: string
    userLoading?: boolean
    privacyMode?: boolean
    setUserPage?: (page: number) => void
    setUserLimit?: (limit: number) => void
    setUserSearchFilter?: (filter: string) => void
    setUserStatusFilter?: (filter: string) => void
    handleDeleteUser?: (userId: string, email: string) => void
    handleBanUser?: (userId: string, isBanned: boolean, reason?: string) => Promise<boolean>
    exportUsersCsv?: () => void
    startTransition?: (callback: () => void) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminUsers(props: any) {
    const {
        users = [],
        userStats = null,
        userTotal = 0,
        userPage = 1,
        userLimit = 10,
        userTotalPages = 1,
        userSearchFilter = '',
        userStatusFilter = 'all',
        userLoading = false,
        privacyMode = true,
        setUserPage = () => {},
        setUserLimit = () => {},
        setUserSearchFilter = () => {},
        setUserStatusFilter = () => {},
        handleDeleteUser = () => {},
        handleBanUser = async () => false,
        exportUsersCsv = () => {},
    }: AdminUsersProps = props || {}

    // Modal & Inspection states
    const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [detailTab, setDetailTab] = useState<'overview' | 'licenses' | 'feedbacks'>('overview')

    // Ban confirmation modal
    const [banModalUser, setBanModalUser] = useState<AdminUserItem | null>(null)
    const [banReasonInput, setBanReasonInput] = useState('')
    const [submittingBan, setSubmittingBan] = useState(false)
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

    // Open User Detail Modal & load full licenses / feedbacks
    const handleInspectUser = async (user: AdminUserItem) => {
        setSelectedUser(user)
        setLoadingDetail(true)
        setDetailTab('overview')

        try {
            const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(user.id)}`)
            const data = await res.json()
            if (res.ok && data?.status === 'success' && data?.data?.user) {
                setSelectedUser(data.data.user)
            }
        } catch (err) {
            console.error('Failed to load user detail:', err)
        } finally {
            setLoadingDetail(false)
        }
    }

    const maskEmail = (email: string) => {
        if (!privacyMode) return email
        const parts = email.split('@')
        if (parts.length !== 2) return email
        const name = parts[0]
        const domain = parts[1]
        const maskedName = name.length <= 2 ? `${name.charAt(0)}*` : `${name.slice(0, 2)}***${name.slice(-1)}`
        return `${maskedName}@${domain}`
    }

    const copyToClipboard = (text: string, id: string) => {
        if (!text) return
        navigator.clipboard?.writeText(text)
        setCopiedEmail(id)
        setTimeout(() => setCopiedEmail(null), 2000)
    }

    const openBanModal = (user: AdminUserItem) => {
        setBanModalUser(user)
        setBanReasonInput('Account suspended due to policy violation or suspicious activity.')
    }

    const confirmBan = async () => {
        if (!banModalUser) return
        setSubmittingBan(true)
        const success = await handleBanUser(banModalUser.id, true, banReasonInput.trim())
        setSubmittingBan(false)
        if (success) {
            if (selectedUser?.id === banModalUser.id) {
                setSelectedUser((prev) =>
                    prev
                        ? {
                              ...prev,
                              is_banned: true,
                              ban_reason: banReasonInput.trim(),
                              banned_at: Date.now(),
                          }
                        : null
                )
            }
            setBanModalUser(null)
        }
    }

    const handleUnban = async (user: AdminUserItem) => {
        const success = await handleBanUser(user.id, false)
        if (success && selectedUser?.id === user.id) {
            setSelectedUser((prev) =>
                prev
                    ? {
                          ...prev,
                          is_banned: false,
                          ban_reason: null,
                          banned_at: null,
                      }
                    : null
            )
        }
    }

    const PRESET_BAN_REASONS = [
        'Account suspended due to policy violation or suspicious activity.',
        'Suspicious automated bot traffic or multiple fake lookups detected.',
        'Violation of Terms of Service and community safety rules.',
        'Temporary suspension pending identity verification.',
    ]

    return (
        <div className="space-y-6">
            {/* 1. Header & Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                        <span>Total Registered</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]">
                            👥
                        </span>
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                        {userStats ? userStats.totalUsers.toLocaleString() : userTotal.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">Citizen accounts</div>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <span>Active (30 Days)</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                            ⚡
                        </span>
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {userStats ? userStats.activeUsers30d.toLocaleString() : '0'}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-600/70">Logged in past month</div>
                </div>

                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                        <span>Tracked Licenses</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                            📁
                        </span>
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                        {userStats ? userStats.totalSavedLicenses.toLocaleString() : '0'}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">Family cards saved</div>
                </div>

                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
                        <span>Suspended / Banned</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600">
                            🚫
                        </span>
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                        {userStats ? (userStats.bannedUsersCount || 0).toLocaleString() : '0'}
                    </div>
                    <div className="mt-1 text-[11px] text-rose-600/70">Blocked from login</div>
                </div>

                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                        <span>Auth Method</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                            🔑
                        </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xl font-black text-[var(--text-primary)]">
                            {userStats ? userStats.otpOnlyUsersCount : '0'}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">OTP</span>
                        <span className="text-xs font-bold text-[var(--text-muted)]">/</span>
                        <span className="text-xl font-black text-[var(--nepal-blue)]">
                            {userStats ? userStats.passwordUsersCount : '0'}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">Pass</span>
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">OTP vs Password</div>
                </div>
            </div>

            {/* 2. Controls & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 shadow-xs">
                <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5 max-w-xl">
                    <div className="relative w-full">
                        <svg
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            value={userSearchFilter}
                            onChange={(e) => {
                                setUserSearchFilter(e.target.value)
                                setUserPage(1)
                            }}
                            placeholder="Search users by email or name..."
                            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-none"
                        />
                    </div>

                    <div className="w-full sm:w-auto shrink-0">
                        <select
                            value={userStatusFilter}
                            onChange={(e) => {
                                setUserStatusFilter(e.target.value)
                                setUserPage(1)
                            }}
                            className="w-full sm:w-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Accounts</option>
                            <option value="active">Active Only</option>
                            <option value="banned">Suspended / Banned Only</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={exportUsersCsv}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* 3. User Table */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-xs">
                {userLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <div className="text-3xl">👥</div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">No citizen users found</h4>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {userSearchFilter || userStatusFilter !== 'all'
                                ? 'No users matching your active filters.'
                                : 'Users who sign in will appear here.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[var(--text-primary)]">
                            <thead className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                <tr>
                                    <th className="px-4 py-3.5">User / Email</th>
                                    <th className="px-4 py-3.5">Status</th>
                                    <th className="px-4 py-3.5">Security</th>
                                    <th className="px-4 py-3.5 text-center">Family Cards</th>
                                    <th className="px-4 py-3.5 text-center">Inquiries</th>
                                    <th className="px-4 py-3.5">Last Active</th>
                                    <th className="px-4 py-3.5">Joined</th>
                                    <th className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)]">
                                {users.map((u: AdminUserItem) => {
                                    return (
                                        <tr key={u.id} className="hover:bg-[var(--bg-secondary)]/40 transition">
                                            {/* Email & Name */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs shrink-0 ${
                                                            u.is_banned
                                                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                                                : 'bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]'
                                                        }`}
                                                    >
                                                        {u.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-[var(--text-primary)] truncate max-w-[190px]">
                                                                {maskEmail(u.email)}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(u.email, u.id)}
                                                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                                                title="Copy email address"
                                                            >
                                                                {copiedEmail === u.id ? (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                        {u.name && (
                                                            <div className="text-[10px] text-[var(--text-secondary)] truncate">
                                                                {u.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                {u.is_banned ? (
                                                    <span
                                                        className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/25"
                                                        title={u.ban_reason || 'Account suspended'}
                                                    >
                                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                                        <span>Suspended</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        <span>Active</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Security Mode */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                {u.has_password ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        🔑 Password + OTP
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                                        ✉️ OTP Only
                                                    </span>
                                                )}
                                            </td>

                                            {/* Family Licenses Count */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="inline-flex items-center justify-center rounded-full bg-[var(--bg-secondary)] px-2.5 py-0.5 font-mono font-bold text-[11px] text-[var(--text-primary)]">
                                                    {u.saved_licenses_count}
                                                </span>
                                            </td>

                                            {/* Feedback Inquiries Count */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="inline-flex items-center justify-center rounded-full bg-[var(--bg-secondary)] px-2.5 py-0.5 font-mono font-bold text-[11px] text-[var(--text-primary)]">
                                                    {u.feedbacks_count}
                                                </span>
                                            </td>

                                            {/* Last Active */}
                                            <td className="px-4 py-3.5 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                                                {u.last_login_at ? (
                                                    <span>{formatTimeAgo(u.last_login_at)}</span>
                                                ) : (
                                                    <span className="text-[var(--text-muted)]">Never</span>
                                                )}
                                            </td>

                                            {/* Joined Date */}
                                            <td className="px-4 py-3.5 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleInspectUser(u)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)] hover:text-white transition cursor-pointer"
                                                        title="Inspect full citizen details & family licenses"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                        <span>Inspect</span>
                                                    </button>

                                                    {/* Ban / Unban Button */}
                                                    {u.is_banned ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnban(u)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                                                            title="Unban / Reinstate user account"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            <span>Unban</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => openBanModal(u)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                                                            title="Ban / Suspend user account"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="12" r="10" />
                                                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                                            </svg>
                                                            <span>Ban</span>
                                                        </button>
                                                    )}

                                                    {/* Delete Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                                        className="inline-flex items-center p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                                        title="Delete user"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {userTotalPages > 1 && (
                    <div className="p-4 border-t border-[var(--border-default)]">
                        <AdminPagination
                            currentPage={userPage}
                            totalPages={userTotalPages}
                            totalItems={userTotal}
                            pageSize={userLimit}
                            onPageChange={setUserPage}
                            onPageSizeChange={setUserLimit}
                        />
                    </div>
                )}
            </div>

            {/* 4. BAN USER CONFIRMATION MODAL */}
            {banModalUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
                    <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-rose-500/30 bg-[var(--surface-primary)] p-6 shadow-2xl space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                                    Suspend Citizen Account
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Target: <strong className="text-[var(--text-primary)] font-mono">{banModalUser.email}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                            Banning this account will immediately revoke all login sessions. If they attempt to sign in via password or 6-digit OTP, they will be blocked and shown this suspension reason.
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                Reason for Suspension (Visible to User)
                            </label>
                            <textarea
                                value={banReasonInput}
                                onChange={(e) => setBanReasonInput(e.target.value)}
                                rows={3}
                                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-primary)] focus:border-rose-500 focus:outline-none transition"
                                placeholder="Enter reason for suspending this user..."
                            />

                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {PRESET_BAN_REASONS.map((reason, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setBanReasonInput(reason)}
                                        className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                                    >
                                        Preset {idx + 1}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-default)]">
                            <button
                                type="button"
                                disabled={submittingBan}
                                onClick={() => setBanModalUser(null)}
                                className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={submittingBan || !banReasonInput.trim()}
                                onClick={confirmBan}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {submittingBan ? 'Suspending...' : 'Confirm Account Ban'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. USER DETAIL INSPECTION MODAL (EXPANDED DETAIL VIEW) */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
                    <div className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-2xl flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[var(--bg-secondary)]/50">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-11 w-11 items-center justify-center rounded-2xl font-extrabold text-lg text-white shadow-sm ${
                                        selectedUser.is_banned ? 'bg-rose-600' : 'bg-[var(--nepal-blue)]'
                                    }`}
                                >
                                    {selectedUser.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-extrabold text-[var(--text-primary)] truncate">
                                            {maskEmail(selectedUser.email)}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(selectedUser.email, 'modal_email')}
                                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                            title="Copy full email"
                                        >
                                            {copiedEmail === 'modal_email' ? (
                                                <span className="text-[10px] font-bold text-emerald-500">Copied!</span>
                                            ) : (
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                </svg>
                                            )}
                                        </button>
                                        {selectedUser.is_banned ? (
                                            <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
                                                🚫 Banned
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                                🟢 Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5">
                                        <span className="font-mono text-[10px] text-[var(--text-muted)]">ID: {selectedUser.id}</span>
                                        <span>•</span>
                                        <span>Joined: {formatNepalDateTime(selectedUser.created_at)}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedUser(null)}
                                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)] cursor-pointer"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Suspension Alert Banner if Banned */}
                        {selectedUser.is_banned && (
                            <div className="border-b border-rose-500/25 bg-rose-500/10 px-5 py-3 flex items-center justify-between gap-3 text-xs">
                                <div className="min-w-0">
                                    <span className="font-extrabold uppercase text-[10px] text-rose-700 dark:text-rose-300 block tracking-wider">
                                        Account Suspended by Admin
                                    </span>
                                    <p className="text-rose-800 dark:text-rose-200 mt-0.5 leading-snug">
                                        {selectedUser.ban_reason || 'No specific reason provided.'}
                                    </p>
                                    {selectedUser.banned_at && (
                                        <span className="text-[10px] text-rose-600 dark:text-rose-400">
                                            Banned on: {formatNepalDateTime(selectedUser.banned_at)}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleUnban(selectedUser)}
                                    className="shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                                >
                                    Reinstate Account
                                </button>
                            </div>
                        )}

                        {/* Modal Tabs Bar */}
                        <div className="flex border-b border-[var(--border-default)] px-5 pt-3 gap-5 bg-[var(--surface-primary)]">
                            <button
                                type="button"
                                onClick={() => setDetailTab('overview')}
                                className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                                    detailTab === 'overview'
                                        ? 'border-[var(--nepal-blue)] text-[var(--nepal-blue)]'
                                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <span>Overview & Profile</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setDetailTab('licenses')}
                                className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                                    detailTab === 'licenses'
                                        ? 'border-[var(--nepal-blue)] text-[var(--nepal-blue)]'
                                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <span>Family Licenses</span>
                                <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.2 text-[10px] font-bold">
                                    {selectedUser.saved_licenses?.length || selectedUser.saved_licenses_count}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setDetailTab('feedbacks')}
                                className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                                    detailTab === 'feedbacks'
                                        ? 'border-[var(--nepal-blue)] text-[var(--nepal-blue)]'
                                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <span>Inquiries & Tickets</span>
                                <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.2 text-[10px] font-bold">
                                    {selectedUser.feedbacks?.length || selectedUser.feedbacks_count}
                                </span>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-5 overflow-y-auto space-y-4 max-h-[58vh]">
                            {loadingDetail ? (
                                <div className="flex justify-center py-12">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                                </div>
                            ) : detailTab === 'overview' ? (
                                <div className="space-y-4 text-xs">
                                    {/* Identity Details Card */}
                                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-4 space-y-3">
                                        <h4 className="font-extrabold text-[var(--text-primary)] uppercase text-[10px] tracking-wider text-[var(--nepal-blue)]">
                                            Citizen Identity & Credentials
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                                                    Email Address
                                                </span>
                                                <div className="font-mono font-bold text-[var(--text-primary)] break-all mt-0.5">
                                                    {selectedUser.email}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                                                    Display Name
                                                </span>
                                                <div className="font-bold text-[var(--text-primary)] mt-0.5">
                                                    {selectedUser.name || 'Not provided by user'}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                                                    Authentication Security
                                                </span>
                                                <div className="mt-0.5">
                                                    {selectedUser.has_password ? (
                                                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                                            🔑 Real Password Set (Password + OTP)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                                                            ✉️ Temporary OTP Code Only (No password set)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                                                    Account Status
                                                </span>
                                                <div className="mt-0.5">
                                                    {selectedUser.is_banned ? (
                                                        <span className="font-bold text-rose-600">🔴 Suspended / Banned</span>
                                                    ) : (
                                                        <span className="font-bold text-emerald-600">🟢 Active & In Good Standing</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timestamps & Activity */}
                                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-4 space-y-3">
                                        <h4 className="font-extrabold text-[var(--text-primary)] uppercase text-[10px] tracking-wider text-[var(--nepal-blue)]">
                                            Activity & Session Timestamps
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                                                    Registered On (NPT)
                                                </span>
                                                <div className="font-medium text-[var(--text-primary)] mt-0.5">
                                                    {formatNepalDateTime(selectedUser.created_at, 'en', true)}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                                                    Last Active Login (NPT)
                                                </span>
                                                <div className="font-medium text-[var(--text-primary)] mt-0.5">
                                                    {selectedUser.last_login_at
                                                        ? `${formatNepalDateTime(selectedUser.last_login_at, 'en', true)} (${formatTimeAgo(selectedUser.last_login_at)})`
                                                        : 'Never logged in'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar inside Modal */}
                                    <div className="rounded-2xl border border-[var(--border-default)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--surface-primary)]">
                                        <div>
                                            <span className="font-bold text-[var(--text-primary)] block">
                                                Manage Citizen Access
                                            </span>
                                            <span className="text-[11px] text-[var(--text-secondary)]">
                                                Control whether this user can log in or access license records.
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedUser.is_banned ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUnban(selectedUser)}
                                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 font-bold text-white shadow-xs transition cursor-pointer"
                                                >
                                                    Reinstate Account
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => openBanModal(selectedUser)}
                                                    className="rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-2 font-bold text-white shadow-xs transition cursor-pointer"
                                                >
                                                    Ban Account
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : detailTab === 'licenses' ? (
                                !selectedUser.saved_licenses || selectedUser.saved_licenses.length === 0 ? (
                                    <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                                        This citizen has not saved any family driving licenses yet.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {selectedUser.saved_licenses.map((lic) => {
                                            const isReady = lic.status === 'ready'
                                            return (
                                                <div
                                                    key={lic.id}
                                                    className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 flex items-center justify-between gap-3 text-xs shadow-2xs"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="rounded-md bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-[10px] font-extrabold text-[var(--nepal-blue)]">
                                                                🏷️ {lic.label}
                                                            </span>
                                                            {lic.holder_name && (
                                                                <span className="font-bold text-[var(--text-primary)] truncate">
                                                                    {lic.holder_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="font-mono font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                                                            <span>{lic.license_number}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(lic.license_number, lic.id)}
                                                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                                                title="Copy license number"
                                                            >
                                                                {copiedEmail === lic.id ? (
                                                                    <span className="text-[10px] text-emerald-500 font-sans font-bold">Copied!</span>
                                                                ) : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[var(--text-secondary)]">
                                                            {lic.office && <span>🏢 {lic.office}</span>}
                                                            {lic.category && <span>Category: {lic.category}</span>}
                                                            <span>Added: {formatNepalDateTime(lic.created_at)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                                                isReady
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                            }`}
                                                        >
                                                            {isReady ? '🟢 Ready to Collect' : '⏳ Pending Print'}
                                                        </span>
                                                        <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                                                            Email Alert: {lic.notify_email ? 'Enabled' : 'Disabled'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            ) : !selectedUser.feedbacks || selectedUser.feedbacks.length === 0 ? (
                                <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                                    No support messages or feedback submitted by this user.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedUser.feedbacks.map((fb) => (
                                        <div
                                            key={fb.id}
                                            className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 text-xs space-y-2 shadow-2xs"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-[var(--text-primary)]">
                                                    {fb.subject}
                                                </span>
                                                <span className="text-[10px] text-[var(--text-muted)]">
                                                    {formatNepalDateTime(fb.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                                {fb.message}
                                            </p>
                                            {fb.admin_notes && (
                                                <div className="rounded-lg bg-emerald-500/10 p-2.5 text-[11px] text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                                    <strong>Admin reply:</strong> {fb.admin_notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-[var(--border-default)] p-4 bg-[var(--bg-secondary)]/50 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedUser(null)}
                                className="rounded-xl bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-[var(--surface-primary)] hover:opacity-90 transition cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
