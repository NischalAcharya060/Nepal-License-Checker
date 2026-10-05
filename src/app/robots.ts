import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  // Host directive should be pure hostname without protocol per RFC 9309 / robotstxt spec
  const host = siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Only block private APIs; NEVER block /_next/ so search engines can render CSS and JS
        disallow: ['/api/', '/admin', '/maintenance'],
      },
      // Major Search Engine Crawlers
      {
        userAgent: ['Googlebot', 'Bingbot', 'Applebot', 'YandexBot', 'DuckDuckBot', 'Baiduspider'],
        allow: '/',
        disallow: ['/api/', '/admin', '/maintenance'],
      },
      // AI Crawlers & Answer Engines (AEO / GEO for citations)
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
          'Google-Extended',
          'cohere-ai',
          'OAI-SearchBot',
          'CCBot',
        ],
        allow: '/',
        disallow: ['/api/', '/admin', '/maintenance'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: host,
  }
}
