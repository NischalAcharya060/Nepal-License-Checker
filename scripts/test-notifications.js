// scripts/test-notifications.js
require('dotenv').config();

const { createClient } = require('@libsql/client');
const {
    ensureNotificationsTable,
    createNotification,
    cancelNotification,
    getNotificationByToken,
    processPendingNotifications,
    maskEmail,
} = require('./notifications');

async function runTests() {
    console.log('🧪 Starting Email Notification System Verification Tests...\n');

    if (!process.env.TURSO_DATABASE_URL) {
        console.warn('⚠️ TURSO_DATABASE_URL is not set. Skipping live DB test.');
        return;
    }

    const db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const TEST_LICENSE = '99-99-99999999';
    const TEST_EMAIL = 'verify.test.user@example.com';

    try {
        // Test 1: Ensure Schema
        console.log('Test 1: Ensuring database table & indexes...');
        await ensureNotificationsTable(db);
        console.log('  ✓ Schema ensured successfully.\n');

        // Clean up any old test records first
        await db.execute({
            sql: `DELETE FROM license_notifications WHERE license_number = ?`,
            args: [TEST_LICENSE],
        });
        await db.execute({
            sql: `DELETE FROM licenses WHERE license_number = ?`,
            args: [TEST_LICENSE],
        });

        // Test 2: Create Notification for Unavailable License
        console.log('Test 2: Registering notification for unavailable license...');
        const createRes = await createNotification(db, {
            licenseNumber: TEST_LICENSE,
            email: TEST_EMAIL,
        });
        if (createRes.status !== 'success' || !createRes.unsubscribeToken) {
            throw new Error(`Failed to create notification: ${JSON.stringify(createRes)}`);
        }
        console.log(`  ✓ Notification registered. ID: ${createRes.id}, Token: ${createRes.unsubscribeToken}\n`);

        // Test 3: Avoid Duplicate Active Subscriptions (Feature 6)
        console.log('Test 3: Checking duplicate subscription prevention...');
        const duplicateRes = await createNotification(db, {
            licenseNumber: TEST_LICENSE,
            email: TEST_EMAIL,
        });
        if (duplicateRes.status !== 'already_subscribed') {
            throw new Error(`Expected already_subscribed but got: ${JSON.stringify(duplicateRes)}`);
        }
        console.log('  ✓ Duplicate subscription caught and avoided cleanly.\n');

        // Test 4: Query By Unsubscribe Token & Masked Email
        console.log('Test 4: Looking up subscription by token & checking email masking...');
        const tokenRecord = await getNotificationByToken(db, createRes.unsubscribeToken);
        if (!tokenRecord || tokenRecord.license_number !== TEST_LICENSE) {
            throw new Error(`Token lookup failed for token: ${createRes.unsubscribeToken}`);
        }
        const masked = maskEmail(tokenRecord.email);
        console.log(`  ✓ Subscription found. Masked Email: ${masked} (Raw: ${tokenRecord.email})\n`);

        // Test 5: Cancel Notification by Token (Feature 8)
        console.log('Test 5: Cancelling notification via unsubscribe token...');
        const cancelRes = await cancelNotification(db, { token: createRes.unsubscribeToken });
        if (cancelRes.status !== 'success') {
            throw new Error(`Cancellation failed: ${JSON.stringify(cancelRes)}`);
        }
        console.log('  ✓ Notification cancelled successfully.\n');

        // Test 6: Verify Process Pending Notifications does not send email to cancelled
        console.log('Test 6: Verifying processPendingNotifications ignores cancelled subscriptions...');
        // Insert test license as if printed by DoTM
        const now = Date.now();
        await db.execute({
            sql: `INSERT INTO licenses (license_number, holder_name, office, category, created_at, updated_at)
                  VALUES (?, 'TEST HOLDER RAM SHRESTHA', 'Ekantakuna, Lalitpur (01)', 'A, B', ?, ?)`,
            args: [TEST_LICENSE, now, now],
        });

        const notifRun1 = await processPendingNotifications(db);
        if (notifRun1.sentCount !== 0) {
            throw new Error(`Expected 0 sent emails for cancelled subscription, got ${notifRun1.sentCount}`);
        }
        console.log('  ✓ Cancelled subscription correctly ignored.\n');

        // Test 7: Re-subscribe now that record is printed -> should tell user it is already printed!
        console.log('Test 7: Attempting to subscribe when license is already printed...');
        const alreadyPrintedRes = await createNotification(db, {
            licenseNumber: TEST_LICENSE,
            email: TEST_EMAIL,
        });
        if (alreadyPrintedRes.status !== 'already_printed') {
            throw new Error(`Expected already_printed but got: ${JSON.stringify(alreadyPrintedRes)}`);
        }
        console.log('  ✓ System detected record was already printed and informed user directly.\n');

        // Test 8: End-to-end Pending Notification -> Scraper checks -> Send Email (Features 4 & 5 & 6)
        console.log('Test 8: Testing end-to-end pending notification resolution & duplicate avoidance...');
        const TEST_LICENSE_2 = '99-99-88888888';
        await db.execute({ sql: `DELETE FROM license_notifications WHERE license_number = ?`, args: [TEST_LICENSE_2] });
        await db.execute({ sql: `DELETE FROM licenses WHERE license_number = ?`, args: [TEST_LICENSE_2] });

        // 1. Subscribe while unavailable
        const sub2 = await createNotification(db, {
            licenseNumber: TEST_LICENSE_2,
            email: TEST_EMAIL,
        });
        console.log('  - Subscribed pending user for license:', TEST_LICENSE_2);

        // 2. Now simulate DoTM scraper finding the license
        await db.execute({
            sql: `INSERT INTO licenses (license_number, holder_name, office, category, created_at, updated_at)
                  VALUES (?, 'HARI PRASAD THAPA', 'Radhe Radhe, Bhaktapur (02)', 'B', ?, ?)`,
            args: [TEST_LICENSE_2, now, now],
        });

        // 3. Process pending notifications (simulating scraper run)
        const processRun1 = await processPendingNotifications(db);
        if (processRun1.sentCount !== 1) {
            throw new Error(`Expected 1 sent email, got: ${JSON.stringify(processRun1)}`);
        }
        console.log('  ✓ Successfully matched new license and sent notification email.');

        // 4. Run process pending notifications AGAIN -> must NOT send duplicate email!
        const processRun2 = await processPendingNotifications(db);
        if (processRun2.sentCount !== 0) {
            throw new Error(`DUPLICATE EMAIL SENT! Expected 0 sent emails, got: ${JSON.stringify(processRun2)}`);
        }
        console.log('  ✓ Duplicate prevention verified: 0 duplicate emails sent on subsequent runs.\n');

        // Cleanup
        await db.execute({ sql: `DELETE FROM license_notifications WHERE license_number IN (?, ?)`, args: [TEST_LICENSE, TEST_LICENSE_2] });
        await db.execute({ sql: `DELETE FROM licenses WHERE license_number IN (?, ?)`, args: [TEST_LICENSE, TEST_LICENSE_2] });

        console.log('🎉 ALL NOTIFICATION TESTS PASSED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Test failed with error:', err);
        process.exit(1);
    }
}

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
