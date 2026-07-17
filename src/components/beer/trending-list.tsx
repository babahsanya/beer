"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./empty-state";
import { RatingStars } from "./rating-stars";
import { getCountryFlag } from "@/lib/countries";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useBeerStore } from "@/store/beer-store";
import type { TrendingBeer, TrendingCategory } from "@/types/beer";

const categories: { key: TrendingCategory; label: string }[] = [
  { key: "craft", label: "Крафтовое" },
  { key: "macro", label: "Масс-маркет" },
  { key: "global", label: "Глобальный топ" },
  { key: "weekly", label: "Тренды недели" },
];

const medalEmojis = ["🥇", "🥈", "🥉"];

export function TrendingList() {
  const { selectBeer, trendingCategory, setTrendingCategory } =
    useBeerStore();
  const [beers, setBeers] = useState<TrendingBeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/trending?category=${trendingCategory}`
      );
      if (!res.ok) throw new Error("Ошибка загрузки");
      const data = await res.json();
      setBeers(data.trending || []);
      setError(null);
    } catch {
      setError("Не удалось загрузить тренды");
    } finally {
      setLoading(false);
    }
  }, [trendingCategory]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setTrendingCategory(cat.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              trendingCategory === cat.key
                ? "bg-amber-500 text-white shadow-md shadow-amber-300/40"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-20 rounded-xl skeleton-shimmer"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && <EmptyState title={error} />}

      {/* Empty */}
      {!loading && !error && beers.length === 0 && (
        <EmptyState
          title="Нет данных"
          description="Тренды пока недоступны"
        />
      )}

      {/* List */}
      {!loading &&
        beers.map((beer, index) => {
          const isTop3 = index < 3;
          const rankGradients = [
            "from-amber-200/90 via-yellow-100/80 to-amber-50/90 dark:from-amber-700/40 dark:via-yellow-900/20 dark:to-amber-800/30",
            "from-slate-200/90 via-gray-100/80 to-slate-50/90 dark:from-slate-600/30 dark:via-gray-800/20 dark:to-slate-700/30",
            "from-orange-200/80 via-amber-100/70 to-orange-50/80 dark:from-orange-800/30 dark:via-amber-900/20 dark:to-orange-900/30",
          ];
          const rankBadgeGradients = [
            "bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 rank-badge-shine dark:from-yellow-500 dark:via-amber-400 dark:to-yellow-600",
            "bg-gradient-to-br from-slate-300 via-gray-300 to-slate-400 dark:from-slate-400 dark:via-gray-400 dark:to-slate-500",
            "bg-gradient-to-br from-orange-300 via-amber-400 to-orange-500 dark:from-orange-500 dark:via-amber-500 dark:to-orange-600",
          ];
          return (
            <motion.div
              key={beer.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
            <Card
              className={`group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl grain-overlay ${
                isTop3
                  ? `bg-gradient-to-r ${rankGradients[index]} border-amber-300 dark:border-amber-600 backdrop-blur-xl glow-amber`
                  : "border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl"
              } hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20`}
              onClick={() => selectBeer(beer)}
            >
              <CardContent className="relative z-[2] p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {/* Rank - Medal for top 3 */}
                  <motion.div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isTop3
                        ? `${rankBadgeGradients[index]} shadow-lg`
                        : "bg-amber-100 dark:bg-amber-900/30"
                    }`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <span className="text-lg">
                      {isTop3 ? medalEmojis[index] : (
                        <span className="font-bold text-lg text-muted-foreground">{index + 1}</span>
                      )}
                    </span>
                  </motion.div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold text-sm truncate ${
                      index === 0 ? "fire-gradient-text" : "text-foreground"
                    }`}>
                      {beer.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {getCountryFlag(beer.country)} {beer.brewery} • {beer.style}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <RatingStars rating={beer.rating} size={12} />
                      {beer.checkinDelta !== undefined && beer.checkinDelta > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <TrendingUp className="h-3 w-3" />
                          +{beer.checkinDelta.toLocaleString("ru-RU")}
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge variant="outline" className="shrink-0 font-semibold">
                    {beer.abv}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          );
        })}
    </div>
  );
}