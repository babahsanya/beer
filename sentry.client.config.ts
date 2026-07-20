import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    enabled: process.env.NODE_ENV === "production",
    ignoreErrors: [
      "top.GLOBALS",
      "ResizeObserver loop limit exceeded",
      "extension context invalidated",
      "Network request failed",
      "Failed to fetch",
      "AbortError",
    ],
    denyUrls: [/chrome-extension:/i, /moz-extension:/i, /safari-extension:/i],
    integrations: [Sentry.browserApiErrorsIntegration()],
  });
}
