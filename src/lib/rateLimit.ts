// src/lib/rateLimit.ts
export class RateLimiter {
    private requests: Map<string, number[]>
    private limit: number
    private window: number

    constructor(limit: number, windowMs: number) {
        this.requests = new Map()
        this.limit = limit
        this.window = windowMs
    }

    check(key: string): boolean {
        const now = Date.now()
        const timestamps = this.requests.get(key) || []

        // Filter out timestamps older than window
        const recent = timestamps.filter(ts => now - ts < this.window)

        if (recent.length >= this.limit) {
            return false
        }

        recent.push(now)
        this.requests.set(key, recent)
        return true
    }

    clear(key: string): void {
        this.requests.delete(key)
    }
}