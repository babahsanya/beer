"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Beer as BeerIcon, MessageSquare, Star, Globe } from "lucide-react";
import { motion } from "framer-motion";
import type { QuickStats } from "@/types/beer";

export function QuickStats() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-20 w-32 shrink-0 rounded-xl bg-amber-100 dark:bg-amber-900/30"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      icon: <BeerIcon className="h-4 w-4" />,
      emoji: "🍺",
      number: stats.totalBeers,
      label: "сортов",
      color: "text-amber-500",
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      emoji: "💬",
      number: stats.totalReviews,
      label: "отзывов",
      color: "text-emerald-500",
    },
    {
      icon: <Globe className="h-4 w-4" />,
      emoji: "🌍",
      number: stats.totalCountries,
      label: "стран",
      color: "text-blue-500",
    },
    {
      icon: <Star className="h-4 w-4" />,
      emoji: "⭐",
      number: stats.avgRating ? stats.avgRating.toFixed(1) : "—",
      label: "средний рейтинг",
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.08 }}
          className="shrink-0 relative"
        >
          <Card className="border-amber-200/60 dark:border-amber-900/30 bg-white/80 dark:bg-stone-800/80 backdrop-blur-xl w-36 hover:shadow-md hover:shadow-amber-200/20 dark:hover:shadow-amber-900/10 transition-shadow duration-300">
            <CardContent className="p-3 flex flex-col items-center text-center gap-1">
              <span className="text-lg">{card.emoji}</span>
              <span className={`text-xl font-bold text-foreground count-up ${card.color}`}>
                {typeof card.number === "number"
                  ? card.number.toLocaleString("ru-RU")
                  : card.number}
              </span>
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}