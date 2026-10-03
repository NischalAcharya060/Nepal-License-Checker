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
    {
      url: `${baseUrl}/?lang=ne`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
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
  ]
}