"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[BeerID] Route error:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-background"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="text-6xl" aria-hidden>🍺</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Что-то пошло не так</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Произошла непредвиденная ошибка при загрузке страницы. Попробуйте обновить — обычно это помогает.
          </p>
        </div>
        {process.env.NODE_ENV === "development" && (
          <details className="text-left text-xs bg-muted/50 rounded-lg p-3">
            <summary className="cursor-pointer font-medium">Детали ошибки (dev only)</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all text-destructive">
              {error.message}
              {error.digest ? `\nDigest: ${error.digest}` : ""}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </details>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">Попробовать снова</Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">На главную</Button>
        </div>
      </div>
    </div>
  );
}
