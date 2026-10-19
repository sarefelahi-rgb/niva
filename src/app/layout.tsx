import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { AuthBridge } from "@/components/shell/auth-bridge";

export const metadata: Metadata = {
  title: "NIVA — Pregnancy Intelligence Platform",
  description:
    "A calm, scientific companion for pregnancy and postpartum: 3D development studio, evidence-grounded assistant, health tracking and family access. Educational use only.",
  applicationName: "NIVA",
  manifest: "/manifest.webmanifest",
  keywords: ["pregnancy", "postpartum", "3D", "education", "NIVA"],
  appleWebApp: { capable: true, title: "NIVA", statusBarStyle: "default" },
  icons: { icon: "/icon.png", apple: "/icon.png" },
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap"
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
