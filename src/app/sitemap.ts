import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/siteUrl'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const baseUrl = new URL(siteUrl)
  const root = baseUrl.toString()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: root,
      changeFrequency: 'daily',
      priority: 1.0,
      lastModified: new Date(),
      alternates: {
        languages: {
          'en-NP': root,
          'ne-NP': `${siteUrl}/?lang=ne`,
          'x-default': root,
        },
      },
    },
  ]

  return staticRoutes
}
