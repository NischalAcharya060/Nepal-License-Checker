export interface AdminScraperData {
    totalRecords: number
    lastRun: {
        timestamp: number
        trigger: string
        status: string
        scraped: number
        saved: number
        failed: number
        newPdfsCount?: number
        skippedPdfsCount?: number
        totalPdfsCount?: number
        durationSeconds: number
        circuitBreakerTripped?: boolean
    } | null
    nextRun: {
        timestamp: number
        iso: string
    }
    schedule: string
}

export interface SearchLog {
    id: number
    license_number: string
    status: 'found' | 'not_found' | 'error'
    holder_name?: string | null
    office?: string | null
    category?: string | null
    ip: string
    country?: string | null
    city?: string | null
    region?: string | null
    user_agent?: string | null
    source?: 'manual' | 'scanner' | string | null
    created_at: number
    duplicate_count?: number
    is_latest?: boolean
}

export interface SearchStats {
    total: number
    today: number
    found: number
    uniqueIps: number
    foundRate: number
    topLocations: Array<{ city: string; country: string; count: number }>
    dailyTrend?: Array<{
        date: string
        label: string
        total: number
        found: number
        notFound: number
    }>
    topLicenses?: Array<{
        license_number: string
        status: string
        count: number
    }>
    topOffices?: Array<{
        office: string
        count: number
    }>
    topIps?: Array<{
        ip: string
        city: string
        country: string
        count: number
    }>
    duplicateCount?: number
    duplicateLicenses?: number
    redundantCount?: number
}

export interface DuplicateLogEntry {
    id: number
    created_at: number
    ip: string
    city?: string | null
    country?: string | null
    region?: string | null
    status: 'found' | 'not_found' | 'error'
    user_agent?: string | null
    is_latest?: boolean
}

export interface DuplicateLicenseGroup {
    license_number: string
    total_count: number
    redundant_count: number
    holder_name?: string | null
    office?: string | null
    category?: string | null
    status: 'found' | 'not_found' | 'error'
    latest_created_at: number
    earliest_created_at: number
    latest_ip: string
    latest_city?: string | null
    latest_country?: string | null
    entries: DuplicateLogEntry[]
}

export interface DuplicateSummaryResult {
    groups: DuplicateLicenseGroup[]
    stats: {
        duplicateCount: number
        duplicateLicenses: number
        redundantCount: number
    }
}

export interface PruneLogsPreviewResult {
    days: number
    cutoff: number
    matchingCount: number
    keptCount: number
    totalCount: number
    logs: SearchLog[]
}

export type SystemMode = 'normal' | 'maintenance' | 'degraded'

export interface SystemModeConfig {
    mode: SystemMode
    message: string
    updated_at: number
    updated_by: string
}

export interface NotificationLog {
    id: string
    license_number: string
    email: string
    status: 'pending' | 'processing' | 'sent' | 'cancelled'
    created_at: number
    updated_at: number
    sent_at?: number | null
    cancelled_at?: number | null
    confirmation_sent_at?: number | null
    holder_name?: string | null
    office?: string | null
}

export interface NotificationStatsData {
    total: number
    pending: number
    sent: number
    cancelled: number
    deliveryRate: number
    pendingUnnotified?: number
}

export type FeedbackStatus = 'new' | 'in_progress' | 'resolved'

export interface FeedbackLog {
    id: string
    name: string
    email: string
    license_number?: string | null
    category: string
    subject: string
    message: string
    status: FeedbackStatus
    admin_notes?: string | null
    ip?: string | null
    created_at: number
    updated_at: number
}

export interface FeedbackStatsData {
    total: number
    newCount: number
    inProgressCount?: number
    resolvedCount: number
    todayCount: number
}

export interface TestimonialLog {
    id: string
    name: string
    role?: string | null
    rating: number
    message: string
    email?: string | null
    license_number?: string | null
    status: 'pending' | 'approved' | 'rejected'
    is_featured: boolean
    admin_notes?: string | null
    ip?: string | null
    created_at: number
    updated_at: number
}

export interface TestimonialStatsData {
    total: number
    pendingCount: number
    approvedCount: number
    rejectedCount: number
    averageRating: number
    todayCount: number
}

export interface AdminPasskey {
    id: string
    device_name: string
    device_type: string | null
    backed_up: boolean
    transports: string[]
    created_at: number
    last_used_at: number | null
}

export interface ConfirmDialogDetailItem {
    label: string
    value: string | number
    highlight?: 'default' | 'error' | 'success' | 'amber' | 'blue'
}

export interface ConfirmDialogState {
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => Promise<void>
    requiredPhrase?: string
    badge?: string
    details?: ConfirmDialogDetailItem[]
    note?: string
}

export interface ToastState {
    message: string
    type: 'success' | 'info' | 'error'
}

export interface AdminDeveloperApiKey {
    id: string
    developer_id: string
    key_prefix: string
    name: string
    rate_limit_per_minute: number
    is_active: number
    total_requests: number
    last_used_at: number | null
    created_at: number
}

export interface AdminDeveloper {
    id: string
    github_id: string
    username: string
    name: string | null
    email: string | null
    avatar_url: string | null
    created_at: number
    keys: AdminDeveloperApiKey[]
    total_queries: number
}

export interface DeveloperStatsData {
    totalDevelopers: number
    totalKeys: number
    activeKeys: number
    totalQueries: number
    queriesToday: number
}

export interface AdminOcrConfig {
    apiKey: string
    maskedApiKey: string
    hasKey: boolean
    keySource: 'database' | 'environment' | 'none'
    secondaryApiKey?: string
    maskedSecondaryApiKey?: string
    hasSecondaryKey?: boolean
    secondaryKeySource?: 'database' | 'environment' | 'none'
    model: string
    enabled: boolean
}

export interface AdminOcrLog {
    id: number
    license_number: string | null
    status: 'success' | 'not_found' | 'timeout' | 'error'
    latency_ms: number
    confidence: string | null
    detected_source: string | null
    model_used: string | null
    ip: string | null
    error_message: string | null
    created_at: number
    search_status?: 'found' | 'not_found' | null
    search_count?: number
}

export interface AdminOcrStatsData {
    totalScans: number
    todayScans: number
    successCount: number
    notFoundCount: number
    timeoutCount: number
    errorCount: number
    successRate: number
    avgLatencyMs: number
    dailyQuotaLimit: number
    dailyQuotaUsed: number
    dailyQuotaPercent: number
    rpmLimit: number
    checkedCount?: number
    checkedRate?: number
}

export interface AdminUpdateEntry {
    id: number
    timestamp: number
    iso: string
    dateStr: string
    status: 'success' | 'partial' | 'circuit_breaker' | 'empty' | 'failed'
    saved: number
    newPdfsCount?: number
    totalPdfsCount?: number
    durationSeconds?: number
    trigger?: string
    officeBreakdown?: Record<string, number>
    hidden?: boolean
}

export interface AdminUpdatesStatsData {
    totalUpdates: number
    visibleUpdates: number
    hiddenUpdates: number
    totalSavedRecords: number
    latestDateStr: string | null
}

export interface AdminUserSavedLicenseItem {
    id: string
    label: string
    license_number: string
    notify_email: boolean
    created_at: number
    status?: 'ready' | 'not_printed'
    holder_name?: string | null
    office?: string | null
    category?: string | null
}

export interface AdminUserFeedbackItem {
    id: string
    subject: string
    category: string
    message: string
    status: string
    admin_notes?: string | null
    created_at: number
}

export interface AdminUserItem {
    id: string
    email: string
    name: string | null
    has_password: boolean
    created_at: number
    updated_at: number
    last_login_at: number | null
    saved_licenses_count: number
    feedbacks_count: number
    saved_licenses?: AdminUserSavedLicenseItem[]
    feedbacks?: AdminUserFeedbackItem[]
}

export interface AdminUserStatsData {
    totalUsers: number
    activeUsers30d: number
    totalSavedLicenses: number
    passwordUsersCount: number
    otpOnlyUsersCount: number
}





