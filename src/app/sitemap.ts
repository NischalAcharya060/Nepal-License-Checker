import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/siteUrl'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const baseUrl = new URL(siteUrl)

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl.toString(),
      changeFrequency: 'daily',
      priority: 1.0,
      lastModified: new Date(),
    },
  ]

  return staticRoutes
}
