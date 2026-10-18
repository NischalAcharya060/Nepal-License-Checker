// src/app/api/developer/keys/[id]/route.ts
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

/**
 * DELETE /api/developer/keys/[id]
 * Revokes an API key belonging to the logged-in developer.
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    const sessionToken = request.cookies.get(DEV_SESSION_COOKIE)?.value
    const session = await verifyDeveloperSessionToken(sessionToken)

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in with GitHub.' }, { status: 401 })
    }

    if (!id) {
        return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    try {
        await ensureDeveloperTables()
        const db = getTurso()

        // Verify key ownership and delete
        const result = await db.execute({
            sql: `DELETE FROM developer_api_keys WHERE id = ? AND developer_id = ?`,
            args: [id, session.id],
        })

        if (result.rowsAffected === 0) {
            return NextResponse.json({ error: 'API key not found or already deleted' }, { status: 404 })
        }

        invalidateApiKeyCache()

        return NextResponse.json({ success: true, message: 'API key revoked successfully' })
    } catch (error) {
        console.error('Error revoking API key:', error)
        return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
    }
}

/**
 * PATCH /api/developer/keys/[id]
 * Renames an existing API key.
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    const sessionToken = request.cookies.get(DEV_SESSION_COOKIE)?.value
    const session = await verifyDeveloperSessionToken(sessionToken)

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in with GitHub.' }, { status: 401 })
    }

    if (!id) {
        return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    try {
        const body = await request.json()
        const rawName = typeof body.name === 'string' ? body.name.trim() : ''
        const trimmedName = rawName.slice(0, 50)

        if (!trimmedName) {
            return NextResponse.json({ error: 'Key name cannot be empty' }, { status: 400 })
        }

        await ensureDeveloperTables()
        const db = getTurso()

        const result = await db.execute({
            sql: `UPDATE developer_api_keys SET name = ? WHERE id = ? AND developer_id = ?`,
            args: [trimmedName, id, session.id],
        })

        if (result.rowsAffected === 0) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 })
        }

        invalidateApiKeyCache()

        return NextResponse.json({ success: true, name: trimmedName })
    } catch (error) {
        console.error('Error renaming API key:', error)
        return NextResponse.json({ error: 'Failed to rename API key' }, { status: 500 })
    }
}

/**
 * POST /api/developer/keys/[id]
 * Rotates / rolls the raw API key secret for an existing key, preserving its name and history.
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    const sessionToken = request.cookies.get(DEV_SESSION_COOKIE)?.value
    const session = await verifyDeveloperSessionToken(sessionToken)

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in with GitHub.' }, { status: 401 })
    }

    if (!id) {
        return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    try {
        await ensureDeveloperTables()
        const db = getTurso()

        // Verify key exists and belongs to developer
        const existing = await db.execute({
            sql: `SELECT id, name, rate_limit_per_minute, is_active, created_at, last_used_at, COALESCE(total_requests, 0) as total_requests
                  FROM developer_api_keys WHERE id = ? AND developer_id = ? LIMIT 1`,
            args: [id, session.id],
        })

        if (!existing.rows.length) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 })
        }

        const row = existing.rows[0]

        if (!Boolean(row.is_active)) {
            return NextResponse.json(
                { error: 'Cannot rotate a suspended API key. Please contact support or request reactivation.' },
                { status: 403 }
            )
        }

        // Generate new key cryptographic credentials
        const { rawKey, keyPrefix, keyHash } = await generateApiKey()

        // Update prefix and hash in database
        await db.execute({
            sql: `UPDATE developer_api_keys SET key_prefix = ?, key_hash = ? WHERE id = ? AND developer_id = ?`,
            args: [keyPrefix, keyHash, id, session.id],
        })

        // Invalidate in-memory cache so old key stops working immediately
        invalidateApiKeyCache()

        const updatedKey: DeveloperApiKey = {
            id,
            developer_id: session.id,
            key_prefix: keyPrefix,
            name: String(row.name),
            rate_limit_per_minute: Number(row.rate_limit_per_minute),
            is_active: Boolean(row.is_active),
            created_at: Number(row.created_at),
            last_used_at: row.last_used_at ? Number(row.last_used_at) : null,
            total_requests: Number(row.total_requests) || 0,
        }

        return NextResponse.json({
            success: true,
            message: 'API key rotated successfully. Please copy your new key now.',
            rawKey,
            key: updatedKey,
        })
    } catch (error) {
        console.error('Error rotating API key:', error)
        return NextResponse.json({ error: 'Failed to rotate API key' }, { status: 500 })
    }
}
