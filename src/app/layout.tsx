import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { Providers } from "@/app/providers";
import { UserButton } from "@/components/beer/user-button";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BeerID — Пивной справочник",
    template: "%s · BeerID",
  },
  description: "BeerID — ваш персональный журнал и гид по пиву. Ищите пиво по названию, распознавайте по фото, изучайте рейтинги, ведите дегустационные заметки, открывайте новые стили.",
  applicationName: "BeerID",
  keywords: ["BeerID", "пиво", "справочник", "рейтинг", "отзывы", "крафтовое пиво", "дегустация", "Untappd", "пивоварня", "пивной журнал"],
  authors: [{ name: "BeerID" }],
  creator: "BeerID",
  publisher: "BeerID",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName: "BeerID",
    title: "BeerID — Пивной справочник",
    description: "Персональный журнал и гид по пиву: каталог, рейтинги, дегустационные заметки, рекомендации, викторины и карта пивоварен.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BeerID — Пивной справочник" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BeerID — Пивной справочник",
    description: "Персональный журнал и гид по пиву: каталог, рейтинги, дегустационные заметки, рекомендации.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  formatDetection: { telephone: false, address: false, email: false },
  category: "food & drink",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f59e0b" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Providers>
            <div className="flex min-h-screen flex-col">
              {/* Header with auth widget */}
              <header className="sticky top-0 z-40 border-b border-amber-100/50 dark:border-amber-900/30 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
                  <a href="/" className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:opacity-80 transition-opacity">
                    <span className="beer-pulse">🍺</span>
                    <span>BeerID</span>
                  </a>
                  <UserButton />
                </div>
              </header>

              <div className="flex-1">{children}</div>
              <footer className="relative py-6 px-4 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm mt-auto">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent shadow-[0_0_12px_rgba(217,119,6,0.15)]" />
                <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground dark:text-stone-500">
                  <div className="flex items-center gap-2">
                    <span className="beer-pulse text-lg">🍺</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400 tracking-wide">BeerID</span>
                    <span className="text-muted-foreground/50">v1.0</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>Сделано с 🍺</span>
                    <span className="text-muted-foreground/30">•</span>
                    <span>Пивной справочник</span>
                  </div>
                </div>
              </footer>
            </div>
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
