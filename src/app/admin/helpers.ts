// Inactivity Auto-Logout Configuration: 5 minutes idle timeout with 60-second warning countdown
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes total inactivity
export const INACTIVITY_WARNING_MS = 60 * 1000 // 60 seconds warning countdown before logout
export const INACTIVITY_TRIGGER_MS = INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS // 4 minutes
export const ACTIVITY_STORAGE_KEY = 'nlc_admin_last_activity'

export function getFlag(countryCode?: string | null): string {
    if (!countryCode || countryCode.length !== 2) return '🌐'
    const code = countryCode.toUpperCase()
    return String.fromCodePoint(...code.split('').map((c) => 127397 + c.charCodeAt(0)))
}

export function formatTimeAgo(timestamp: number | string | null | undefined): string {
    if (!timestamp) return '—'
    let ms = typeof timestamp === 'string' ? Number(timestamp) : timestamp
    if (isNaN(ms) || ms <= 0) return '—'
    // Normalize timestamps in seconds to milliseconds
    if (ms < 100000000000) {
        ms *= 1000
    }
    const diffSecs = Math.floor((Date.now() - ms) / 1000)
    if (diffSecs < 15) return 'Just now'
    if (diffSecs < 60) return `${diffSecs}s ago`
    const mins = Math.floor(diffSecs / 60)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    const years = Math.floor(days / 365)
    return `${years}y ago`
}

export function maskLicenseNumber(license: string | null | undefined, isPrivate: boolean): string {
    if (!license) return '—'
    if (!isPrivate) return license
    return `${license.slice(0, 2)}*******`
}

export function maskIpAddress(ip: string | null | undefined, isPrivate: boolean): string {
    if (!ip) return '—'
    if (!isPrivate) return ip
    const prefix = ip.includes('.') ? ip.split('.')[0] : ip.slice(0, 3)
    return `${prefix}*******`
}
