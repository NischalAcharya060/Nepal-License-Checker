// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK (for server-side operations)
const apps = getApps();

if (!apps.length) {
    initializeApp({
        credential: cert({
            project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
            client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        } as any),
    });
}

const adminDb = getFirestore();
const adminAuth = getAuth();

export { adminDb, adminAuth };