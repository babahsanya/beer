"use client";

import { Badge } from "@/components/ui/badge";

interface BeerBadgeProps {
  label: string;
  value: string | number;
  variant?: "default" | "secondary" | "outline";
}

export function BeerBadge({
  label,
  value,
  variant = "secondary",
}: BeerBadgeProps) {
  return (
    <Badge variant={variant} className="gap-1 font-normal">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </Badge>
  );
}