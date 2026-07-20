import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="text-7xl" aria-hidden>🍻</div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">404</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Похоже, это пиво мы ещё не откупорили. Страница не найдена или была перемещена.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button asChild><Link href="/">На главную</Link></Button>
          <Button asChild variant="outline"><Link href="/?view=search">Найти пиво</Link></Button>
        </div>
      </div>
    </div>
  );
}
