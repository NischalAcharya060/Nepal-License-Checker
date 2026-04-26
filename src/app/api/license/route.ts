// src/app/api/license/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { RateLimiter } from '@/lib/rateLimit'
import { sanitizeInput } from '@/utils/sanitize'
import { License } from '@/types'

const rateLimiter = new RateLimiter(10, 60000) // 10 requests per minute

export async function GET(request: NextRequest) {
    try {
        // Apply rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'anonymous'
        if (!rateLimiter.check(ip)) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                { status: 429 }
            )
        }

        const searchParams = request.nextUrl.searchParams
        let licenseNumber = searchParams.get('number')

        if (!licenseNumber) {
            return NextResponse.json(
                { error: 'License number is required' },
                { status: 400 }
            )
        }

        // Sanitize input
        licenseNumber = sanitizeInput(licenseNumber)

        // Validate format
        const licenseRegex = /^\d{2}-\d{2}-\d{8}$/
        if (!licenseRegex.test(licenseNumber)) {
            return NextResponse.json(
                { error: 'Invalid license number format. Use XX-XX-XXXXXXXX' },
                { status: 400 }
            )
        }

        // Search for license in Firebase
        const licensesRef = adminDb.collection('licenses')
        const snapshot = await licensesRef
            .where('license_number', '==', licenseNumber)
            .limit(1)
            .get()

        if (snapshot.empty) {
            return NextResponse.json({
                status: 'success',
                data: null,
                message: 'License not found'
            })
        }

        // Return found license
        const doc = snapshot.docs[0]
        const licenseData = doc.data() as License

        return NextResponse.json({
            status: 'success',
            data: {
                holder_name: licenseData.holder_name,
                license_number: licenseData.license_number,
                office: licenseData.office,
                category: licenseData.category,
                createdAt: licenseData.createdAt,
                updatedAt: licenseData.updatedAt
            }
        })
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}