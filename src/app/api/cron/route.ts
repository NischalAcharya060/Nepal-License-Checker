// src/app/api/cron/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runScraper } from '../../../../scripts/update-data'

// Cron job endpoint for Vercel Cron Jobs
export async function GET(request: NextRequest) {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await runScraper()
        return NextResponse.json(result)
    } catch (error) {
        console.error('Cron job failed:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}