const nextConfig = {
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
        ];
    },
}

export default nextConfig;
