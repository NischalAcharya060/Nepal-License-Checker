import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/siteUrl'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const baseUrl = siteUrl.replace(/\/+$/, '')

  const now = new Date()

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          'en': baseUrl,
          'en-NP': baseUrl,
          'ne': `${baseUrl}/?lang=ne`,
          'ne-NP': `${baseUrl}/?lang=ne`,
          'x-default': baseUrl,
        },
      },
    },
    // NOTE: only canonical URLs belong here. `/?lang=ne` is an hreflang
    // language variant of `/` (canonical points back to `/`), so listing it
    // would make Google report "Alternative page with proper canonical tag".
    {
      url: `${baseUrl}/tutorial`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          'en': `${baseUrl}/tutorial`,
          'en-NP': `${baseUrl}/tutorial`,
          'ne': `${baseUrl}/tutorial?lang=ne`,
          'ne-NP': `${baseUrl}/tutorial?lang=ne`,
          'x-default': `${baseUrl}/tutorial`,
        },
      },
    },
  ]
}