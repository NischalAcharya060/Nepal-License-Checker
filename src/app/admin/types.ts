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
    created_at: number
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
    holder_name?: string | null
    office?: string | null
}

export interface NotificationStatsData {
    total: number
    pending: number
    sent: number
    cancelled: number
    deliveryRate: number
}

export interface FeedbackLog {
    id: string
    name: string
    email: string
    license_number?: string | null
    category: string
    subject: string
    message: string
    status: 'new' | 'resolved'
    admin_notes?: string | null
    ip?: string | null
    created_at: number
    updated_at: number
}

export interface FeedbackStatsData {
    total: number
    newCount: number
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

export interface ConfirmDialogState {
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => Promise<void>
    requiredPhrase?: string
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

