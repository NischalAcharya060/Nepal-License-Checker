// src/app/api/developer/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    DEV_SESSION_COOKIE,
    verifyDeveloperSessionToken,
    ensureDeveloperTables,
    type DeveloperProfile,
} from '@/lib/developerAuth'
import { getTurso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const sessionToken = request.cookies.get(DEV_SESSION_COOKIE)?.value
    const session = await verifyDeveloperSessionToken(sessionToken)

    if (!session) {
        return NextResponse.json({ authenticated: false, developer: null })
    }

    try {
        await ensureDeveloperTables()
        const db = getTurso()
        const result = await db.execute({
            sql: `SELECT id, github_id, username, name, email, avatar_url, created_at, updated_at
                  FROM developers WHERE id = ? LIMIT 1`,
            args: [session.id],
        })

        if (!result.rows.length) {
            return NextResponse.json({ authenticated: false, developer: null })
        }

        const row = result.rows[0]
        const developer: DeveloperProfile = {
            id: String(row.id),
            github_id: Number(row.github_id),
            username: String(row.username),
            name: row.name ? String(row.name) : null,
            email: row.email ? String(row.email) : null,
            avatar_url: row.avatar_url ? String(row.avatar_url) : null,
            created_at: Number(row.created_at),
            updated_at: Number(row.updated_at),
        }

        return NextResponse.json({ authenticated: true, developer })
    } catch (error) {
        console.error('Error fetching developer profile:', error)
        return NextResponse.json({ authenticated: false, error: 'Failed to fetch profile' }, { status: 500 })
    }
}
