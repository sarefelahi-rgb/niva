import type { MetadataRoute } from 'next';

/**
 * NIVA sitemap (wave 6.3).
 *
 * Single-route SPA — '/' is the only indexable URL; locale switching is
 * client-side. The alternates below point at the WORKING /?lang= deep links
 * (read at boot in src/app/page.tsx) — they are real URLs, not fabricated.
 *
 * HONEST LIMITATION (also in docs/audit/11-bidi-qa.md §8): per-locale path
 * URLs (/fa/, /en/) with true hreflang pairs require i18n routing (App Router
 * locale segments or middleware rewrites) — a documented production task, not
 * available in this build.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Origin resolution mirrors src/app/layout.tsx siteOrigin(): production MUST
  // set NIVA_SITE_URL; dev falls back to NIVA_PUBLIC_URL, then localhost:3000.
  const base = (process.env.NIVA_SITE_URL ?? process.env.NIVA_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
      alternates: {
        languages: { fa: `${base}/?lang=fa`, en: `${base}/?lang=en` },
      },
    },
  ];
}
