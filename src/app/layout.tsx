import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BeerID — Пивной справочник",
  description:
    "BeerID — ваш пивной справочник. Ищите пиво по названию, распознавайте по фото, изучайте рейтинги и отзывы.",
  keywords: [
    "BeerID",
    "пиво",
    "справочник",
    "рейтинг",
    "отзывы",
    "крафтовое пиво",
  ],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍺</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
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
                  <span className="text-muted-foreground/30">•</span>
                  <span>Без авторизации</span>
                </div>
              </div>
            </footer>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}