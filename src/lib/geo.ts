import { NextRequest } from 'next/server'

export interface GeoLocation {
    ip: string
    country: string
    city: string
    region: string
}

export function extractGeo(request: NextRequest): GeoLocation {
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        '127.0.0.1'

    let country =
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry') ||
        ''

    let city =
        request.headers.get('x-vercel-ip-city') ||
        request.headers.get('cf-ipcity') ||
        ''

    let region =
        request.headers.get('x-vercel-ip-country-region') ||
        request.headers.get('cf-region') ||
        ''

    if (city) {
        try {
            city = decodeURIComponent(city)
        } catch {
            // Keep raw city if decoding fails
        }
    }

    const isLocal =
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('172.16.') ||
        ip === 'anonymous'

    if (isLocal && !country) {
        country = 'NP'
        city = city || 'Localhost'
        region = region || 'Local Dev'
    } else if (!country) {
        country = 'NP'
    }

    return { ip, country, city, region }
}

export async function resolveGeo(request: NextRequest): Promise<GeoLocation> {
    const geo = extractGeo(request)
    const isLocal =
        geo.ip === '127.0.0.1' ||
        geo.ip === '::1' ||
        geo.ip.startsWith('192.168.') ||
        geo.ip.startsWith('10.') ||
        geo.ip.startsWith('172.16.') ||
        geo.ip === 'anonymous'

    if (geo.city || isLocal) {
        return geo
    }

    try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 1200)
        const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(geo.ip)}?fields=status,countryCode,city,regionName`, {
            signal: controller.signal,
        })
        clearTimeout(timer)
        if (res.ok) {
            const data = await res.json()
            if (data?.status === 'success') {
                if (data.countryCode) geo.country = data.countryCode
                if (data.city) geo.city = data.city
                if (data.regionName) geo.region = data.regionName
            }
        }
    } catch {
        // Fallback silently if offline or timed out
    }

    return geo
}

export function countryCodeToFlag(countryCode?: string | null): string {
    if (!countryCode || countryCode.length !== 2) return '🌐'
    const code = countryCode.toUpperCase()
    // Convert 2-letter ISO code to regional indicator symbol emoji
    return String.fromCodePoint(...code.split('').map((c) => 127397 + c.charCodeAt(0)))
}
