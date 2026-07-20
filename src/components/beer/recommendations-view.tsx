"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./empty-state";
import { RatingStars } from "./rating-stars";
import { getCountryFlag } from "@/lib/countries";
import { getSRMColor } from "@/lib/srm-colors";
import { useBeerStore } from "@/store/beer-store";
import { Sparkles, RefreshCw, ChevronRight, Beer as BeerIcon } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Recommendation, Beer } from "@/types/beer";
import { apiGet, getErrorMessage } from "@/lib/api-client";

function getStyleBorderColor(style: string): string {
  const s = style.toLowerCase();
  if (s.includes("ipa")) return "border-l-amber-600 dark:border-l-amber-400";
  if (s.includes("stout")) return "border-l-stone-800 dark:border-l-stone-300";
  if (s.includes("wheat") || s.includes("weiss") || s.includes("wit")) return "border-l-yellow-500 dark:border-l-yellow-400";
  if (s.includes("porter")) return "border-l-stone-700 dark:border-l-stone-400";
  if (s.includes("sour")) return "border-l-rose-500 dark:border-l-rose-300";
  if (s.includes("pilsner") || s.includes("lager")) return "border-l-yellow-400 dark:border-l-yellow-500";
  if (s.includes("belgian")) return "border-l-orange-500 dark:border-l-orange-300";
  if (s.includes("pale ale")) return "border-l-amber-500 dark:border-l-amber-300";
  if (s.includes("amber")) return "border-l-orange-600 dark:border-l-orange-400";
  if (s.includes("brown")) return "border-l-amber-900 dark:border-l-amber-500";
  return "border-l-amber-500 dark:border-l-amber-300";
}

export function RecommendationsView() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectBeer } = useBeerStore();

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ recommendations: Recommendation[] }>("/api/recommendations");
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось загрузить рекомендации"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleBeerClick = (beer: Beer) => {
    selectBeer(beer);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded bg-amber-100 dark:bg-amber-900/30" />
            <Skeleton className="h-6 w-24 bg-amber-100 dark:bg-amber-900/30" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md bg-amber-100 dark:bg-amber-900/30" />
        </div>

        {/* Card skeletons */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card
              key={i}
              className="border-amber-200 dark:border-amber-900/50"
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-16 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40 bg-amber-100 dark:bg-amber-900/30" />
                    <Skeleton className="h-3 w-56 bg-amber-100 dark:bg-amber-900/30" />
                    <Skeleton className="h-3 w-32 bg-amber-100 dark:bg-amber-900/30" />
                    <Skeleton className="h-4 w-24 bg-amber-100 dark:bg-amber-900/30" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <EmptyState
          title={error}
          description="Попробуйте обновить позже"
        />
        <div className="flex justify-center">
          <Button
            onClick={fetchRecommendations}
            variant="outline"
            className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </Button>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Пока нет рекомендаций"
          description="Добавьте пиво в избранное, чтобы получить персональные рекомендации"
          icon={<Sparkles className="h-8 w-8 text-amber-500" />}
        />
        <div className="flex justify-center">
          <Button
            onClick={fetchRecommendations}
            variant="outline"
            className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30 p-2 shadow-sm">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Для вас</h2>
          <Badge
            variant="secondary"
            className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs"
          >
            {recommendations.length}
          </Badge>
        </div>
        <Button
          onClick={fetchRecommendations}
          variant="outline"
          size="sm"
          className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Обновить
        </Button>
      </div>

      {/* Recommendation cards */}
      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const beer = rec.beer;
          const styleBorder = getStyleBorderColor(beer.style);

          return (
            <motion.div
              key={beer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <Card
                className={`group cursor-pointer border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl border-l-4 ${styleBorder} hover:shadow-xl hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20 transition-all duration-300`}
                onClick={() => handleBeerClick(beer)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-3">
                    {/* Label */}
                    <div className="relative h-16 w-12 sm:h-20 sm:w-14 shrink-0 rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/20 shadow-sm">
                      {beer.label ? (
                        <>
                          <Image
                            src={beer.label}
                            alt={beer.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <BeerIcon className="h-6 w-6 text-amber-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate leading-tight">
                            {beer.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                            {beer.brewery}
                            {beer.country && (
                              <span className="text-muted-foreground/60">
                                {" "}
                                • {getCountryFlag(beer.country)} {beer.country}
                              </span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-amber-500 transition-colors shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className="beer-srm-dot"
                          style={{ backgroundColor: getSRMColor(beer.style) }}
                        />
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        >
                          {beer.style}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-normal">
                          {beer.abv}%
                        </Badge>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        <RatingStars rating={beer.rating} size={14} />
                      </div>

                      {/* Reason */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-snug">
                          {rec.reason}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}