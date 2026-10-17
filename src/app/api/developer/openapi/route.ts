// src/app/api/developer/openapi/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSiteUrl } from '@/lib/siteUrl'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const siteUrl = getSiteUrl()
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format')
    const download = searchParams.get('download')

    if (format === 'postman') {
        const postmanCollection = {
            info: {
                name: 'Nepal License Checker API',
                description: 'Official Postman Collection for Nepal Driving License Verification API.',
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            },
            item: [
                {
                    name: 'Check License Status',
                    request: {
                        method: 'GET',
                        header: [
                            {
                                key: 'x-api-key',
                                value: '{{API_KEY}}',
                                description: 'Developer API key for elevated 60 req/min limits',
                            },
                            {
                                key: 'Accept',
                                value: 'application/json',
                            },
                        ],
                        url: {
                            raw: `${siteUrl}/api/license?number=01-01-12345678`,
                            protocol: siteUrl.startsWith('https') ? 'https' : 'http',
                            host: siteUrl.replace(/^https?:\/\//, '').split('/'),
                            path: ['api', 'license'],
                            query: [
                                {
                                    key: 'number',
                                    value: '01-01-12345678',
                                    description: 'License number in XX-XX-XXXXXXXX or Devanagari digits',
                                },
                            ],
                        },
                    },
                },
            ],
            variable: [
                {
                    key: 'BASE_URL',
                    value: siteUrl,
                },
                {
                    key: 'API_KEY',
                    value: 'nlc_live_your_api_key_here',
                },
            ],
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json; charset=utf-8',
        }
        if (download) {
            headers['Content-Disposition'] = 'attachment; filename="nepal-license-checker-postman.json"'
        }
        return NextResponse.json(postmanCollection, { headers })
    }

    const openApiSpec = {
        openapi: '3.1.0',
        info: {
            title: 'Nepal Driving License Verification API',
            version: '1.1.0',
            description:
                'Official zero-dependency REST API to query smart card driving license print status via the mirrored Department of Transport Management (DOTM) database in Nepal.',
            contact: {
                name: 'Nischal Acharya',
                url: 'https://acharyanischal.com.np',
            },
        },
        servers: [
            {
                url: siteUrl,
                description: 'Official API Endpoint',
            },
        ],
        paths: {
            '/api/license': {
                get: {
                    summary: 'Check Driving License Print Status',
                    description:
                        'Queries the mirrored DOTM database for smart driving license print status. Returns licensee details when printed, or null when awaiting print.',
                    operationId: 'checkLicense',
                    parameters: [
                        {
                            name: 'number',
                            in: 'query',
                            required: true,
                            description:
                                'License number in standard format XX-XX-XXXXXXXX or Devanagari numerals (e.g. 01-01-12345678 or ०१-०१-१२३४५६७८)',
                            schema: {
                                type: 'string',
                                example: '01-01-12345678',
                            },
                        },
                    ],
                    security: [{}, { ApiKeyAuth: [] }, { BearerAuth: [] }],
                    responses: {
                        '200': {
                            description: 'License query successful',
                            headers: {
                                'X-RateLimit-Limit': {
                                    description: 'Total request quota within sliding window (60 for developers, 15 for public)',
                                    schema: { type: 'integer', example: 60 },
                                },
                                'X-RateLimit-Remaining': {
                                    description: 'Remaining requests allowed before throttling',
                                    schema: { type: 'integer', example: 58 },
                                },
                                'X-RateLimit-Reset': {
                                    description: 'Unix timestamp when rate limit resets',
                                    schema: { type: 'integer', example: 1760688000 },
                                },
                            },
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            status: { type: 'string', example: 'success' },
                                            source: { type: 'string', example: 'database' },
                                            data: {
                                                type: 'object',
                                                nullable: true,
                                                properties: {
                                                    holder_name: { type: 'string', example: 'RAM BAHADUR THAPA' },
                                                    license_number: { type: 'string', example: '01-01-12345678' },
                                                    office: { type: 'string', example: 'Ekantakuna, Lalitpur' },
                                                    category: { type: 'string', example: 'A, B' },
                                                    createdAt: { type: 'string', format: 'date-time' },
                                                    updatedAt: { type: 'string', format: 'date-time' },
                                                },
                                            },
                                            message: { type: 'string', example: 'License not found in printed records' },
                                        },
                                    },
                                },
                            },
                        },
                        '400': { description: 'Missing or invalid license number format' },
                        '401': { description: 'Invalid, revoked, or inactive developer API key' },
                        '429': { description: 'Rate limit exceeded (with Retry-After header)' },
                        '500': { description: 'Internal server error' },
                    },
                },
            },
        },
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description: 'Developer API key for elevated 60 req/min limits',
                },
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    description: 'Bearer authentication using your developer API key',
                },
            },
        },
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json; charset=utf-8',
    }
    if (download) {
        headers['Content-Disposition'] = 'attachment; filename="nepal-license-checker-openapi.json"'
    }

    return NextResponse.json(openApiSpec, { headers })
}
