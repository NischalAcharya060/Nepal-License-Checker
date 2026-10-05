import { NextRequest, NextResponse } from 'next/server'
import {
    MAINT_COOKIE,
    isMaintenanceEnabled,
    verifySessionToken,
} from '@/lib/maintenanceAuth'

const PUBLIC_PATHS = new Set([
    '/maintenance',
    '/maintenance/login',
    '/api/maintenance/auth',
    '/api/maintenance/status',
    '/admin',
    '/api/admin/auth',
    '/api/admin/logs',
])

export async function proxy(request: NextRequest) {
    const maintenanceActive = isMaintenanceEnabled()
    const { pathname } = request.nextUrl

    // If maintenance is inactive and user visits /maintenance, smoothly redirect home
    if (!maintenanceActive) {
        if (pathname === '/maintenance') {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return NextResponse.next()
    }

    // Always allow public maintenance pages and auth endpoints
    if (PUBLIC_PATHS.has(pathname)) {
        return NextResponse.next()
    }

    // Allow authorized administrators with a cryptographically verified cookie
    const secret = process.env.MAINTENANCE_PASSWORD
    if (secret && (await verifySessionToken(request.cookies.get(MAINT_COOKIE)?.value, secret))) {
        return NextResponse.next()
    }

    // API callers get a standard RFC 503 response with Retry-After header
    if (pathname.startsWith('/api/')) {
        return NextResponse.json(
            {
                status: 'error',
                error: 'Service is temporarily unavailable while database synchronization is in progress.',
            },
            {
                status: 503,
                headers: {
                    'Retry-After': '3600',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
            }
        )
    }

    // All page requests rewrite to the maintenance notice with search-engine protection
    const url = request.nextUrl.clone()
    url.pathname = '/maintenance'
    return NextResponse.rewrite(url, {
        headers: {
            'Retry-After': '3600',
            'X-Robots-Tag': 'noindex, nofollow, noarchive',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
    })
}

export default proxy

export const config = {
    // Skip static assets, Next.js internals, and any files with extensions (favicon, sw.js, images)
    matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
