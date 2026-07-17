"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "./stat-card";
import { EmptyState } from "./empty-state";
import { BarChart3, TrendingUp, Calendar, Hash, Star } from "lucide-react";
import type { BeerStats } from "@/types/beer";

interface BeerStatsViewProps {
  beerId: string;
}

export function BeerStatsView({ beerId }: BeerStatsViewProps) {
  const [stats, setStats] = useState<BeerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/beers/${beerId}/stats`);
        if (!res.ok) throw new Error("Ошибка загрузки");
        const data = await res.json();
        setStats(data);
        setError(null);
      } catch {
        setError("Не удалось загрузить статистику");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [beerId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-24 rounded-xl bg-amber-100 dark:bg-amber-900/30"
            />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl bg-amber-100 dark:bg-amber-900/30" />
      </div>
    );
  }

  if (error || !stats) {
    return <EmptyState title={error || "Нет данных"} />;
  }

  const ratingCategories = [
    { label: "Аромат", value: stats.ratingBreakdown?.aroma ?? stats.ratings?.aroma ?? 0, icon: "👃" },
    { label: "Вкус", value: stats.ratingBreakdown?.taste ?? stats.ratings?.taste ?? 0, icon: "👅" },
    { label: "Внешний вид", value: stats.ratingBreakdown?.appearance ?? stats.ratings?.appearance ?? 0, icon: "👁️" },
    { label: "Общее", value: stats.ratingBreakdown?.overall ?? stats.ratings?.overall ?? 0, icon: "⭐" },
  ];

  return (
    <div className="space-y-6">
      {/* Checkin Stats */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Чекины
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Всего"
            value={stats.totalCheckins.toLocaleString("ru-RU")}
            icon={Hash}
          />
          <StatCard
            label="За месяц"
            value={stats.monthlyCheckins.toLocaleString("ru-RU")}
            icon={Calendar}
          />
          <StatCard
            label="Сегодня"
            value={stats.dailyCheckins.toLocaleString("ru-RU")}
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-amber-200 dark:border-amber-900/50 p-4 sm:p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Оценки по категориям
        </h3>
        <div className="space-y-4">
          {ratingCategories.map((cat) => (
            <div key={cat.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="text-foreground">{cat.label}</span>
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {cat.value.toFixed(1)}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700 transition-all duration-700 ease-out"
                  style={{ width: `${(cat.value / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rating Distribution */}
      {stats.ratingDistribution && (
        <div className="bg-white dark:bg-stone-800 rounded-xl border border-amber-200 dark:border-amber-900/50 p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Распределение оценок
          </h3>
          <div className="space-y-2.5">
            {(() => {
              const dist = stats.ratingDistribution;
              const maxCount = Math.max(...Object.values(dist), 1);
              return [5, 4, 3, 2, 1].map((star) => {
                const count = dist[star.toString()] ?? 0;
                const pct = (count / maxCount) * 100;
                const isMax = count === maxCount;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-14 shrink-0 text-sm text-foreground">
                      <span>{star}</span>
                      <Star className={`h-3 w-3 ${isMax ? "text-amber-500 fill-amber-500" : "text-amber-400"}`} />
                    </div>
                    <div className="flex-1 relative h-2.5 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                          isMax
                            ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 shadow-sm shadow-amber-400/40"
                            : "bg-gradient-to-r from-amber-300/80 to-amber-500/80 dark:from-amber-600/60 dark:to-amber-800/60"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs w-16 text-right tabular-nums shrink-0 ${isMax ? "font-semibold text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {count.toLocaleString("ru-RU")}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}