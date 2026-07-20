"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[BeerID] Global error:", error);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: "#0a0a0a", color: "#fafafa" }}>
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }} aria-hidden>🍺</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Критическая ошибка</h1>
          <p style={{ opacity: 0.7, fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Приложение упало на самом верхнем уровне. Попробуйте обновить страницу.
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre style={{ textAlign: "left", fontSize: "0.75rem", backgroundColor: "#1a1a1a", padding: "0.75rem", borderRadius: "0.5rem", overflow: "auto", marginBottom: "1.5rem", color: "#ef4444" }}>
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          )}
          <button onClick={reset} style={{ backgroundColor: "#f59e0b", color: "#000", border: "none", padding: "0.5rem 1.5rem", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 600 }}>
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
