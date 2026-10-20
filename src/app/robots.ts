import type { MetadataRoute } from 'next';

/**
 * NIVA robots.txt (wave 6.3): indexable app, API surface excluded.
 * Origin resolution mirrors src/app/layout.tsx siteOrigin(): production MUST
 * set NIVA_SITE_URL; dev falls back to NIVA_PUBLIC_URL, then localhost:3000.
 */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NIVA_SITE_URL ?? process.env.NIVA_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
