// src/app/api/developer/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    DEV_STATE_COOKIE,
    DEV_SESSION_COOKIE,
    DEV_SESSION_TTL_MS,
    ensureDeveloperTables,
    createDeveloperSessionToken,
} from '@/lib/developerAuth'
import { getTurso } from '@/lib/turso'

export const dynamic = 'force-dynamic'

interface GitHubUserResponse {
    id: number
    login: string
    name: string | null
    email: string | null
    avatar_url: string | null
}

interface GitHubEmailItem {
    email: string
    primary: boolean
    verified: boolean
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const cookieState = request.cookies.get(DEV_STATE_COOKIE)?.value

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const origin = `${proto}://${host}`

    const redirectWithError = (msg: string) => {
        const url = new URL('/developer', origin)
        url.searchParams.set('error', msg)
        return NextResponse.redirect(url.toString(), 302)
    }

    if (!code || !state || !cookieState || state !== cookieState) {
        return redirectWithError('Invalid OAuth state or missing code. Please try signing in again.')
    }

    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        return redirectWithError('Server configuration error: GitHub OAuth credentials missing.')
    }

    try {
        // 1. Exchange code for GitHub access token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        })

        const tokenData = (await tokenRes.json()) as { access_token?: string; error_description?: string }

        if (!tokenData.access_token) {
            console.error('GitHub token exchange error:', tokenData)
            return redirectWithError(tokenData.error_description || 'Failed to exchange authorization code with GitHub.')
        }

        const accessToken = tokenData.access_token

        // 2. Fetch user profile
        const userRes = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': 'Nepal-License-Checker-DevPortal',
                Accept: 'application/vnd.github+json',
            },
        })

        if (!userRes.ok) {
            return redirectWithError('Failed to fetch user profile from GitHub.')
        }

        const ghUser = (await userRes.json()) as GitHubUserResponse
        let email = ghUser.email

        // If email is null (private email setting on GitHub), fetch from /user/emails
        if (!email) {
            try {
                const emailsRes = await fetch('https://api.github.com/user/emails', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'User-Agent': 'Nepal-License-Checker-DevPortal',
                        Accept: 'application/vnd.github+json',
                    },
                })
                if (emailsRes.ok) {
                    const emails = (await emailsRes.json()) as GitHubEmailItem[]
                    const primary = emails.find((e) => e.primary && e.verified) || emails[0]
                    if (primary?.email) email = primary.email
                }
            } catch {
                // Non-fatal, continue with null email
            }
        }

        // 3. Upsert developer profile in database
        await ensureDeveloperTables()
        const db = getTurso()
        const devId = `dev_gh_${ghUser.id}`
        const now = Date.now()

        await db.execute({
            sql: `INSERT INTO developers (id, github_id, username, name, email, avatar_url, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(github_id) DO UPDATE SET
                      username = excluded.username,
                      name = COALESCE(excluded.name, developers.name),
                      email = COALESCE(excluded.email, developers.email),
                      avatar_url = excluded.avatar_url,
                      updated_at = excluded.updated_at`,
            args: [
                devId,
                ghUser.id,
                ghUser.login,
                ghUser.name || ghUser.login,
                email || null,
                ghUser.avatar_url || null,
                now,
                now,
            ],
        })

        // 4. Create cryptographically signed session token
        const sessionToken = await createDeveloperSessionToken({
            id: devId,
            github_id: ghUser.id,
            username: ghUser.login,
        })

        const successRedirect = new URL('/developer', origin)
        const response = NextResponse.redirect(successRedirect.toString(), 302)

        // Set session cookie
        response.cookies.set(DEV_SESSION_COOKIE, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: Math.floor(DEV_SESSION_TTL_MS / 1000),
        })

        // Clean up state cookie
        response.cookies.delete(DEV_STATE_COOKIE)

        return response
    } catch (err: unknown) {
        console.error('OAuth Callback Exception:', err)
        return redirectWithError('An unexpected error occurred during authentication. Please try again.')
    }
}
