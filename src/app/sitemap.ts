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
    },
    {
      url: `${baseUrl}/developer/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/developer`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/updates`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tutorial`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      videos: [
        {
          title:
            'How to Check if Your Nepal Driving Licence is Printed (Video Tutorial)',
          description:
            'Watch a 25-second tutorial on how to check your Nepal smart card driving licence print status online using the official DOTM printed list: enter your licence number, press Check Status, read the result, and set an email alert if it is not printed yet.',
          thumbnail_loc: `${baseUrl}/tutorial/tutorial-poster.jpg`,
          content_loc: `${baseUrl}/tutorial/tutorial.mp4`,
          duration: 25,
          publication_date: '2026-10-01T00:00:00+05:45',
          family_friendly: 'yes',
          tag: 'Nepal driving licence, DOTM, smart card print status',
        },
      ],
    },
    {
      url: `${baseUrl}/feedback`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}