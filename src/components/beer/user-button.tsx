"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";

/**
 * UserButton — header widget for auth state.
 *
 * - Not logged in: shows "Войти" → /auth/signin
 * - Logged in: shows avatar + dropdown with email and "Выйти"
 *
 * Uses next-auth/react's signOut() which requires SessionProvider
 * (configured in app/providers.tsx).
 *
 * Session is fetched via useSession() — client-side. To avoid hydration
 * mismatch, this component shows a loading skeleton until session loads.
 */

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

export function UserButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  // Session loaded client-side via next-auth/react
  // To avoid hydration mismatch, we use useSession() with required: false
  // and show "Войти" by default (matches SSR where session is null)
  const { data: session, status } = useSession();

  // Loading state — show nothing to avoid flicker (SSR shows "Войти" anyway)
  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full bg-muted/50 animate-pulse" />;
  }

  // Not logged in → show "Войти" button
  if (!session?.user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/auth/signin")}
        className="border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20"
      >
        Войти
      </Button>
    );
  }

  const userName = session.user.name || session.user.email || "User";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-muted transition-colors"
          aria-label="Меню пользователя"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 text-xs font-semibold">
              {getInitials(session.user.name, session.user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {userName.split(" ")[0]}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 ml-auto" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user.name || "Пользователь"}
            </p>
            {session.user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {session.user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Профиль</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await signOut({ redirect: false });
              router.push("/");
              router.refresh();
            });
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

