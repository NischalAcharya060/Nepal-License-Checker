// src/app/api/user/licenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, ensureUserTables, type UserSavedLicense } from '@/lib/userAuth'
import { getTurso, type LicenseRow } from '@/lib/turso'
import { sanitizeInput } from '@/utils/sanitize'
import { createNotification } from '@/lib/notifications'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LICENSE_REGEX = /^\d{2}-\d{2}-\d{8}$/

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
        }

        await ensureUserTables()
        const db = getTurso()

        const savedRows = await db.execute({
            sql: `SELECT id, user_id, label, license_number, notify_email, created_at, updated_at 
                  FROM user_saved_licenses 
                  WHERE user_id = ? 
                  ORDER BY created_at DESC`,
            args: [user.id],
        })

        if (savedRows.rows.length === 0) {
            return NextResponse.json({ licenses: [] })
        }

        const numbers = savedRows.rows.map((r) => String(r.license_number))
        const placeholders = numbers.map(() => '?').join(',')

        // Fetch matched printed records from licenses table in batch
        const printedRes = await db.execute({
            sql: `SELECT license_number, holder_name, office, category 
                  FROM licenses 
                  WHERE license_number IN (${placeholders})`,
            args: numbers,
        })

        const printedMap = new Map<string, LicenseRow>()
        for (const row of printedRes.rows) {
            printedMap.set(String(row.license_number), row as unknown as LicenseRow)
        }

        const licenses: UserSavedLicense[] = savedRows.rows.map((r) => {
            const num = String(r.license_number)
            const matched = printedMap.get(num)
            return {
                id: String(r.id),
                user_id: String(r.user_id),
                label: String(r.label),
                license_number: num,
                notify_email: Boolean(r.notify_email),
                created_at: Number(r.created_at),
                updated_at: Number(r.updated_at),
                holder_name: matched ? matched.holder_name : null,
                office: matched ? matched.office : null,
                category: matched ? matched.category : null,
                status: matched ? 'ready' : 'not_printed',
            }
        })

        return NextResponse.json({ licenses })
    } catch (err: unknown) {
        console.error('[API user/licenses GET] Error:', err)
        return NextResponse.json({ error: 'Failed to retrieve saved licenses.' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
        }

        await ensureUserTables()
        const body = await request.json().catch(() => ({}))
        const rawNumber = sanitizeInput(String(body.license_number || '')).toUpperCase()
        const rawLabel = String(body.label || '').trim()
        const notifyEmail = body.notify_email !== false // default true

        if (!rawNumber) {
            return NextResponse.json({ error: 'License number is required.' }, { status: 400 })
        }

        if (!LICENSE_REGEX.test(rawNumber)) {
            return NextResponse.json(
                { error: 'Invalid license format. Expected XX-XX-XXXXXXXX (e.g. 01-06-12345678).' },
                { status: 400 }
            )
        }

        const label = rawLabel || 'My License'
        const db = getTurso()

        // Check if already saved by this user
        const existing = await db.execute({
            sql: `SELECT id FROM user_saved_licenses WHERE user_id = ? AND license_number = ? LIMIT 1`,
            args: [user.id, rawNumber],
        })

        if (existing.rows.length > 0) {
            return NextResponse.json(
                { error: 'This license number is already in your saved list.' },
                { status: 409 }
            )
        }

        const id = `lic_${crypto.randomUUID()}`
        const now = Date.now()

        await db.execute({
            sql: `INSERT INTO user_saved_licenses (id, user_id, label, license_number, notify_email, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [id, user.id, label, rawNumber, notifyEmail ? 1 : 0, now, now],
        })

        // Also check if license is printed or if we should register email alert
        const printedCheck = await db.execute({
            sql: `SELECT license_number, holder_name, office, category FROM licenses WHERE license_number = ? LIMIT 1`,
            args: [rawNumber],
        })

        const matched = printedCheck.rows.length > 0 ? (printedCheck.rows[0] as unknown as LicenseRow) : null

        // If not printed yet and notifyEmail is true, subscribe to notification automatically
        if (!matched && notifyEmail) {
            createNotification({
                licenseNumber: rawNumber,
                email: user.email,
            }).catch((err) => console.error('[UserLicenses] Error creating notification alert:', err))
        }

        const createdItem: UserSavedLicense = {
            id,
            user_id: user.id,
            label,
            license_number: rawNumber,
            notify_email: notifyEmail,
            created_at: now,
            updated_at: now,
            holder_name: matched ? matched.holder_name : null,
            office: matched ? matched.office : null,
            category: matched ? matched.category : null,
            status: matched ? 'ready' : 'not_printed',
        }

        return NextResponse.json({
            success: true,
            license: createdItem,
            message: 'License successfully added to your dashboard.',
        })
    } catch (err: unknown) {
        console.error('[API user/licenses POST] Error:', err)
        return NextResponse.json({ error: 'Failed to save license.' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        let id = searchParams.get('id')

        if (!id) {
            const body = await request.json().catch(() => ({}))
            id = body.id
        }

        if (!id) {
            return NextResponse.json({ error: 'License ID is required.' }, { status: 400 })
        }

        await ensureUserTables()
        const db = getTurso()

        await db.execute({
            sql: `DELETE FROM user_saved_licenses WHERE id = ? AND user_id = ?`,
            args: [id, user.id],
        })

        return NextResponse.json({ success: true, message: 'License removed from your saved list.' })
    } catch (err: unknown) {
        console.error('[API user/licenses DELETE] Error:', err)
        return NextResponse.json({ error: 'Failed to delete license.' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        await ensureUserTables()
        const body = await request.json().catch(() => ({}))
        const { id, label, notify_email } = body

        if (!id) {
            return NextResponse.json({ error: 'License ID is required.' }, { status: 400 })
        }

        const db = getTurso()
        const now = Date.now()

        const updates: string[] = ['updated_at = ?']
        const args: (string | number)[] = [now]

        if (typeof label === 'string' && label.trim()) {
            updates.push('label = ?')
            args.push(label.trim())
        }

        if (typeof notify_email === 'boolean') {
            updates.push('notify_email = ?')
            args.push(notify_email ? 1 : 0)
        }

        args.push(id, user.id)

        await db.execute({
            sql: `UPDATE user_saved_licenses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
            args,
        })

        return NextResponse.json({ success: true, message: 'License updated successfully.' })
    } catch (err: unknown) {
        console.error('[API user/licenses PATCH] Error:', err)
        return NextResponse.json({ error: 'Failed to update license.' }, { status: 500 })
    }
}
