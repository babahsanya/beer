"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import type { StyleInfo } from "@/types/beer";

export function StyleDistribution() {
  const [styles, setStyles] = useState<StyleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStyles() {
      try {
        const res = await fetch("/api/styles");
        if (res.ok) {
          const data = await res.json();
          // Sort by count descending
          const sorted = [...data].sort((a: StyleInfo, b: StyleInfo) => b.count - a.count);
          setStyles(sorted);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStyles();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-base text-foreground">Распределение стилей</h3>
        </div>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-24 rounded skeleton-shimmer" />
                <Skeleton className="h-7 w-full rounded-lg skeleton-shimmer" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (styles.length === 0) return null;

  const maxCount = Math.max(...styles.map((s) => s.count));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-amber-500" />
        <h3 className="font-bold text-base text-foreground">Распределение стилей</h3>
      </div>
      <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="space-y-3">
            {styles.map((styleInfo, index) => {
              const widthPercent = maxCount > 0 ? (styleInfo.count / maxCount) * 100 : 0;
              return (
                <motion.div
                  key={styleInfo.style}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground truncate mr-2">
                      {styleInfo.style}
                    </span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {styleInfo.count}{" "}
                      {styleInfo.count === 1
                        ? "сорт"
                        : styleInfo.count < 5
                        ? "сорта"
                        : "сортов"}
                    </span>
                  </div>
                  <div className="h-7 w-full rounded-lg bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPercent}%` }}
                      transition={{
                        duration: 0.6,
                        delay: index * 0.05 + 0.2,
                        ease: "easeOut",
                      }}
                      className="h-full rounded-lg bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 dark:from-amber-500 dark:via-amber-600 dark:to-amber-700 relative overflow-hidden"
                    >
                      {/* Subtle shimmer overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}