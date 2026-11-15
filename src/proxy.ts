import { NextRequest, NextResponse } from 'next/server'
import {
    MAINT_COOKIE,
    isMaintenanceEnabled,
    verifySessionToken,
} from '@/lib/maintenanceAuth'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import { getSystemMode } from '@/lib/systemMode'

const PUBLIC_PATHS = new Set([
    '/maintenance',
    '/maintenance/login',
    '/api/maintenance/auth',
    '/api/maintenance/status',
    '/admin',
    '/api/admin/auth',
    '/api/admin/logs',
    '/api/admin/system-mode',
])

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Fetch live system mode (cached for 3s in memory, edge-compatible HTTP fetch)
    const systemModeConfig = await getSystemMode().catch(() => ({
        mode: (isMaintenanceEnabled() ? 'maintenance' : 'normal') as 'normal' | 'maintenance' | 'degraded',
        message: '',
        updated_at: 0,
        updated_by: 'system',
    }))

    const maintenanceActive =
        systemModeConfig.mode === 'maintenance' || isMaintenanceEnabled()

    // 2. If maintenance is inactive and user visits /maintenance, smoothly redirect home
    if (!maintenanceActive) {
        if (pathname === '/maintenance') {
            return NextResponse.redirect(new URL('/', request.url))
        }
        const res = NextResponse.next()
        if (systemModeConfig.mode === 'degraded') {
            res.headers.set('x-system-mode', 'degraded')
        }
        return res
    }

    // 3. Always allow public maintenance pages, auth endpoints, and admin portal
    if (
        PUBLIC_PATHS.has(pathname) ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/api/admin/')
    ) {
        return NextResponse.next()
    }

    // 4. Allow authorized administrators with a cryptographically verified cookie (maint or admin session)
    const maintSecret = process.env.MAINTENANCE_PASSWORD
    const adminSecret = getAdminSecret()

    const hasMaintAuth =
        maintSecret &&
        (await verifySessionToken(request.cookies.get(MAINT_COOKIE)?.value, maintSecret))
    const hasAdminAuth =
        adminSecret &&
        (await verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE)?.value, adminSecret))

    if (hasMaintAuth || hasAdminAuth) {
        return NextResponse.next()
    }

    // 5. API callers get a standard RFC 503 response with Retry-After header
    if (pathname.startsWith('/api/')) {
        return NextResponse.json(
            {
                status: 'error',
                error:
                    systemModeConfig.message ||
                    'Service is temporarily unavailable while maintenance or database synchronization is in progress.',
                mode: 'maintenance',
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

    // 6. All page requests rewrite to the maintenance notice with search-engine protection
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
