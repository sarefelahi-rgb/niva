import type { MetadataRoute } from 'next';

/**
 * NIVA PWA manifest (Web App Manifest spec) — served at /manifest.webmanifest
 * and auto-linked by the root layout metadata (`manifest: "/manifest.webmanifest"`).
 *
 * Persian (RTL) is the primary locale: dir/lang declare it so installed-app
 * chrome renders correctly from the first launch.
 *
 * Store-compliance note (docs/audit/09-store-compliance.md): `screenshots` are
 * deliberately NOT fabricated here — real device screenshots are a release
 * task and belong in the store listing, not in the runtime manifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NIVA — نیوا',
    short_name: 'NIVA',
    description:
      'همراه آرام و علمی بارداری و پس از زایمان — educational companion for pregnancy & postpartum.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#EDE7F6',
    theme_color: '#6B4E71',
    dir: 'rtl',
    lang: 'fa',
    categories: ['health', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
