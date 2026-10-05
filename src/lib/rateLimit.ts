// src/lib/rateLimit.ts

export interface RateLimitStatus {
    allowed: boolean
    retryAfter: number // in seconds
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

    checkLimit(key: string): RateLimitStatus {
        const now = Date.now()
        this.prune(now)

        // 1. Check if key is currently in penalty lockout
        const blockedUntil = this.blocked.get(key)
        if (blockedUntil && now < blockedUntil) {
            const retryAfter = Math.ceil((blockedUntil - now) / 1000)
            return { allowed: false, retryAfter }
        }

        if (blockedUntil && now >= blockedUntil) {
            this.blocked.delete(key)
        }

        // 2. Sliding window check
        const timestamps = this.requests.get(key) || []
        const recent = timestamps.filter(ts => now - ts < this.window)

        if (recent.length >= this.limit) {
            // Breached! Trigger lockout penalty if configured
            if (this.blockDuration > 0) {
                const penaltyUntil = now + this.blockDuration
                this.blocked.set(key, penaltyUntil)
                const retryAfter = Math.ceil(this.blockDuration / 1000)
                return { allowed: false, retryAfter }
            }
            const retryAfter = Math.ceil(this.window / 1000)
            return { allowed: false, retryAfter }
        }

        recent.push(now)
        this.requests.set(key, recent)
        return { allowed: true, retryAfter: 0 }
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
}