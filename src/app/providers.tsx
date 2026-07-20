"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Client-side providers — wraps the whole app.
 *
 * SessionProvider from next-auth/react — needed for useSession() hook
 * in UserButton component.
 *
 * This is a client component because SessionProvider uses browser
 * localStorage for session persistence.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
