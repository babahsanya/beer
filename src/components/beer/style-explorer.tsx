"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "./rating-stars";
import { Search, X, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import type { StyleInfo, Beer } from "@/types/beer";
import { useBeerStore } from "@/store/beer-store";

interface StyleExplorerProps {
  onSearchStyle: (query: string) => void;
}

export function StyleExplorer({ onSearchStyle }: StyleExplorerProps) {
  const [styles, setStyles] = useState<StyleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [totalBeers, setTotalBeers] = useState(0);

  useEffect(() => {
    async function fetchStyles() {
      try {
        const res = await fetch("/api/styles");
        if (res.ok) {
          const data = await res.json();
          setStyles(data);
          setTotalBeers(data.reduce((sum: number, s: StyleInfo) => sum + s.count, 0));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStyles();
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return styles;
    const q = filter.toLowerCase();
    return styles.filter((s) => s.style.toLowerCase().includes(q));
  }, [styles, filter]);

  const handleStyleClick = (styleName: string) => {
    onSearchStyle(styleName);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl bg-amber-100 dark:bg-amber-900/30" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-32 rounded-xl bg-amber-100 dark:bg-amber-900/30"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 dot-pattern-bg rounded-2xl p-1">
      {/* Total count */}
      <p className="text-sm text-muted-foreground">
        Всего <span className="font-semibold text-foreground">{totalBeers}</span>{" "}
        сортов пива в{" "}
        <span className="font-semibold text-foreground">{styles.length}</span>{" "}
        стилях
      </p>

      {/* Filter input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Фильтр по стилю..."
          className="pl-10 pr-10 border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800 h-11"
        />
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Styles grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((styleInfo, index) => (
          <motion.div
            key={styleInfo.style}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.03 }}
          >
            <Card
              className="cursor-pointer border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-xl hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20 transition-all duration-300 ease-out h-full hover:scale-[1.02] grain-overlay overflow-hidden"
              onClick={() => handleStyleClick(styleInfo.style)}
            >
              <CardContent className="relative z-[2] p-4 flex flex-col gap-2">
                <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors duration-200">
                  {styleInfo.style}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {styleInfo.count}{" "}
                  {styleInfo.count === 1
                    ? "сорт"
                    : styleInfo.count < 5
                    ? "сорта"
                    : "сортов"}
                </p>
                <RatingStars rating={styleInfo.avgRating} size={12} showValue />
                <p className="text-xs text-muted-foreground/70 truncate">
                  {styleInfo.exampleBeer}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutGrid className="h-10 w-10 mx-auto mb-3 text-amber-300/60" />
          <p className="text-sm font-medium">Стили не найдены</p>
        </div>
      )}
    </div>
  );
}