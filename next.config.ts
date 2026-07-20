import type { NextConfig } from "next";

/**
 * Security headers applied to every route.
 *
 * CSP пока в Report-Only режиме — собираем нарушения, потом включаем enforce.
 * После чистки inline-скриптов переключаем на `Content-Security-Policy`.
 */
const securityHeaders = [
  // HSTS — игнорируется на http, работает на https
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // CSP Report-Only — заготовка под прод. После отладки заменить на
  // 'Content-Security-Policy'.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' временно — Next.js использует inline scripts для runtime
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://untappd.s3.amazonaws.com https://images.untappd.com https://res.cloudinary.com",
      "font-src 'self'",
      "connect-src 'self' https://api.untappd.com https://api.openbrewerydb.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Не светим версию Next.js в X-Powered-By
  poweredByHeader: false,

  // Включаем статический анализ на билде — НЕ подавлять ошибки типов.
  // Stage 1+2 recovery: legacy TS errors fixed (seed.ts, similar/route.ts,
  // map/route.ts, breweries/untappd/route.ts, achievements-view.tsx,
  // data-manager.tsx, journal-view.tsx, page.tsx). Now strictly enforced.
  typescript: {
    ignoreBuildErrors: false,
  },

  allowedDevOrigins: ["*.space-z.ai"],

  images: {
    // Разрешаем конкретные хосты — никаких wildcard'ов.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "untappd.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "images.untappd.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    // unoptimized: true снимал SSRF-риск через image optimizer.
    // После сужения remotePatterns до конкретных хостов можно включить
    // оптимизацию обратно для AVIF/WebP — но пока оставляем отключённым,
    // пока не проверим, что все источники изображений попадают в allow-list.
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
