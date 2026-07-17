"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "./rating-stars";
import { Trophy, Crown, Medal, Award } from "lucide-react";
import { motion } from "framer-motion";
import type { Beer } from "@/types/beer";

interface TopBeersProps {
  onSelect: (beer: Beer) => void;
}

interface TopBeer extends Beer {
  reviewCount: number;
}

const rankConfig = [
  {
    gradient: "from-amber-300 to-yellow-500 dark:from-amber-500 dark:to-yellow-600",
    icon: <Crown className="h-4 w-4 text-yellow-800 dark:text-yellow-100" />,
    label: "🥇",
    badgeBg: "bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-900 dark:text-yellow-100 shadow-lg shadow-amber-400/40",
  },
  {
    gradient: "from-slate-300 to-slate-400 dark:from-slate-400 dark:to-slate-500",
    icon: <Medal className="h-4 w-4 text-slate-700 dark:text-slate-100" />,
    label: "🥈",
    badgeBg: "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 dark:text-white shadow-lg shadow-slate-400/40",
  },
  {
    gradient: "from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700",
    icon: <Award className="h-4 w-4 text-orange-900 dark:text-orange-100" />,
    label: "🥉",
    badgeBg: "bg-gradient-to-r from-amber-600 to-orange-600 text-orange-100 shadow-lg shadow-orange-400/40",
  },
  {
    gradient: "",
    icon: null,
    label: "4",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  },
  {
    gradient: "",
    icon: null,
    label: "5",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  },
];

export function TopBeers({ onSelect }: TopBeersProps) {
  const [beers, setBeers] = useState<TopBeer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopBeers() {
      try {
        const res = await fetch("/api/beers/top");
        if (res.ok) {
          const data = await res.json();
          setBeers(data.beers || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchTopBeers();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shrink-0 w-44">
            <div className="space-y-2">
              <Skeleton className="h-5 w-8 rounded-md skeleton-shimmer" />
              <Skeleton className="h-36 w-44 rounded-xl skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (beers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="font-bold text-base text-foreground">Топ-5 пива</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {beers.map((beer, index) => {
          const config = rankConfig[index] || rankConfig[4];
          return (
            <motion.div
              key={beer.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
              className="shrink-0 w-44"
            >
              {/* Rank badge */}
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${config.badgeBg}`}
                >
                  {config.label}
                </span>
                {config.icon}
              </div>

              {/* Beer card */}
              <Card
                className={`cursor-pointer border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-lg hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20 hover:-translate-y-0.5 transition-all duration-200 ${index === 0 ? 'shimmer-border' : ''}`}
                onClick={() => onSelect(beer)}
              >
                <CardContent className="p-3 flex flex-col gap-2">
                  <h4 className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
                    {beer.name}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <RatingStars rating={beer.rating} size={12} />
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs font-normal bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 w-fit"
                  >
                    {beer.style}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {beer.reviewCount}{" "}
                    {beer.reviewCount === 1
                      ? "отзыв"
                      : beer.reviewCount < 5
                      ? "отзыва"
                      : "отзывов"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}