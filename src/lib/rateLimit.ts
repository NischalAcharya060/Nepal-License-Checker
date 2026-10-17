// src/lib/rateLimit.ts

export interface RateLimitStatus {
    allowed: boolean
    retryAfter: number // in seconds
    limit?: number
    remaining?: number
    reset?: number // timestamp in seconds
}

export class RateLimiter {
    private requests: Map<string, number[]>
    private blocked: Map<string, number> // IP/key -> blockedUntil timestamp (ms)
    private limit: number
    private window: number
    private blockDuration: number
    private lastPrune: number

    /**
     * @param limit Maximum requests allowed in `windowMs`
     * @param windowMs Time window in milliseconds
     * @param blockDurationMs Penalty lockout duration in milliseconds when limit is breached (0 = no lockout)
     */
    constructor(limit: number, windowMs: number, blockDurationMs: number = 0) {
        this.requests = new Map()
        this.blocked = new Map()
        this.limit = limit
        this.window = windowMs
        this.blockDuration = blockDurationMs
        this.lastPrune = Date.now()
    }

    private prune(now: number): void {
        // Prune maps periodically (at most once every 60s) or if memory grows beyond 5000 keys
        if (now - this.lastPrune < 60000 && this.requests.size < 5000) return
        this.lastPrune = now

        for (const [key, until] of this.blocked.entries()) {
            if (now >= until) this.blocked.delete(key)
        }

        for (const [key, timestamps] of this.requests.entries()) {
            const recent = timestamps.filter(ts => now - ts < this.window)
            if (recent.length === 0) {
                this.requests.delete(key)
            } else {
                this.requests.set(key, recent)
            }
        }
    }

    checkLimit(key: string, customLimit?: number): RateLimitStatus {
        const now = Date.now()
        this.prune(now)
        const effectiveLimit = customLimit ?? this.limit

        // 1. Check if key is currently in penalty lockout
        const blockedUntil = this.blocked.get(key)
        if (blockedUntil && now < blockedUntil) {
            const retryAfter = Math.ceil((blockedUntil - now) / 1000)
            return {
                allowed: false,
                retryAfter,
                limit: effectiveLimit,
                remaining: 0,
                reset: Math.ceil(blockedUntil / 1000),
            }
        }

        if (blockedUntil && now >= blockedUntil) {
            this.blocked.delete(key)
        }

        // 2. Sliding window check
        const timestamps = this.requests.get(key) || []
        const recent = timestamps.filter(ts => now - ts < this.window)

        if (recent.length >= effectiveLimit) {
            // Breached! Trigger lockout penalty if configured
            if (this.blockDuration > 0) {
                const penaltyUntil = now + this.blockDuration
                this.blocked.set(key, penaltyUntil)
                const retryAfter = Math.ceil(this.blockDuration / 1000)
                return {
                    allowed: false,
                    retryAfter,
                    limit: effectiveLimit,
                    remaining: 0,
                    reset: Math.ceil(penaltyUntil / 1000),
                }
            }
            const oldestInWindow = recent[0] || now
            const resetTime = oldestInWindow + this.window
            const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000))
            return {
                allowed: false,
                retryAfter,
                limit: effectiveLimit,
                remaining: 0,
                reset: Math.ceil(resetTime / 1000),
            }
        }

        recent.push(now)
        this.requests.set(key, recent)
        const oldestInWindow = recent[0] || now
        const resetTime = oldestInWindow + this.window
        const remaining = Math.max(0, effectiveLimit - recent.length)

        return {
            allowed: true,
            retryAfter: 0,
            limit: effectiveLimit,
            remaining,
            reset: Math.ceil(resetTime / 1000),
        }
    }

    check(key: string): boolean {
        return this.checkLimit(key).allowed
    }

    getRetryAfter(key: string): number {
        const now = Date.now()
        const blockedUntil = this.blocked.get(key)
        if (blockedUntil && now < blockedUntil) {
            return Math.ceil((blockedUntil - now) / 1000)
        }
        return Math.ceil(this.window / 1000)
    }

    clear(key: string): void {
        this.requests.delete(key)
        this.blocked.delete(key)
    }

    getCurrentUsage(key: string, customLimit?: number): { used: number; remaining: number; reset: number; limit: number } {
        const now = Date.now()
        const effectiveLimit = customLimit ?? this.limit
        const timestamps = this.requests.get(key) || []
        const recent = timestamps.filter(ts => now - ts < this.window)
        const oldest = recent[0] || now
        const reset = Math.ceil((oldest + this.window) / 1000)
        return {
            used: recent.length,
            remaining: Math.max(0, effectiveLimit - recent.length),
            reset,
            limit: effectiveLimit,
        }
    }
}