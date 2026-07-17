"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { RatingStars } from "./rating-stars";
import { ChevronRight } from "lucide-react";
import type { SimilarBeer } from "@/types/beer";

interface SimilarBeersProps {
  beerId: string;
  onSelect: (beer: SimilarBeer) => void;
}

export function SimilarBeers({ beerId, onSelect }: SimilarBeersProps) {
  const [beers, setBeers] = useState<SimilarBeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/beers/${beerId}/similar`);
        if (!res.ok) throw new Error("Ошибка загрузки");
        const data = await res.json();
        setBeers(data.similar || []);
        setError(null);
      } catch {
        setError("Не удалось загрузить похожие сорта");
      } finally {
        setLoading(false);
      }
    };
    fetchSimilar();
  }, [beerId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-20 rounded-xl bg-amber-100 dark:bg-amber-900/30"
          />
        ))}
      </div>
    );
  }

  if (error || beers.length === 0) {
    return (
      <EmptyState
        title={error || "Похожие сорта не найдены"}
        description="Мы не смогли найти похожие сорта пива"
      />
    );
  }

  return (
    <div className="space-y-3">
      {beers.map((beer) => (
        <Card
          key={beer.id}
          className="group cursor-pointer border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-600 transition-all duration-200"
          onClick={() => onSelect(beer)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-sm text-foreground">
                    {beer.name}
                  </h4>
                  <Badge
                    variant="secondary"
                    className="text-xs font-normal bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  >
                    {Math.round(beer.similarity * 100)}% совпадение
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {beer.brewery} • {beer.style} • {beer.abv}%
                </p>
                <div className="mt-1">
                  <RatingStars rating={beer.rating} size={12} />
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-amber-500 transition-colors shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}