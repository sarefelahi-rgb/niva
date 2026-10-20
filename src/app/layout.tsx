import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { AuthBridge } from "@/components/shell/auth-bridge";
import { translate, isRtl, type Locale } from "@/lib/i18n";

/**
 * metadataBase resolution (wave 6.3, honest note):
 * NIVA_SITE_URL is the canonical production origin and MUST be set in
 * production so canonical/hreflang/OG/sitemap/robots URLs are absolute and
 * correct. Falls back to NIVA_PUBLIC_URL (the pre-6.3 env), then to
 * http://localhost:3000 — the sandbox/dev default. Consequence when unset:
 * search-engine URLs point at localhost — fine for dev, wrong for prod.
 */
function siteOrigin(): string {
  return (process.env.NIVA_SITE_URL ?? process.env.NIVA_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

const SITE = siteOrigin();
const FA_DESCRIPTION = translate('fa', 'app.description');
const FA_DISCLAIMER = translate('fa', 'landing.disclaimer');
const TITLE_DEFAULT = 'NIVA — نیوا | بارداری هوشمند';

/**
 * Structured data — WebApplication, minimal and strictly truthful (no
 * ratings/review counts, no medical claims): the app exists, is a web
 * application in fa+en, has an always-free tier (plans.ts FREE plan), and is
 * educational only (the in-app landing.disclaimer is quoted verbatim inside
 * the description — not a medical-device claim).
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'NIVA',
  alternateName: 'نیوا',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web',
  inLanguage: ['fa', 'en'],
  url: `${SITE}/`,
  description: `${FA_DESCRIPTION} ${FA_DISCLAIMER}`,
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'IRR',
    description: 'طرح همیشه‌رایگان نیوا (ویژگی‌های آموزشی پایه)؛ طرح‌های پریمیوم اختیاری‌اند.',
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: TITLE_DEFAULT,
    template: '%s | NIVA',
  },
  description: FA_DESCRIPTION,
  applicationName: "NIVA",
  manifest: "/manifest.webmanifest",
  keywords: ["pregnancy", "postpartum", "3D", "education", "NIVA", "بارداری", "نیوا"],
  appleWebApp: { capable: true, title: "NIVA", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  alternates: {
    // Language alternates are real, working URLs — /?lang= is read at boot
    // (src/app/page.tsx). Per-locale path URLs (/fa/, /en/) need i18n routing
    // — documented production task in docs/audit/11-bidi-qa.md §8.
    canonical: "/",
    languages: { fa: "/?lang=fa", en: "/?lang=en", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    alternateLocale: ["en_US"],
    siteName: "NIVA",
    title: TITLE_DEFAULT,
    description: FA_DESCRIPTION,
    url: `${SITE}/`,
    images: [{ url: "/hero.png", width: 1024, height: 1280, alt: "NIVA — calm pregnancy illustration" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_DEFAULT,
    description: FA_DESCRIPTION,
    images: ["/hero.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/**
 * Wave 7 — cookie-backed SSR locale. src/proxy.ts resolves the document
 * locale (?lang= override, else niva-locale cookie, else fa) and forwards it
 * in the `x-niva-locale` request header. Rendering <html lang dir> from that
 * header makes the server output match the client's first render — removing
 * the full-page hydration regeneration that occurred whenever the persisted
 * client locale differed from the SSR default. Anything unexpected falls
 * back to the Persian default.
 */
function documentLocale(h: Headers): Locale {
  return h.get('x-niva-locale') === 'en' ? 'en' : 'fa';
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6B4E71" },
    { media: "(prefers-color-scheme: dark)", color: "#2b2029" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = documentLocale(await headers());
  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        {/* Brand fonts are self-hosted via @font-face in globals.css (OFL) —
            no third-party font CDN, no tracking, offline-capable. */}
        <script
          type="application/ld+json"
          // Static, server-generated JSON (no user input) — safe to inline.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthBridge />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
