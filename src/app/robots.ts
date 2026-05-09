import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/static/'],
        crawlDelay: 1,
      },
      {
        userAgent: 'AdsBot-Google',
        allow: '/',
        crawlDelay: 0,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        crawlDelay: 0,
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/robots.txt`],
    host: siteUrl,
  }
}
