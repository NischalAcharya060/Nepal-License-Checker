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
    userLoading?: boolean
    privacyMode?: boolean
    setUserPage?: (page: number) => void
    setUserLimit?: (limit: number) => void
    setUserSearchFilter?: (filter: string) => void
    handleDeleteUser?: (userId: string, email: string) => void
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
        userLoading = false,
        privacyMode = true,
        setUserPage = () => {},
        setUserLimit = () => {},
        setUserSearchFilter = () => {},
        handleDeleteUser = () => {},
        exportUsersCsv = () => {},
    }: AdminUsersProps = props || {}

    const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [detailTab, setDetailTab] = useState<'licenses' | 'feedbacks'>('licenses')

    // Open User Detail Modal & load full licenses / feedbacks
    const handleInspectUser = async (user: AdminUserItem) => {
        setSelectedUser(user)
        setLoadingDetail(true)
        setDetailTab('licenses')

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

    return (
        <div className="space-y-6">
            {/* 1. Header & Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs">
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

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 shadow-xs">
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

                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs">
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

                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs">
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
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">Passwordless vs Password</div>
                </div>
            </div>

            {/* 2. Controls & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 shadow-xs">
                <div className="relative flex-1 max-w-md">
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
                        placeholder="Search users by email..."
                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-none"
                    />
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
                            {userSearchFilter ? 'No users matching your search.' : 'Users who sign in will appear here.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[var(--text-primary)]">
                            <thead className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                <tr>
                                    <th className="px-4 py-3.5">User / Email</th>
                                    <th className="px-4 py-3.5">Security</th>
                                    <th className="px-4 py-3.5 text-center">Family Cards</th>
                                    <th className="px-4 py-3.5 text-center">Inquiries</th>
                                    <th className="px-4 py-3.5">Last Active</th>
                                    <th className="px-4 py-3.5">Joined</th>
                                    <th className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)]">
                                {users.map((u) => {
                                    return (
                                        <tr key={u.id} className="hover:bg-[var(--bg-secondary)]/40 transition">
                                            {/* Email & Name */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--nepal-blue)]/10 font-bold text-xs text-[var(--nepal-blue)] shrink-0">
                                                        {u.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-[var(--text-primary)] truncate max-w-[200px]">
                                                            {maskEmail(u.email)}
                                                        </div>
                                                        {u.name && (
                                                            <div className="text-[10px] text-[var(--text-secondary)] truncate">
                                                                {u.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Security Mode */}
                                            <td className="px-4 py-3.5">
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
                                                        title="Inspect user details & family licenses"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                        <span>Inspect</span>
                                                    </button>

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

            {/* 4. USER DETAIL INSPECTION MODAL */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-2xl flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[var(--bg-secondary)]/50">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white font-extrabold text-base">
                                    {selectedUser.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-extrabold text-[var(--text-primary)] truncate">
                                        {maskEmail(selectedUser.email)}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                                        <span>Joined: {formatNepalDateTime(selectedUser.created_at)}</span>
                                        <span>•</span>
                                        <span>
                                            Last Active:{' '}
                                            {selectedUser.last_login_at
                                                ? formatTimeAgo(selectedUser.last_login_at)
                                                : 'Never'}
                                        </span>
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

                        {/* Modal Tabs Bar */}
                        <div className="flex border-b border-[var(--border-default)] px-5 pt-3 gap-4 bg-[var(--surface-primary)]">
                            <button
                                type="button"
                                onClick={() => setDetailTab('licenses')}
                                className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                                    detailTab === 'licenses'
                                        ? 'border-[var(--nepal-blue)] text-[var(--nepal-blue)]'
                                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <span>Tracked Family Licenses</span>
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
                                <span>Support Inquiries</span>
                                <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.2 text-[10px] font-bold">
                                    {selectedUser.feedbacks?.length || selectedUser.feedbacks_count}
                                </span>
                            </button>
                        </div>

                        {/* Modal Scroll Content */}
                        <div className="p-5 overflow-y-auto space-y-3 max-h-[55vh]">
                            {loadingDetail ? (
                                <div className="flex justify-center py-12">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                                </div>
                            ) : detailTab === 'licenses' ? (
                                !selectedUser.saved_licenses || selectedUser.saved_licenses.length === 0 ? (
                                    <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                                        This user has not saved any licenses yet.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {selectedUser.saved_licenses.map((lic) => {
                                            const isReady = lic.status === 'ready'
                                            return (
                                                <div
                                                    key={lic.id}
                                                    className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 flex items-center justify-between gap-3 text-xs"
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
                                                        <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                                                            {lic.license_number}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[var(--text-secondary)]">
                                                            {lic.office && <span>🏢 {lic.office}</span>}
                                                            {lic.category && <span>Category: {lic.category}</span>}
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
                                                            Alert: {lic.notify_email ? 'Enabled' : 'Disabled'}
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
                                            className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 text-xs space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-[var(--text-primary)]">
                                                    {fb.subject}
                                                </span>
                                                <span className="text-[10px] text-[var(--text-muted)]">
                                                    {new Date(fb.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                                {fb.message}
                                            </p>
                                            {fb.admin_notes && (
                                                <div className="rounded-lg bg-emerald-500/10 p-2 text-[11px] text-emerald-700 dark:text-emerald-300">
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
