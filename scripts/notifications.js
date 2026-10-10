// scripts/notifications.js
require('dotenv').config();

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { formatNepalDateTime, formatTimeUntil } = require('./cronHelper');

const LICENSE_REGEX = /^\d{2}-\d{2}-\d{8}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Get base URL for the application
 */
function getAppSiteUrl() {
    const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'license-checker.acharyanischal.com.np';
    const trimmed = raw.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed.replace(/\/+$/, '');
    }
    return `https://${trimmed}`.replace(/\/+$/, '');
}

/**
 * Ensure license_notifications table and indexes exist
 */
async function ensureNotificationsTable(db) {
    if (!db) throw new Error('Database client is required');

    await db.execute(`
        CREATE TABLE IF NOT EXISTS license_notifications (
            id                TEXT PRIMARY KEY,
            license_number    TEXT NOT NULL,
            email             TEXT NOT NULL,
            status            TEXT NOT NULL DEFAULT 'pending',
            unsubscribe_token TEXT NOT NULL UNIQUE,
            created_at        INTEGER NOT NULL,
            updated_at        INTEGER NOT NULL,
            sent_at           INTEGER,
            cancelled_at      INTEGER
        )
    `);

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notifications_status ON license_notifications(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notifications_lic_status ON license_notifications(license_number, status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notifications_email ON license_notifications(email)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notifications_token ON license_notifications(unsubscribe_token)`);

    try {
        await db.execute(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_pending
            ON license_notifications(license_number, email)
            WHERE status = 'pending'
        `);
    } catch {
        // Fallback for older sqlite engines
    }
}

/**
 * Create a new notification subscription
 */
async function createNotification(db, { licenseNumber, email }) {
    await ensureNotificationsTable(db);

    const cleanLicense = (licenseNumber || '').trim().toUpperCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!LICENSE_REGEX.test(cleanLicense)) {
        throw new Error('Invalid license number format. Expected XX-XX-XXXXXXXX.');
    }
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        throw new Error('Please enter a valid email address.');
    }

    // Check if the license is already in printed records
    const checkLicense = await db.execute({
        sql: `SELECT license_number, holder_name, office, category, updated_at FROM licenses WHERE license_number = ? LIMIT 1`,
        args: [cleanLicense],
    });

    if (checkLicense.rows && checkLicense.rows.length > 0) {
        const found = checkLicense.rows[0];
        return {
            status: 'already_printed',
            message: 'Good news! This license record is already printed in DoTM records.',
            license: {
                license_number: found.license_number,
                holder_name: found.holder_name,
                office: found.office,
                category: found.category,
                updatedAt: found.updated_at,
            },
        };
    }

    // Check if an active subscription already exists
    const checkActive = await db.execute({
        sql: `SELECT id, unsubscribe_token FROM license_notifications WHERE license_number = ? AND email = ? AND status = 'pending' LIMIT 1`,
        args: [cleanLicense, cleanEmail],
    });

    if (checkActive.rows && checkActive.rows.length > 0) {
        const existing = checkActive.rows[0];
        return {
            status: 'already_subscribed',
            message: 'You are already registered to receive notifications for this license number.',
            unsubscribeToken: existing.unsubscribe_token,
        };
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const unsubscribeToken = crypto.randomBytes(24).toString('hex');
    const now = Date.now();

    await db.execute({
        sql: `INSERT INTO license_notifications (id, license_number, email, status, unsubscribe_token, created_at, updated_at)
              VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
        args: [id, cleanLicense, cleanEmail, unsubscribeToken, now, now],
    });

    return {
        status: 'success',
        message: 'Notification subscription registered successfully.',
        id,
        licenseNumber: cleanLicense,
        email: cleanEmail,
        unsubscribeToken,
    };
}

/**
 * Cancel a notification subscription by token or license+email
 */
async function cancelNotification(db, { token, licenseNumber, email }) {
    await ensureNotificationsTable(db);
    const now = Date.now();

    if (token) {
        const cleanToken = token.trim();
        const res = await db.execute({
            sql: `SELECT id, license_number, email, status FROM license_notifications WHERE unsubscribe_token = ? LIMIT 1`,
            args: [cleanToken],
        });

        if (!res.rows || res.rows.length === 0) {
            return {
                status: 'not_found',
                message: 'No subscription found for this link or token is invalid.',
            };
        }

        const row = res.rows[0];
        if (row.status === 'cancelled') {
            return {
                status: 'already_cancelled',
                message: 'This notification has already been cancelled.',
                licenseNumber: row.license_number,
            };
        }

        if (row.status === 'sent') {
            return {
                status: 'already_sent',
                message: 'This notification has already been sent.',
                licenseNumber: row.license_number,
            };
        }

        await db.execute({
            sql: `UPDATE license_notifications SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?`,
            args: [now, now, row.id],
        });

        return {
            status: 'success',
            message: `Notification for license ${row.license_number} has been successfully cancelled.`,
            licenseNumber: row.license_number,
            email: row.email,
        };
    }

    if (licenseNumber && email) {
        const cleanLicense = licenseNumber.trim().toUpperCase();
        const cleanEmail = email.trim().toLowerCase();

        const res = await db.execute({
            sql: `UPDATE license_notifications SET status = 'cancelled', cancelled_at = ?, updated_at = ?
                  WHERE license_number = ? AND email = ? AND status = 'pending'`,
            args: [now, now, cleanLicense, cleanEmail],
        });

        const affected = res.rowsAffected || 0;
        if (affected === 0) {
            return {
                status: 'not_found',
                message: 'No active notification found matching this license and email.',
            };
        }

        return {
            status: 'success',
            message: `Successfully cancelled notification for license ${cleanLicense}.`,
            licenseNumber: cleanLicense,
            email: cleanEmail,
        };
    }

    throw new Error('Either token or both licenseNumber and email are required to cancel.');
}

/**
 * Look up subscription by unsubscribe token
 */
async function getNotificationByToken(db, token) {
    if (!token) return null;
    await ensureNotificationsTable(db);

    const res = await db.execute({
        sql: `SELECT id, license_number, email, status, created_at, sent_at, cancelled_at
              FROM license_notifications WHERE unsubscribe_token = ? LIMIT 1`,
        args: [token.trim()],
    });

    if (!res.rows || res.rows.length === 0) return null;
    return res.rows[0];
}

/**
 * Mask an email address for privacy (e.g. j***e@gmail.com)
 */
function maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [user, domain] = email.split('@');
    if (user.length <= 2) {
        return `${user[0]}*@${domain}`;
    }
    return `${user[0]}${'*'.repeat(Math.max(1, user.length - 2))}${user[user.length - 1]}@${domain}`;
}

/**
 * Generate HTML email template
 */
function generateNotificationEmailHtml({
    licenseNumber,
    holderName,
    office,
    category,
    unsubscribeToken,
    siteUrl,
}) {
    const checkUrl = `${siteUrl}/?number=${encodeURIComponent(licenseNumber)}`;
    const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Nepal Driving License is Printed & Ready to Collect!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f6f9; color: #1f2937; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
    .header { background: linear-gradient(135deg, #003893 0%, #001f52 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .flag-badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 800; line-height: 1.3; }
    .header p { margin: 0; font-size: 14px; color: rgba(255,255,255,0.9); }
    .content { padding: 28px 24px; }
    .status-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center; }
    .status-card .tag { color: #065f46; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .status-card .status-text { color: #047857; font-size: 18px; font-weight: 800; margin-top: 4px; }
    .table-container { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
    .data-row { display: flex; border-bottom: 1px solid #e5e7eb; padding: 12px 16px; }
    .data-row:last-child { border-bottom: none; }
    .data-label { width: 40%; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6b7280; }
    .data-val { width: 60%; font-size: 14px; font-weight: 600; color: #111827; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .instructions { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .instructions h4 { margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #1e40af; }
    .instructions ul { margin: 0; padding-left: 20px; font-size: 13px; color: #1e3a8a; line-height: 1.6; }
    .cta-btn { display: block; text-align: center; background: #003893; color: #ffffff !important; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; margin-bottom: 20px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 24px; font-size: 11px; color: #6b7280; text-align: center; line-height: 1.6; }
    .footer a { color: #003893; text-decoration: underline; }
    .disclaimer { font-size: 10px; color: #9ca3af; margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="flag-badge">🇳🇵 Nepal License Verification</div>
      <h1>Good News! Your License is Ready</h1>
      <p>यातायात व्यवस्था विभाग (DoTM) को पछिल्लो अभिलेखमा तपाईंको लाइसेन्स छापिएको भेटिएको छ।</p>
    </div>

    <div class="content">
      <div class="status-card">
        <div class="tag">DoTM Print Status</div>
        <div class="status-text">✓ PRINTED &amp; READY FOR COLLECTION</div>
      </div>

      <div class="table-container">
        <div class="data-row">
          <div class="data-label">License Number</div>
          <div class="data-val mono"><strong>${licenseNumber}</strong></div>
        </div>
        <div class="data-row">
          <div class="data-label">Holder Name</div>
          <div class="data-val">${holderName}</div>
        </div>
        <div class="data-row">
          <div class="data-label">Issuing Office</div>
          <div class="data-val">${office}</div>
        </div>
        <div class="data-row">
          <div class="data-label">Vehicle Category</div>
          <div class="data-val mono">${category}</div>
        </div>
      </div>

      <div class="instructions">
        <h4>📋 Mandatory Documents to Bring When Collecting:</h4>
        <ul>
          <li>Original Nepali Citizenship Certificate (सक्कल नागरिकता)</li>
          <li>Original Revenue / Payment Voucher (राजस्व तिरेको सक्कल रसिद)</li>
          <li>Previous Driving License card (if renewal or category addition)</li>
        </ul>
      </div>

      <a href="${checkUrl}" class="cta-btn" target="_blank" rel="noopener">
        View Official Print Slip Online →
      </a>

      <p style="font-size: 12px; color: #4b5563; text-align: center; margin: 0;">
        You can generate and print your official verification reference slip directly on Nepal License Checker.
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">
        This email was sent to you because you requested an alert when license <strong>${licenseNumber}</strong> was printed.
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeUrl}">Cancel or Unsubscribe from this alert</a> · <a href="${siteUrl}">Visit Nepal License Checker</a>
      </p>
      <div class="disclaimer">
        ⚠️ Notice: Nepal License Checker is an independent public utility portal indexing publicly published data from dotm.gov.np. This notification is purely informational and holds no legal authority. It cannot be presented as a driving license to traffic police or law enforcement.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send an email notification for an available license record
 */
async function sendAvailableLicenseEmail({
    to,
    licenseNumber,
    holderName,
    office,
    category,
    unsubscribeToken,
}) {
    const siteUrl = getAppSiteUrl();
    const html = generateNotificationEmailHtml({
        licenseNumber,
        holderName,
        office,
        category,
        unsubscribeToken,
        siteUrl,
    });

    const checkUrl = `${siteUrl}/?number=${encodeURIComponent(licenseNumber)}`;
    const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

    const text = `🇳🇵 Nepal Smart Driving License Update\n\n` +
        `Good news! Your driving license record has been published by the Department of Transport Management (DoTM).\n\n` +
        `Status: PRINTED & READY FOR COLLECTION\n` +
        `License Number: ${licenseNumber}\n` +
        `Holder Name: ${holderName}\n` +
        `Issuing Office: ${office}\n` +
        `Category: ${category}\n\n` +
        `Mandatory Documents to Collect:\n` +
        `1. Original Nepali Citizenship Card\n` +
        `2. Original Revenue Payment Voucher\n` +
        `3. Old Driving License (if renewal or addition)\n\n` +
        `View print status slip online: ${checkUrl}\n\n` +
        `To unsubscribe or cancel this notification: ${unsubscribeUrl}\n\n` +
        `--- \n` +
        `Nepal License Checker (license-checker.acharyanischal.com.np)`;

    const subject = `Your Nepal Driving License (${licenseNumber}) is Printed & Ready to Collect! 🇳🇵`;
    const defaultSender = 'Nepal License Checker <notifications@acharyanischal.com.np>';
    const fromAddress = process.env.SMTP_FROM || defaultSender;

    // 1. Resend API (HTTP REST)
    if (process.env.RESEND_API_KEY) {
        const payload = {
            from: fromAddress.includes('<') ? fromAddress : `Nepal License Checker <${fromAddress}>`,
            to: [to],
            subject,
            html,
            text,
        };

        const res = await axios.post('https://api.resend.com/emails', payload, {
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });

        return { success: true, provider: 'resend', id: res.data?.id };
    }

    // 2. SMTP with Nodemailer (Supports direct Gmail SMTP, Brevo, SendGrid, Amazon SES, etc.)
    if (process.env.SMTP_HOST || process.env.SMTP_SERVICE) {
        const isGmail = process.env.SMTP_SERVICE === 'gmail' || (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail'));
        const rawPass = process.env.SMTP_PASS ? String(process.env.SMTP_PASS).trim() : '';
        // If Gmail App Password, strip any spaces (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
        const cleanPass = isGmail ? rawPass.replace(/\s+/g, '') : rawPass;
        const port = Number(process.env.SMTP_PORT) || (isGmail ? 465 : 587);

        const transportConfig = (process.env.SMTP_SERVICE === 'gmail' && !process.env.SMTP_HOST)
            ? {
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: cleanPass,
                },
            }
            : {
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port,
                secure: port === 465,
                auth: process.env.SMTP_USER ? {
                    user: process.env.SMTP_USER,
                    pass: cleanPass,
                } : undefined,
            };

        const transporter = nodemailer.createTransport(transportConfig);

        const info = await transporter.sendMail({
            from: fromAddress,
            to,
            subject,
            html,
            text,
        });

        return { success: true, provider: isGmail ? 'gmail' : 'smtp', messageId: info.messageId };
    }

    // 3. Fallback: Local / Testing simulation mode (prevents crashes when no mail server is set up yet)
    console.log(`\n======================================================`);
    console.log(`[EMAIL NOTIFICATION SIMULATION] (No RESEND_API_KEY or SMTP_HOST configured)`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`License: ${licenseNumber} (${holderName})`);
    console.log(`Check URL: ${checkUrl}`);
    console.log(`Unsubscribe URL: ${unsubscribeUrl}`);
    console.log(`======================================================\n`);

    return { success: true, provider: 'simulation', simulated: true };
}

/**
 * Process all pending notifications where license records are now available
 */
async function processPendingNotifications(db) {
    if (!db) return { totalFound: 0, sentCount: 0, failedCount: 0 };
    await ensureNotificationsTable(db);

    const query = `
        SELECT n.id, n.license_number, n.email, n.unsubscribe_token,
               l.holder_name, l.office, l.category, l.updated_at
        FROM license_notifications n
        INNER JOIN licenses l ON n.license_number = l.license_number
        WHERE n.status = 'pending'
    `;

    let res;
    try {
        res = await db.execute(query);
    } catch (err) {
        console.warn(`Failed to query pending notifications: ${err.message}`);
        return { totalFound: 0, sentCount: 0, failedCount: 0, error: err.message };
    }

    const rows = res.rows || [];
    if (rows.length === 0) {
        return { totalFound: 0, sentCount: 0, failedCount: 0 };
    }

    console.log(`📬 Found ${rows.length} pending notification(s) matching printed license records!`);

    let sentCount = 0;
    let failedCount = 0;

    for (const row of rows) {
        const id = String(row.id);
        const licenseNumber = String(row.license_number);
        const email = String(row.email);
        const token = String(row.unsubscribe_token);
        const holderName = String(row.holder_name || 'N/A');
        const office = String(row.office || 'N/A');
        const category = String(row.category || 'N/A');

        // Atomically acquire lock to avoid race conditions and duplicate emails
        const lockRes = await db.execute({
            sql: `UPDATE license_notifications SET status = 'processing', updated_at = ? WHERE id = ? AND status = 'pending'`,
            args: [Date.now(), id],
        });

        if (lockRes.rowsAffected === 0) {
            // Already claimed by another worker
            continue;
        }

        try {
            await sendAvailableLicenseEmail({
                to: email,
                licenseNumber,
                holderName,
                office,
                category,
                unsubscribeToken: token,
            });

            await db.execute({
                sql: `UPDATE license_notifications SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?`,
                args: [Date.now(), Date.now(), id],
            });

            sentCount++;
            console.log(`  ✓ Sent notification to ${maskEmail(email)} for license ${licenseNumber}`);
        } catch (err) {
            failedCount++;
            console.error(`  ✗ Error sending notification to ${email} for ${licenseNumber}:`, err.message);

            // Revert back to pending so it can be retried on next scrape
            await db.execute({
                sql: `UPDATE license_notifications SET status = 'pending', updated_at = ? WHERE id = ?`,
                args: [Date.now(), id],
            });
        }
    }

    return { totalFound: rows.length, sentCount, failedCount };
}

/**
 * Get notification statistics for admin dashboard
 */
async function getNotificationStats(db) {
    if (!db) return { total: 0, pending: 0, sent: 0, cancelled: 0, deliveryRate: 0 };
    await ensureNotificationsTable(db);

    const res = await db.execute(`
        SELECT status, COUNT(*) as count
        FROM license_notifications
        GROUP BY status
    `);

    let total = 0;
    let pending = 0;
    let sent = 0;
    let cancelled = 0;

    for (const row of res.rows || []) {
        const s = String(row.status);
        const c = Number(row.count) || 0;
        if (s === 'pending' || s === 'processing') pending += c;
        else if (s === 'sent') sent += c;
        else if (s === 'cancelled') cancelled += c;
        total += c;
    }

    const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;

    return {
        total,
        pending,
        sent,
        cancelled,
        deliveryRate,
    };
}

/**
 * Get paginated notification logs for admin dashboard
 */
async function getNotificationLogs(db, { page = 1, limit = 50, search = '', status = 'all' } = {}) {
    if (!db) return { logs: [], total: 0, page: 1, limit: 50, totalPages: 1 };
    await ensureNotificationsTable(db);

    const offset = (page - 1) * limit;
    const whereClauses = [];
    const args = [];

    if (status && status !== 'all') {
        whereClauses.push('n.status = ?');
        args.push(status);
    }

    if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        whereClauses.push('(LOWER(n.license_number) LIKE ? OR LOWER(n.email) LIKE ? OR LOWER(l.holder_name) LIKE ?)');
        args.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count
    const countSql = `
        SELECT COUNT(*) as total
        FROM license_notifications n
        LEFT JOIN licenses l ON n.license_number = l.license_number
        ${whereSql}
    `;
    const countRes = await db.execute({ sql: countSql, args });
    const total = Number(countRes.rows?.[0]?.total || 0);

    // Rows
    const dataSql = `
        SELECT n.id, n.license_number, n.email, n.status, n.created_at, n.updated_at, n.sent_at, n.cancelled_at,
               l.holder_name, l.office
        FROM license_notifications n
        LEFT JOIN licenses l ON n.license_number = l.license_number
        ${whereSql}
        ORDER BY n.created_at DESC
        LIMIT ? OFFSET ?
    `;
    const dataRes = await db.execute({ sql: dataSql, args: [...args, limit, offset] });

    return {
        logs: dataRes.rows || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    };
}

module.exports = {
    ensureNotificationsTable,
    createNotification,
    cancelNotification,
    getNotificationByToken,
    sendAvailableLicenseEmail,
    processPendingNotifications,
    getNotificationStats,
    getNotificationLogs,
    maskEmail,
    getAppSiteUrl,
};

