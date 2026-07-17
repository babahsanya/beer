"use client";

import { Beer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  showCta?: boolean;
  onCta?: () => void;
  ctaLabel?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  className,
  showCta = false,
  onCta,
  ctaLabel = "На главную",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Large faded background emoji */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[120px] text-amber-200/40 dark:text-amber-800/20" style={{ filter: "sepia(0.15) saturate(1.2)" }}>
          🍺
        </span>
      </div>

      {/* Dashed border card */}
      <div className="relative border-2 border-dashed border-amber-300/60 dark:border-amber-700/40 rounded-2xl p-8 sm:p-10 w-full max-w-sm bg-white/40 dark:bg-stone-800/40 backdrop-blur-md">
        <div className="gentle-float mb-5 inline-flex rounded-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20 p-4 shadow-inner shadow-amber-200/50 dark:shadow-amber-900/30">
          {icon || <Beer className="h-8 w-8 text-amber-500" />}
        </div>
        <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground/80 max-w-sm leading-relaxed">
            {description}
          </p>
        )}
        {showCta && (
          <Button
            onClick={onCta}
            variant="outline"
            size="sm"
            className="mt-5 gap-1.5 border-amber-300/80 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Home className="h-4 w-4" />
            {ctaLabel}
          </Button>
        )}
      </div>
    </div>
  );
}