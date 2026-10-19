import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { AuthBridge } from "@/components/shell/auth-bridge";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NIVA_PUBLIC_URL ?? 'https://niva.health'),
  title: "NIVA — Pregnancy Intelligence Platform",
  description:
    "A calm, scientific companion for pregnancy and postpartum: 3D development studio, evidence-grounded assistant, health tracking and family access. Educational use only.",
  applicationName: "NIVA",
  manifest: "/manifest.webmanifest",
  keywords: ["pregnancy", "postpartum", "3D", "education", "NIVA", "بارداری", "نیوا"],
  appleWebApp: { capable: true, title: "NIVA", statusBarStyle: "default" },
  icons: { icon: "/favicon-32.png", apple: "/icon-512.png" },
  alternates: {
    // Language alternates are real, working URLs — /?lang= is read at boot.
    canonical: "/",
    languages: { fa: "/?lang=fa", en: "/?lang=en", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    siteName: "NIVA",
    title: "NIVA — Pregnancy Intelligence Platform",
    description:
      "A calm, scientific companion for pregnancy and postpartum — educational, evidence-grounded, private by design.",
    images: [{ url: "/hero.png", width: 1024, height: 1280, alt: "NIVA — calm pregnancy illustration" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf9f3" },
    { media: "(prefers-color-scheme: dark)", color: "#2b2029" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Brand fonts are self-hosted via @font-face in globals.css (OFL) —
            no third-party font CDN, no tracking, offline-capable. */}
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
