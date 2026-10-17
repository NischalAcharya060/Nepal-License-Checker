// src/app/api/developer/keys/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    DEV_SESSION_COOKIE,
    verifyDeveloperSessionToken,
    ensureDeveloperTables,
    invalidateApiKeyCache,
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

        // Verify key ownership and delete or deactivate
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
