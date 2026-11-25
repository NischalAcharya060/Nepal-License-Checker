// src/app/api/push/key/route.ts
import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const publicKey = getVapidPublicKey()
    if (!publicKey) {
      return NextResponse.json(
        { error: 'VAPID public key not configured on server' },
        { status: 500 }
      )
    }

    return NextResponse.json({ publicKey })
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json(
      { error: err?.message || 'Failed to get VAPID key' },
      { status: 500 }
    )
  }
}
