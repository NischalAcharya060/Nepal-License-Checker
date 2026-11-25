// scripts/pushNotifications.js
require('dotenv').config();

const crypto = require('crypto');
const webpush = require('web-push');

const LICENSE_REGEX = /^\d{2}-\d{2}-\d{8}$/;

/**
 * Get VAPID configuration
 */
function getVapidConfig() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:nepallicensechecker@gmail.com';

    return { publicKey, privateKey, subject };
}

let vapidInitialized = false;

function ensureVapidInitialized() {
    if (vapidInitialized) return true;
    const { publicKey, privateKey, subject } = getVapidConfig();
    if (publicKey && privateKey) {
        try {
            webpush.setVapidDetails(subject, publicKey, privateKey);
            vapidInitialized = true;
            return true;
        } catch (err) {
            console.error('Failed to initialize VAPID details:', err);
            return false;
        }
    }
    return false;
}

/**
 * Ensure push_subscriptions table and indexes exist in Turso SQLite
 */
async function ensurePushTable(db) {
    if (!db) throw new Error('Database client is required');

    await db.execute(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id               TEXT PRIMARY KEY,
            endpoint         TEXT NOT NULL UNIQUE,
            p256dh           TEXT NOT NULL,
            auth             TEXT NOT NULL,
            license_number   TEXT,
            user_agent       TEXT,
            status           TEXT NOT NULL DEFAULT 'active',
            created_at       INTEGER NOT NULL,
            updated_at       INTEGER NOT NULL,
            last_notified_at INTEGER
        )
    `);

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_push_lic_status ON push_subscriptions(license_number, status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_push_status ON push_subscriptions(status)`);
}

/**
 * Save or update a Web Push subscription
 */
async function savePushSubscription(db, { endpoint, p256dh, auth, licenseNumber = null, userAgent = '' }) {
    await ensurePushTable(db);

    if (!endpoint || typeof endpoint !== 'string') {
        throw new Error('Valid subscription endpoint is required');
    }
    if (!p256dh || !auth) {
        throw new Error('Valid p256dh and auth keys are required');
    }

    let cleanLicense = null;
    if (licenseNumber) {
        const raw = String(licenseNumber).trim().toUpperCase();
        if (LICENSE_REGEX.test(raw)) {
            cleanLicense = raw;
        }
    }

    const now = Date.now();

    // Check if subscription endpoint already exists
    const existing = await db.execute({
        sql: `SELECT id, license_number, status FROM push_subscriptions WHERE endpoint = ? LIMIT 1`,
        args: [endpoint],
    });

    if (existing.rows && existing.rows.length > 0) {
        const existingRow = existing.rows[0];
        const subId = String(existingRow.id);

        await db.execute({
            sql: `
                UPDATE push_subscriptions
                SET p256dh = ?,
                    auth = ?,
                    license_number = COALESCE(?, license_number),
                    user_agent = COALESCE(?, user_agent),
                    status = 'active',
                    updated_at = ?
                WHERE id = ?
            `,
            args: [p256dh, auth, cleanLicense, userAgent || null, now, subId],
        });

        return {
            status: 'updated',
            id: subId,
            licenseNumber: cleanLicense || existingRow.license_number,
        };
    }

    // Insert new subscription
    const id = crypto.randomUUID();
    await db.execute({
        sql: `
            INSERT INTO push_subscriptions (
                id, endpoint, p256dh, auth, license_number, user_agent, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `,
        args: [id, endpoint, p256dh, auth, cleanLicense, userAgent || null, now, now],
    });

    return {
        status: 'created',
        id,
        licenseNumber: cleanLicense,
    };
}

/**
 * Unsubscribe an endpoint
 */
async function unsubscribePushSubscription(db, { endpoint, licenseNumber = null }) {
    await ensurePushTable(db);

    if (!endpoint) throw new Error('Endpoint is required');

    let sql = `UPDATE push_subscriptions SET status = 'unsubscribed', updated_at = ? WHERE endpoint = ?`;
    const args = [Date.now(), endpoint];

    if (licenseNumber) {
        sql += ` AND license_number = ?`;
        args.push(String(licenseNumber).trim().toUpperCase());
    }

    const res = await db.execute({ sql, args });
    return {
        success: true,
        affected: res.rowsAffected || 0,
    };
}

/**
 * Dispatch a single Web Push notification
 */
async function dispatchPushNotification(db, { endpoint, p256dh, auth }, payload) {
    ensureVapidInitialized();

    const pushSubscription = {
        endpoint,
        keys: { p256dh, auth },
    };

    const stringPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

    try {
        await webpush.sendNotification(pushSubscription, stringPayload, {
            TTL: 86400, // 24 hours
            urgency: 'high',
        });
        return { success: true };
    } catch (error) {
        const statusCode = error.statusCode;

        // 404 Not Found or 410 Gone means the subscription has expired or was revoked by the user
        if (statusCode === 404 || statusCode === 410) {
            console.log(`Push subscription expired (${statusCode}): ${endpoint.slice(0, 45)}...`);
            if (db) {
                try {
                    await db.execute({
                        sql: `UPDATE push_subscriptions SET status = 'expired', updated_at = ? WHERE endpoint = ?`,
                        args: [Date.now(), endpoint],
                    });
                } catch (dbErr) {
                    console.error('Failed to mark subscription as expired:', dbErr);
                }
            }
            return { success: false, expired: true, error: error.message };
        }

        console.error('Failed to deliver push notification:', error.message || error);
        return { success: false, expired: false, error: error.message };
    }
}

/**
 * Process all pending push notifications for newly printed licenses
 */
async function processPendingPushNotifications(db) {
    if (!db) return { totalFound: 0, sentCount: 0, expiredCount: 0, failedCount: 0 };
    await ensurePushTable(db);

    const query = `
        SELECT p.id, p.endpoint, p.p256dh, p.auth, p.license_number,
               l.holder_name, l.office, l.category, l.updated_at
        FROM push_subscriptions p
        INNER JOIN licenses l ON p.license_number = l.license_number
        WHERE p.status = 'active'
          AND p.license_number IS NOT NULL
          AND p.last_notified_at IS NULL
    `;

    let res;
    try {
        res = await db.execute(query);
    } catch (err) {
        console.warn(`Failed to query pending push subscriptions: ${err.message}`);
        return { totalFound: 0, sentCount: 0, expiredCount: 0, failedCount: 0, error: err.message };
    }

    const rows = res.rows || [];
    if (rows.length === 0) {
        return { totalFound: 0, sentCount: 0, expiredCount: 0, failedCount: 0 };
    }

    console.log(`📱 Found ${rows.length} pending web push notification(s) matching printed licenses!`);

    let sentCount = 0;
    let expiredCount = 0;
    let failedCount = 0;

    for (const row of rows) {
        const id = String(row.id);
        const endpoint = String(row.endpoint);
        const p256dh = String(row.p256dh);
        const auth = String(row.auth);
        const licenseNumber = String(row.license_number);
        const holderName = String(row.holder_name || 'N/A');
        const office = String(row.office || 'N/A');
        const category = String(row.category || 'N/A');

        const pushPayload = {
            title: '🎉 स्मार्ट लाइसेन्स छापियो! License Printed!',
            body: `लाइसेन्स नं: ${licenseNumber} (${holderName}) को स्मार्ट कार्ड छापिएर ${office} मा तयार छ। विवरण हेर्न यहाँ थिच्नुहोस्।`,
            icon: '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png',
            tag: `lic-${licenseNumber}`,
            data: {
                url: `/?number=${encodeURIComponent(licenseNumber)}`,
                licenseNumber,
                holderName,
                office,
                category,
            },
        };

        const result = await dispatchPushNotification(db, { endpoint, p256dh, auth }, pushPayload);

        if (result.success) {
            sentCount++;
            await db.execute({
                sql: `UPDATE push_subscriptions SET last_notified_at = ?, updated_at = ? WHERE id = ?`,
                args: [Date.now(), Date.now(), id],
            });
            console.log(`  ✓ Sent push notification for license ${licenseNumber}`);
        } else if (result.expired) {
            expiredCount++;
        } else {
            failedCount++;
        }
    }

    return {
        totalFound: rows.length,
        sentCount,
        expiredCount,
        failedCount,
    };
}

/**
 * Send a test notification to a specific client
 */
async function sendTestPush(db, { endpoint, p256dh, auth }) {
    const payload = {
        title: '🔔 Nepal License Checker',
        body: 'तपाईंको डिभाइसमा वेब पुश नोटिफिकेसन सफलतापूर्वक सक्रिय भयो! Push notifications are working perfectly on this device.',
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: 'test-push',
        data: {
            url: '/',
            type: 'test',
        },
    };

    return dispatchPushNotification(db, { endpoint, p256dh, auth }, payload);
}

/**
 * Get statistics for push subscriptions
 */
async function getPushStats(db) {
    await ensurePushTable(db);

    const res = await db.execute(`
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) as unsubscribed,
            SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
            SUM(CASE WHEN last_notified_at IS NOT NULL THEN 1 ELSE 0 END) as notified
        FROM push_subscriptions
    `);

    const row = res.rows[0] || {};
    return {
        total: Number(row.total || 0),
        active: Number(row.active || 0),
        unsubscribed: Number(row.unsubscribed || 0),
        expired: Number(row.expired || 0),
        notified: Number(row.notified || 0),
    };
}

/**
 * Get paginated list of push subscriptions for admin panel
 */
async function getPushLogs(db, { page = 1, limit = 10, search = '', status = 'all' } = {}) {
    await ensurePushTable(db);
    const whereClauses = [];
    const args = [];

    if (status && status !== 'all') {
        whereClauses.push('status = ?');
        args.push(status);
    }
    if (search && search.trim()) {
        whereClauses.push('(license_number LIKE ? OR user_agent LIKE ?)');
        const term = `%${search.trim()}%`;
        args.push(term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.execute({
        sql: `SELECT COUNT(*) as count FROM push_subscriptions ${whereSql}`,
        args,
    });
    const total = Number(countRes.rows[0]?.count || 0);

    const offset = Math.max(0, (page - 1) * limit);
    const dataRes = await db.execute({
        sql: `
            SELECT id, endpoint, p256dh, auth, license_number, user_agent, status, created_at, updated_at, last_notified_at
            FROM push_subscriptions
            ${whereSql}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `,
        args: [...args, limit, offset],
    });

    return {
        logs: dataRes.rows || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    };
}

/**
 * Send a broadcast notification to active subscribers
 */
async function broadcastPushNotification(db, { title, body, url = '/', tag = 'broadcast', targetLicense = null }) {
    await ensurePushTable(db);

    let sql = `SELECT id, endpoint, p256dh, auth, license_number FROM push_subscriptions WHERE status = 'active'`;
    const args = [];

    if (targetLicense) {
        sql += ` AND license_number = ?`;
        args.push(String(targetLicense).trim().toUpperCase());
    }

    const res = await db.execute({ sql, args });
    const rows = res.rows || [];

    let sentCount = 0;
    let expiredCount = 0;
    let failedCount = 0;

    const payload = {
        title: title || 'Nepal License Checker',
        body: body || 'New update available.',
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: tag || 'admin-broadcast',
        data: { url: url || '/' },
    };

    for (const row of rows) {
        const id = String(row.id);
        const endpoint = String(row.endpoint);
        const p256dh = String(row.p256dh);
        const auth = String(row.auth);

        const result = await dispatchPushNotification(db, { endpoint, p256dh, auth }, payload);
        if (result.success) {
            sentCount++;
            await db.execute({
                sql: `UPDATE push_subscriptions SET last_notified_at = ?, updated_at = ? WHERE id = ?`,
                args: [Date.now(), Date.now(), id],
            });
        } else if (result.expired) {
            expiredCount++;
        } else {
            failedCount++;
        }
    }

    return {
        total: rows.length,
        sentCount,
        expiredCount,
        failedCount,
    };
}

/**
 * Delete a push subscription by ID
 */
async function deletePushSubscriptionById(db, id) {
    await ensurePushTable(db);
    const res = await db.execute({
        sql: `DELETE FROM push_subscriptions WHERE id = ?`,
        args: [id],
    });
    return { success: true, affected: res.rowsAffected || 0 };
}

/**
 * Clean up expired or unsubscribed push subscriptions
 */
async function deletePushSubscriptionsByStatus(db, status = 'expired') {
    await ensurePushTable(db);
    const res = await db.execute({
        sql: `DELETE FROM push_subscriptions WHERE status = ?`,
        args: [status],
    });
    return { success: true, affected: res.rowsAffected || 0 };
}

module.exports = {
    getVapidConfig,
    ensurePushTable,
    savePushSubscription,
    unsubscribePushSubscription,
    dispatchPushNotification,
    processPendingPushNotifications,
    sendTestPush,
    getPushStats,
    getPushLogs,
    broadcastPushNotification,
    deletePushSubscriptionById,
    deletePushSubscriptionsByStatus,
};
