import type { MetadataRoute } from 'next';

/**
 * Single-route SPA — the landing is the only indexable URL.
 * Language alternates point at the working /?lang= deep links.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NIVA_PUBLIC_URL ?? 'https://niva.health').replace(/\/$/, '');
  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: { fa: `${base}/?lang=fa`, en: `${base}/?lang=en` },
      },
    },
  ];
}
