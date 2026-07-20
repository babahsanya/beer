import { auth, signIn, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Github } from "lucide-react";

/**
 * /auth/signin — страница входа.
 *
 * Stage 5 fix: auth.ts references this path in `pages.signIn`, but the page
 * didn't exist (audit found this missing — clicking 'Login' returned 404).
 *
 * Server Component — reads session, redirects to home if already logged in,
 * renders login buttons (GitHub OAuth) otherwise.
 *
 * NextAuth v5 provides signIn() server action — calling it with provider id
 * triggers the OAuth redirect.
 */

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  // Already logged in → redirect to home (or callbackUrl)
  if (session?.user) {
    redirect(params.callbackUrl || "/");
  }

  const callbackUrl = params.callbackUrl || "/";
  const hasError = Boolean(params.error);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
        <CardHeader className="text-center space-y-3">
          <div className="text-6xl mx-auto" aria-hidden>
            🍺
          </div>
          <CardTitle className="text-2xl">BeerID</CardTitle>
          <CardDescription>
            Войдите, чтобы сохранять избранное, вести журнал дегустаций и
            получать персональные рекомендации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasError && (
            <div
              className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive"
              role="alert"
            >
              Не удалось войти. Попробуйте ещё раз или используйте другой способ.
            </div>
          )}

          {/* GitHub OAuth */}
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: callbackUrl });
            }}
          >
            <Button
              type="submit"
              variant="outline"
              className="w-full bg-[#24292e] text-white hover:bg-[#24292e]/90 border-[#24292e]/50"
            >
              <Github className="mr-2 h-5 w-5" />
              Войти через GitHub
            </Button>
          </form>

          {/* Google OAuth (only if configured) */}
          {process.env.AUTH_GOOGLE_ID && (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: callbackUrl });
              }}
            >
              <Button type="submit" variant="outline" className="w-full">
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.22V7.04H2.18a10.99 10.99 0 0 0 0 9.92l3.66-2.87z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.87C6.71 7.29 9.14 5.38 12 5.38z"/>
                </svg>
                Войти через Google
              </Button>
            </form>
          )}

          <div className="pt-3 text-center text-xs text-muted-foreground">
            Войдя, вы соглашаетесь на использование cookies для сессии.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
