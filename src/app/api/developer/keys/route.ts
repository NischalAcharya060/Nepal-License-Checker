// src/app/api/developer/keys/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    DEV_SESSION_COOKIE,
    verifyDeveloperSessionToken,
    ensureDeveloperTables,
    generateApiKey,
    invalidateApiKeyCache,
    type DeveloperApiKey,
} from '@/lib/developerAuth'
import { getTurso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

const MAX_KEYS_PER_DEVELOPER = 3
const DEFAULT_DEVELOPER_RATE_LIMIT = 60 // 60 requests per minute

/**
 * GET /api/developer/keys
 * Lists all API keys belonging to the logged-in developer.
 */
export async function GET(request: NextRequest) {
    const sessionToken = request.cookies.get(DEV_SESSION_COOKIE)?.value
    const session = await verifyDeveloperSessionToken(sessionToken)

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in with GitHub.' }, { status: 401 })
    }

    try {
        await ensureDeveloperTables()
        const db = getTurso()
        const result = await db.execute({
            sql: `SELECT id, developer_id, key_prefix, name, rate_limit_per_minute, is_active, created_at, last_used_at, COALESCE(total_requests, 0) as total_requests
                  FROM developer_api_keys
                  WHERE developer_id = ?
                  ORDER BY created_at DESC`,
            args: [session.id],
        })

        const keys: DeveloperApiKey[] = result.rows.map((row) => ({
            id: String(row.id),
            developer_id: String(row.developer_id),
            key_prefix: String(row.key_prefix),
            name: String(row.name),
            rate_limit_per_minute: Number(row.rate_limit_per_minute),
            is_active: Boolean(row.is_active),
            created_at: Number(row.created_at),
            last_used_at: row.last_used_at ? Number(row.last_used_at) : null,
            total_requests: Number(row.total_requests) || 0,
        }))

        return NextResponse.json({ keys, maxKeys: MAX_KEYS_PER_DEVELOPER })
    } catch (error) {
        console.error('Error fetching API keys:', error)
        return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }
}

/**
 * POST /api/developer/keys
 * Generates a new API key for the logged-in developer.
 * Returns the raw key once in the response.
 */
export async function POST(request: NextRequest) {
    const sessionToken = request.cookies.get(DEV_SESSION_COOKIE)?.value
    const session = await verifyDeveloperSessionToken(sessionToken)

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in with GitHub.' }, { status: 401 })
    }

    try {
        await ensureDeveloperTables()
        const db = getTurso()

        // 1. Check existing active key count
        const countResult = await db.execute({
            sql: `SELECT COUNT(*) as count FROM developer_api_keys WHERE developer_id = ? AND is_active = 1`,
            args: [session.id],
        })

        const currentActiveCount = Number(countResult.rows[0]?.count) || 0
        if (currentActiveCount >= MAX_KEYS_PER_DEVELOPER) {
            return NextResponse.json(
                {
                    error: `You have reached the maximum limit of ${MAX_KEYS_PER_DEVELOPER} active API keys. Please revoke an unused key before creating a new one.`,
                },
                { status: 400 }
            )
        }

        // 2. Parse optional custom name
        let body: { name?: string } = {}
        try {
            body = await request.json()
        } catch {
            // No body provided
        }

        const rawName = typeof body.name === 'string' ? body.name.trim() : ''
        const keyName = rawName.slice(0, 50) || `API Key #${currentActiveCount + 1}`

        // 3. Generate key
        const { rawKey, keyPrefix, keyHash } = await generateApiKey()
        const keyId = `key_${crypto.randomUUID()}`
        const now = Date.now()

        // 4. Save to database
        await db.execute({
            sql: `INSERT INTO developer_api_keys (id, developer_id, key_prefix, key_hash, name, rate_limit_per_minute, is_active, created_at, last_used_at, total_requests)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)`,
            args: [keyId, session.id, keyPrefix, keyHash, keyName, DEFAULT_DEVELOPER_RATE_LIMIT, 1, now],
        })

        // Invalidate in-memory cache
        invalidateApiKeyCache()

        const createdKey: DeveloperApiKey = {
            id: keyId,
            developer_id: session.id,
            key_prefix: keyPrefix,
            name: keyName,
            rate_limit_per_minute: DEFAULT_DEVELOPER_RATE_LIMIT,
            is_active: true,
            created_at: now,
            last_used_at: null,
            total_requests: 0,
        }

        return NextResponse.json(
            {
                message: 'API key created successfully. Please copy it now; you will not be able to see it again.',
                rawKey,
                key: createdKey,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error creating API key:', error)
        return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }
}
