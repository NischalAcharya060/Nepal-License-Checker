// Set NEXT_PUBLIC_MAINTENANCE=1 to temporarily serve /maintenance at the root.
// beforeFiles runs ahead of the filesystem, so this wins over src/app/page.tsx.
// /maintenance itself stays reachable, and /api/* is untouched so the page can
// poll /api/meta and detect when the database is back.
const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE === '1'

const nextConfig = {
    devIndicators: false,
    async rewrites() {
        if (!maintenanceMode) return []
        return {
            beforeFiles: [
                { source: '/', destination: '/maintenance' },
            ],
        }
    },
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
                ],
            },
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'geolocation=(), microphone=(), camera=()',
                    },
                ],
            },
            {
                source: '/sitemap.xml',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/xml',
                    },
                ],
            },
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/javascript; charset=utf-8',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                    {
                        key: 'Service-Worker-Allowed',
                        value: '/',
                    },
                ],
            },
            {
                source: '/offline.html',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                ],
            },
            {
                source: '/site.webmanifest',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/manifest+json; charset=utf-8',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=3600',
                    },
                ],
            },
        ];
    },
}

export default nextConfig;
