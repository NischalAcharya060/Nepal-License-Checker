import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/siteUrl'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const baseUrl = siteUrl.replace(/\/+$/, '')

  const now = new Date()

  return [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1.0,
      lastModified: now,
      alternates: {
        languages: {
          'en-NP': baseUrl,
          'ne-NP': `${baseUrl}/?lang=ne`,
          'x-default': baseUrl,
        },
      },
    },
    {
      url: `${baseUrl}/?lang=ne`,
      changeFrequency: 'daily',
      priority: 0.95,
      lastModified: now,
      alternates: {
        languages: {
          'en-NP': baseUrl,
          'ne-NP': `${baseUrl}/?lang=ne`,
          'x-default': baseUrl,
        },
      },
    },
  ]
}