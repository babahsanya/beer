"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "./rating-stars";
import { getCountryFlag } from "@/lib/countries";
import { getSRMColor } from "@/lib/srm-colors";
import { Beer as BeerIcon, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Beer } from "@/types/beer";

interface BeerOfTheDayProps {
  onSelect: (beer: Beer) => void;
}

export function BeerOfTheDay({ onSelect }: BeerOfTheDayProps) {
  const [beer, setBeer] = useState<Beer | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      }),
    );
  }, []);

  useEffect(() => {
    async function fetchBeerOfTheDay() {
      try {
        const res = await fetch("/api/beers/beer-of-the-day");
        if (res.ok) {
          const data = await res.json();
          setBeer(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchBeerOfTheDay();
  }, []);

  if (loading) {
    return (
      <Card className="border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30" />
            <Skeleton className="h-5 w-28 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-36 w-28 rounded-xl bg-amber-100 dark:bg-amber-900/30 shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-3/4 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
              <Skeleton className="h-4 w-1/2 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
              <Skeleton className="h-4 w-1/3 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20 bg-amber-100 dark:bg-amber-900/30 rounded-full" />
                <Skeleton className="h-7 w-14 bg-amber-100 dark:bg-amber-900/30 rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!beer) return null;

  return (
    <Card className="relative border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/80 via-white/70 to-orange-50/80 dark:from-amber-950/30 dark:via-stone-800/70 dark:to-orange-950/20 backdrop-blur-xl overflow-hidden">
      {/* Sparkle animation overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/60 dark:bg-amber-500/40"
            initial={{
              x: `${15 + i * 15}%`,
              y: `${20 + (i % 3) * 25}%`,
              scale: 0,
              opacity: 0,
            }}
            animate={{
              scale: [0, 1.2, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.7,
              ease: "easeInOut",
            }}
          />
        ))}
        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 dark:via-amber-400/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
        />
      </div>

      <CardContent className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
          >
            <Sparkles className="h-5 w-5 text-amber-500" />
          </motion.div>
          <h3 className="font-bold text-base text-amber-800 dark:text-amber-300">
            Пиво дня
          </h3>
          <Badge
            variant="secondary"
            className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] px-2"
          >
            {dateStr}
          </Badge>
        </div>

        {/* Beer info */}
        <div className="flex gap-4 sm:gap-6">
          {/* Label with glow */}
          <div className="relative shrink-0">
            <div className="absolute -inset-1.5 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 opacity-30 blur-md animate-pulse" />
            <div className="relative h-36 sm:h-44 w-28 sm:w-32 rounded-xl overflow-hidden bg-amber-50 dark:bg-amber-900/20 shadow-xl ring-2 ring-amber-300/50 dark:ring-amber-700/50">
              {beer.label ? (
                <Image
                  src={beer.label}
                  alt={beer.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BeerIcon className="h-12 w-12 text-amber-300 dark:text-amber-700" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h4 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                {beer.name}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {beer.brewery}
                {beer.country && (
                  <span>
                    {" "}
                    • {getCountryFlag(beer.country)} {beer.country}
                  </span>
                )}
              </p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  {beer.style}
                </Badge>
                <Badge variant="outline">ABV {beer.abv}%</Badge>
                {beer.ibu != null && (
                  <Badge variant="outline">IBU {beer.ibu}</Badge>
                )}
              </div>

              {/* SRM color strip */}
              <div
                className="h-1 rounded-full mt-3 w-24"
                style={{ backgroundColor: getSRMColor(beer.style) }}
              />
            </div>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <RatingStars rating={beer.rating} size={16} />
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {beer.rating.toFixed(1)}
                </span>
              </div>
              {beer.ratingCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({beer.ratingCount.toLocaleString("ru-RU")} оценок)
                </span>
              )}
            </div>

            <Button
              onClick={() => onSelect(beer)}
              className="mt-3 bg-amber-500 hover:bg-amber-600 text-white gap-2 w-fit shadow-lg shadow-amber-300/30 dark:shadow-amber-900/30"
            >
              Узнать больше
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}