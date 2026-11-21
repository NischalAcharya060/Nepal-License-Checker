// src/app/api/user/licenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, ensureUserTables, type UserSavedLicense } from '@/lib/userAuth'
import { getTurso, type LicenseRow } from '@/lib/turso'
import { sanitizeInput } from '@/utils/sanitize'
import { createNotification, cancelNotification } from '@/lib/notifications'
import { sendSubscriptionConfirmationEmail } from '@/lib/email'
import { logSearch } from '@/lib/searchLogger'
import { extractGeo } from '@/lib/geo'
import { dashboardUserRateLimiter } from '@/lib/rateLimit'
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

        const isRefresh = request.nextUrl.searchParams.get('refresh') === 'true'
        if (isRefresh) {
            const rateStatus = dashboardUserRateLimiter.checkLimit(`user_${user.id}`)
            if (!rateStatus.allowed) {
                const minutes = Math.ceil(rateStatus.retryAfter / 60)
                const hours = Math.floor(rateStatus.retryAfter / 3600)
                const waitMsg =
                    hours >= 1
                        ? `${hours} hour${hours > 1 ? 's' : ''}`
                        : minutes > 1
                        ? `${minutes} minutes`
                        : `${rateStatus.retryAfter} seconds`
                return NextResponse.json(
                    {
                        status: 'error',
                        code: 'RATE_LIMIT_EXCEEDED',
                        error: `Rate limit reached. You can refresh up to 5 times per 5 minutes. Please wait ${waitMsg} before refreshing again.`,
                        retryAfter: rateStatus.retryAfter,
                    },
                    {
                        status: 429,
                        headers: {
                            'Retry-After': String(rateStatus.retryAfter),
                            'Cache-Control': 'no-store, no-cache',
                        },
                    }
                )
            }
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

        // If not printed yet and notifyEmail is true, subscribe to notification and send welcome confirmation email
        if (!matched && notifyEmail) {
            createNotification({
                licenseNumber: rawNumber,
                email: user.email,
            }).then(async (notifResult) => {
                if (notifResult && notifResult.unsubscribeToken) {
                    try {
                        const sendRes = await sendSubscriptionConfirmationEmail({
                            to: user.email,
                            licenseNumber: rawNumber,
                            unsubscribeToken: notifResult.unsubscribeToken,
                            isResend: notifResult.status === 'already_subscribed',
                        })
                        if (sendRes.success && notifResult.id) {
                            await db.execute({
                                sql: `UPDATE license_notifications SET confirmation_sent_at = ? WHERE id = ?`,
                                args: [Date.now(), notifResult.id],
                            }).catch(() => {})
                        }
                    } catch (emailErr) {
                        console.error('[UserLicenses] Error sending welcome subscription email:', emailErr)
                    }
                }
            }).catch((err) => console.error('[UserLicenses] Error creating notification alert:', err))
        }

        // Log this search into admin search queries
        const geo = extractGeo(request)
        logSearch({
            license_number: rawNumber,
            status: matched ? 'found' : 'not_found',
            holder_name: matched ? matched.holder_name : undefined,
            office: matched ? matched.office : undefined,
            category: matched ? matched.category : undefined,
            ip: geo.ip,
            country: geo.country,
            city: geo.city,
            region: geo.region,
            user_agent: request.headers.get('user-agent'),
            source: 'dashboard',
        }).catch(() => {})

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

        // Fetch license_number before deletion to cancel any active alerts
        const toDeleteRes = await db.execute({
            sql: `SELECT license_number FROM user_saved_licenses WHERE id = ? AND user_id = ? LIMIT 1`,
            args: [id, user.id],
        })

        if (toDeleteRes.rows.length > 0) {
            const targetLic = toDeleteRes.rows[0] as unknown as { license_number: string }
            cancelNotification({
                licenseNumber: targetLic.license_number,
                email: user.email,
            }).catch(() => {})
        }

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

        // Fetch license to verify ownership and obtain license_number
        const existingRes = await db.execute({
            sql: `SELECT license_number, notify_email FROM user_saved_licenses WHERE id = ? AND user_id = ? LIMIT 1`,
            args: [id, user.id],
        })

        if (existingRes.rows.length === 0) {
            return NextResponse.json({ error: 'License not found in your vault.' }, { status: 404 })
        }

        const existingRecord = existingRes.rows[0] as unknown as { license_number: string; notify_email: number }
        const licNum = existingRecord.license_number

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

        // Synchronize with license_notifications and send confirmation email if subscribing
        if (typeof notify_email === 'boolean') {
            if (notify_email) {
                // Subscribe & send welcome confirmation email
                createNotification({
                    licenseNumber: licNum,
                    email: user.email,
                }).then(async (notifResult) => {
                    if (notifResult && notifResult.unsubscribeToken) {
                        try {
                            const sendRes = await sendSubscriptionConfirmationEmail({
                                to: user.email,
                                licenseNumber: licNum,
                                unsubscribeToken: notifResult.unsubscribeToken,
                                isResend: notifResult.status === 'already_subscribed',
                            })
                            if (sendRes.success && notifResult.id) {
                                await db.execute({
                                    sql: `UPDATE license_notifications SET confirmation_sent_at = ? WHERE id = ?`,
                                    args: [Date.now(), notifResult.id],
                                }).catch(() => {})
                            }
                        } catch (emailErr) {
                            console.error('[UserLicenses PATCH] Email error:', emailErr)
                        }
                    }
                }).catch((err) => console.error('[UserLicenses PATCH] Notification error:', err))
            } else {
                // Unsubscribe: cancel pending notification alert
                await cancelNotification({
                    licenseNumber: licNum,
                    email: user.email,
                }).catch((err) => console.error('[UserLicenses PATCH] Cancel notification error:', err))
            }
        }

        return NextResponse.json({
            success: true,
            subscribed: Boolean(notify_email),
            message: notify_email
                ? 'Subscribed to alerts. A welcome confirmation email has been sent.'
                : 'Unsubscribed from automated email alerts.',
        })
    } catch (err: unknown) {
        console.error('[API user/licenses PATCH] Error:', err)
        return NextResponse.json({ error: 'Failed to update license.' }, { status: 500 })
    }
}
