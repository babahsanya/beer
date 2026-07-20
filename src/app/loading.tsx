export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="text-5xl animate-bounce" aria-hidden style={{ animationDuration: "1.5s" }}>🍺</div>
        <div className="text-sm text-muted-foreground">Загрузка...</div>
        <div className="w-32 h-1 bg-muted rounded-full overflow-hidden" aria-hidden>
          <div className="h-full bg-primary/60 animate-pulse" />
        </div>
        <span className="sr-only">Загрузка страницы</span>
      </div>
    </div>
  );
}
