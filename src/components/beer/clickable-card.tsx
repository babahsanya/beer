"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * ClickableCard — Card с keyboard accessibility.
 * Добавляет role="button", tabIndex=0, onKeyDown (Enter/Space), focus-visible ring.
 *
 * Stage 5 fix: audit H11 — dozens of clickable <Card>s had no keyboard support.
 */
export type ClickableCardProps = React.ComponentProps<"div"> & {
  onClick?: () => void;
  ariaLabel?: string;
};

export const ClickableCard = React.forwardRef<HTMLDivElement, ClickableCardProps>(
  function ClickableCard(
    { onClick, ariaLabel, children, className, ...rest },
    ref,
  ) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }
    };

    return (
      <Card
        ref={ref}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={
          onClick
            ? cn(
                "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className,
              )
            : className
        }
        {...rest}
      >
        {children}
      </Card>
    );
  },
);
