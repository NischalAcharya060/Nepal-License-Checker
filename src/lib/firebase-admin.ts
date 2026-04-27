// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function normalizePrivateKey(raw: string | undefined): string {
    if (!raw) return '';
    let key = raw;
    // Strip surrounding quotes if dotenv kept them
    key = key.replace(/^"+|"+$/g, '').trim();
    // Convert literal \n sequences to real newlines
    if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
    return key;
}

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
        }),
    });
}

const adminDb = getFirestore();
const adminAuth = getAuth();

export { adminDb, adminAuth };