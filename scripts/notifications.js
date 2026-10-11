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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { vertical-align: top; }
    .cta-btn:hover { background: #002566 !important; }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Header (Light high-contrast for mobile & desktop readability) -->
    <div style="background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%); border-top: 5px solid #003893; border-bottom: 1px solid #e2e8f0; padding: 34px 24px 28px; text-align: center;">
      <div style="display: inline-block; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 20px; padding: 5px 16px; font-size: 11px; font-weight: 800; color: #0369a1; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">
        🇳🇵 Nepal License Verification · आधिकारिक सूचना
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 23px; font-weight: 800; line-height: 1.3; color: #003893;">
        Good News! Your License is Printed
      </h1>
      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5; font-weight: 500;">
        यातायात व्यवस्था विभाग (DoTM) को अभिलेखमा तपाईंको लाइसेन्स छापिएको भेटिएको छ।
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 28px 24px;">
      
      <!-- Status Banner -->
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; text-align: center;">
        <div style="color: #065f46; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">
          DoTM Official Status
        </div>
        <div style="color: #047857; font-size: 18px; font-weight: 800;">
          ✓ PRINTED &amp; READY FOR COLLECTION
        </div>
        <div style="color: #065f46; font-size: 12px; margin-top: 4px; font-weight: 500;">
          कार्ड मुद्रण भइसकेको छ, अब कार्यालयबाट संकलन गर्न सकिन्छ।
        </div>
      </div>

      <!-- License Details Table -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
        <tbody>
          <!-- License Number -->
          <tr style="background-color: #f0f7ff;">
            <td style="padding: 14px 18px; width: 38%; font-size: 13px; font-weight: 700; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">
              License Number :
            </td>
            <td style="padding: 14px 18px; width: 62%; font-size: 15px; font-weight: 800; color: #003893; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; border-bottom: 1px solid #e2e8f0;">
              <span style="background-color: #dbeafe; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe; display: inline-block;">
                ${licenseNumber}
              </span>
            </td>
          </tr>
          <!-- Holder Name -->
          <tr>
            <td style="padding: 13px 18px; font-size: 13px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">
              Holder Name :
            </td>
            <td style="padding: 13px 18px; font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
              ${holderName || '—'}
            </td>
          </tr>
          <!-- Issuing Office -->
          <tr>
            <td style="padding: 13px 18px; font-size: 13px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">
              Issuing Office :
            </td>
            <td style="padding: 13px 18px; font-size: 14px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9;">
              ${office || '—'}
            </td>
          </tr>
          <!-- Vehicle Category -->
          <tr>
            <td style="padding: 13px 18px; font-size: 13px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">
              Vehicle Category :
            </td>
            <td style="padding: 13px 18px; font-size: 14px; font-weight: 700; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; border-bottom: 1px solid #f1f5f9;">
              <span style="background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0; display: inline-block;">
                ${category || 'A'}
              </span>
            </td>
          </tr>
          <!-- Source Authority -->
          <tr>
            <td style="padding: 13px 18px; font-size: 13px; font-weight: 700; color: #475569; white-space: nowrap;">
              Data Source :
            </td>
            <td style="padding: 13px 18px; font-size: 13px; font-weight: 600; color: #166534;">
              Department of Transport Management (DoTM Nepal)
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mandatory Documents Checklist -->
      <div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 5px solid #eab308; padding: 18px 20px; border-radius: 10px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #854d0e;">
          📋 लाइसेन्स लिन जाँदा लैजानुपर्ने कागजातहरू (Checklist):
        </h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #713f12; line-height: 1.7;">
          <li><strong>सक्कल नेपाली नागरिकता</strong> (Original Nepali Citizenship Certificate)</li>
          <li><strong>राजस्व तिरेको सक्कल रसिद</strong> (Original Revenue Payment Voucher)</li>
          <li><strong>पुरानो लाइसेन्स कार्ड</strong> (Old Driving License Card - नवीकरण वा वर्ग थप भएमा)</li>
          <li><strong>प्रिन्ट स्लिप</strong> (Online Verification Slip or Token screenshot)</li>
        </ul>
      </div>

      <!-- Action Button -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
        <tr>
          <td align="center">
            <a href="${checkUrl}" target="_blank" rel="noopener" class="cta-btn" style="display: inline-block; background: #003893; color: #ffffff !important; text-decoration: none; padding: 15px 36px; border-radius: 12px; font-size: 15px; font-weight: 800; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(0, 56, 147, 0.35); text-align: center;">
              View Official Print Slip Online →
            </a>
          </td>
        </tr>
      </table>

      <!-- Office Hours Tip -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          💡 <strong>Office Hours Tip:</strong> आइतबारदेखि शुक्रबारसम्म (बिहान १०:०० - दिउँसो ३:००) सम्बन्धित यातायात कार्यालयको वितरण काउन्टरबाट कार्ड लिन सक्नुहुन्छ।
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.6;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #475569;">
        This email alert was sent for license: <strong style="color: #0f172a; font-family: ui-monospace, monospace;">${licenseNumber}</strong>
      </p>
      <p style="margin: 0 0 12px 0;">
        <a href="${unsubscribeUrl}" style="color: #dc2626; text-decoration: underline; font-weight: 600;">Cancel or Unsubscribe from this alert</a> · <a href="${siteUrl}" style="color: #003893; text-decoration: underline; font-weight: 600;">Visit Nepal License Checker</a>
      </p>
      <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; line-height: 1.5;">
        ⚠️ <strong>Notice:</strong> Nepal License Checker (license-checker.acharyanischal.com.np) is an independent public utility portal indexing publicly published records from dotm.gov.np. This notification is purely informational and holds no legal authority. It cannot be presented as a driving license to traffic police or law enforcement.
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
        `Status           : PRINTED & READY FOR COLLECTION\n` +
        `License Number   : ${licenseNumber}\n` +
        `Holder Name      : ${holderName}\n` +
        `Issuing Office   : ${office}\n` +
        `Vehicle Category : ${category}\n\n` +
        `Mandatory Documents to Collect:\n` +
        `1. Original Nepali Citizenship Card (सक्कल नागरिकता)\n` +
        `2. Original Revenue Payment Voucher (राजस्व तिरेको सक्कल रसिद)\n` +
        `3. Old Driving License (if renewal or addition)\n` +
        `4. Printed verification slip or screenshot\n\n` +
        `View print status slip online: ${checkUrl}\n\n` +
        `To unsubscribe or cancel this notification: ${unsubscribeUrl}\n\n` +
        `--- \n` +
        `Nepal License Checker (license-checker.acharyanischal.com.np)`;

    const subject = `Your Nepal Driving License (${licenseNumber}) is Printed & Ready to Collect! 🇳🇵`;
    const defaultSender = 'Nepal License Checker <license-checker@acharyanischal.com.np>';
    let fromAddress = (process.env.SMTP_FROM || defaultSender).trim();

    // Sanitize fromAddress: normalize spaces inside angle brackets and ensure valid @ format
    if (fromAddress.includes('<') && fromAddress.includes('>')) {
        fromAddress = fromAddress.replace(/<\s+/g, '<').replace(/\s+>/g, '>');
        if (!fromAddress.includes('@') && fromAddress.toLowerCase().includes('acharyanischal.com.np')) {
            fromAddress = fromAddress.replace(/<([^@>]+)\.acharyanischal\.com\.np>/i, '<$1@acharyanischal.com.np>');
        }
    }

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

