import { z } from "zod";

/**
 * Валидация переменных окружения.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (url) =>
        url.startsWith("postgresql://") ||
        url.startsWith("postgres://") ||
        url.startsWith("file:"),
      "DATABASE_URL must be postgres://, postgresql://, or file: (SQLite dev)",
    ),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters").optional(),
  AUTH_URL: z.string().url().optional(),
  AUTH_GITHUB_ID: z.string().min(1).optional(),
  AUTH_GITHUB_SECRET: z.string().min(1).optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  UNTAPPD_CLIENT_ID: z.string().min(1).optional(),
  UNTAPPD_CLIENT_SECRET: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  POSTHOG_KEY: z.string().min(1).optional(),
  SITE_ADDRESS: z.string().default(":81"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:\n");
    for (const issue of parsed.error.issues) {
      console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error("\nSee .env.example for the list of required variables.\n");
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

let _env: Env | null = null;

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (!_env) _env = loadEnv();
    return _env[prop as keyof Env];
  },
});

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
export const isUntappdConfigured = Boolean(
  env.UNTAPPD_CLIENT_ID && env.UNTAPPD_CLIENT_SECRET,
);
export const isAuthConfigured = Boolean(
  env.AUTH_SECRET && (env.AUTH_GITHUB_ID || env.AUTH_GOOGLE_ID),
);
