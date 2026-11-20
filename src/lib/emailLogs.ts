// src/lib/emailLogs.ts
import { getTurso } from './turso'

export interface EmailLogEntry {
    id: string
    recipient: string
    recipient_name?: string | null
    subject: string
    template_type:
        | 'feedback_confirmation'
        | 'feedback_status'
        | 'feedback_tracking'
        | 'license_notification'
        | 'license_subscription'
        | 'user_otp'
        | 'general'
    reference_id?: string | null
    status: 'sent' | 'failed'
    provider: string
    message_id?: string | null
    error_message?: string | null
    snippet?: string | null
    metadata_json?: string | null
    created_at: number
}

/**
 * Ensure email_logs table and indexes exist in Turso SQLite
 */
export async function ensureEmailLogsTable(): Promise<void> {
    const db = getTurso()
    await db.execute(`
        CREATE TABLE IF NOT EXISTS email_logs (
            id TEXT PRIMARY KEY,
            recipient TEXT NOT NULL,
            recipient_name TEXT,
            subject TEXT NOT NULL,
            template_type TEXT NOT NULL,
            reference_id TEXT,
            status TEXT NOT NULL DEFAULT 'sent',
            provider TEXT NOT NULL DEFAULT 'smtp',
            message_id TEXT,
            error_message TEXT,
            snippet TEXT,
            metadata_json TEXT,
            created_at INTEGER NOT NULL
        )
    `)

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_email_logs_reference ON email_logs(reference_id)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC)`)
}

/**
 * Log a sent or failed email event into the database
 */
export async function logSentEmail(params: {
    recipient: string
    recipientName?: string | null
    subject: string
    templateType:
        | 'feedback_confirmation'
        | 'feedback_status'
        | 'feedback_tracking'
        | 'license_notification'
        | 'license_subscription'
        | 'user_otp'
        | 'general'
    referenceId?: string | null
    status: 'sent' | 'failed'
    provider: string
    messageId?: string | null
    errorMessage?: string | null
    snippet?: string | null
    metadata?: Record<string, unknown> | null
    createdAt?: number
}): Promise<string | null> {
    try {
        await ensureEmailLogsTable()
        const db = getTurso()
        const id = `eml_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        const createdAt = params.createdAt || Date.now()
        const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null

        await db.execute({
            sql: `INSERT INTO email_logs (
                id, recipient, recipient_name, subject, template_type,
                reference_id, status, provider, message_id, error_message,
                snippet, metadata_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                params.recipient.toLowerCase().trim(),
                params.recipientName || null,
                params.subject,
                params.templateType,
                params.referenceId || null,
                params.status,
                params.provider,
                params.messageId || null,
                params.errorMessage || null,
                params.snippet || null,
                metadataJson,
                createdAt,
            ],
        })
        return id
    } catch (err) {
        console.error('[EmailLogs] Failed to log sent email:', err)
        return null
    }
}

/**
 * Retrieve all previous emails sent to a particular user email or ticket reference
 */
export async function getEmailLogsForRecipient(params: {
    email?: string | null
    ticketId?: string | null
}): Promise<EmailLogEntry[]> {
    try {
        await ensureEmailLogsTable()
        const db = getTurso()
        const cleanEmail = params.email?.toLowerCase().trim()
        const cleanTicketId = params.ticketId?.trim()

        if (!cleanEmail && !cleanTicketId) {
            return []
        }

        const conditions: string[] = []
        const args: (string | number)[] = []

        if (cleanEmail && cleanTicketId) {
            conditions.push('(recipient = ? OR reference_id = ?)')
            args.push(cleanEmail, cleanTicketId)
        } else if (cleanEmail) {
            conditions.push('recipient = ?')
            args.push(cleanEmail)
        } else if (cleanTicketId) {
            conditions.push('reference_id = ?')
            args.push(cleanTicketId)
        }

        const result = await db.execute({
            sql: `SELECT * FROM email_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 100`,
            args,
        })

        const logs: EmailLogEntry[] = (result.rows as unknown as EmailLogEntry[]).map((row) => ({
            id: String(row.id),
            recipient: String(row.recipient),
            recipient_name: row.recipient_name ? String(row.recipient_name) : null,
            subject: String(row.subject),
            template_type: String(row.template_type) as EmailLogEntry['template_type'],
            reference_id: row.reference_id ? String(row.reference_id) : null,
            status: String(row.status) as 'sent' | 'failed',
            provider: String(row.provider),
            message_id: row.message_id ? String(row.message_id) : null,
            error_message: row.error_message ? String(row.error_message) : null,
            snippet: row.snippet ? String(row.snippet) : null,
            metadata_json: row.metadata_json ? String(row.metadata_json) : null,
            created_at: Number(row.created_at),
        }))

        // Also query license_notifications for any license ready alerts sent to this user email
        if (cleanEmail) {
            try {
                const notifResult = await db.execute({
                    sql: `SELECT id, license_number, email, status, sent_at, created_at FROM license_notifications WHERE LOWER(email) = ? AND status = 'sent' ORDER BY sent_at DESC LIMIT 20`,
                    args: [cleanEmail],
                })

                for (const notifRow of notifResult.rows) {
                    const sentAt = Number(notifRow.sent_at) || Number(notifRow.created_at)
                    logs.push({
                        id: `lic_notif_${notifRow.id}`,
                        recipient: cleanEmail,
                        recipient_name: null,
                        subject: `Smart License Card Ready for Collection: ${notifRow.license_number}`,
                        template_type: 'license_notification',
                        reference_id: String(notifRow.license_number),
                        status: 'sent',
                        provider: 'system',
                        message_id: null,
                        error_message: null,
                        snippet: `Automatic license ready alert sent for license card #${notifRow.license_number}`,
                        metadata_json: JSON.stringify({ license_number: notifRow.license_number }),
                        created_at: sentAt,
                    })
                }
            } catch {
                // Table might not exist yet
            }
        }

        // If no records in email_logs yet (e.g. newly added table), synthesize historical events from user_feedbacks
        if (logs.length === 0 && cleanTicketId) {
            try {
                const fbResult = await db.execute({
                    sql: `SELECT * FROM user_feedbacks WHERE id = ? LIMIT 1`,
                    args: [cleanTicketId],
                })
                if (fbResult.rows.length > 0) {
                    const fb = fbResult.rows[0]
                    logs.push({
                        id: `synth_init_${fb.id}`,
                        recipient: String(fb.email),
                        recipient_name: String(fb.name),
                        subject: `Inquiry Received [${fb.subject}] - Nepal License Checker`,
                        template_type: 'feedback_confirmation',
                        reference_id: String(fb.id),
                        status: 'sent',
                        provider: 'system',
                        snippet: String(fb.message).slice(0, 150),
                        created_at: Number(fb.created_at),
                    })

                    if (fb.admin_notes && Number(fb.updated_at) > Number(fb.created_at)) {
                        logs.push({
                            id: `synth_reply_${fb.id}`,
                            recipient: String(fb.email),
                            recipient_name: String(fb.name),
                            subject: `Update on your inquiry [${fb.subject}] - Nepal License Checker`,
                            template_type: 'feedback_status',
                            reference_id: String(fb.id),
                            status: 'sent',
                            provider: 'system',
                            snippet: String(fb.admin_notes).slice(0, 150),
                            created_at: Number(fb.updated_at),
                        })
                    }
                }
            } catch {
                // Ignore
            }
        }

        // Sort descending by created_at
        logs.sort((a, b) => b.created_at - a.created_at)

        return logs
    } catch (err) {
        console.error('[EmailLogs] Failed to fetch email logs:', err)
        return []
    }
}
