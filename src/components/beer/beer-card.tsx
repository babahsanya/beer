"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Beer as BeerIcon, Scale, Globe } from "lucide-react";
import { RatingStars } from "./rating-stars";
import { getCountryFlag } from "@/lib/countries";
import { getSRMColor } from "@/lib/srm-colors";
import { useBeerStore } from "@/store/beer-store";
import { useToast } from "@/hooks/use-toast";
import type { Beer } from "@/types/beer";
import Image from "next/image";
import { motion } from "framer-motion";

interface BeerCardProps {
  beer: Beer;
  onClick: () => void;
  index?: number;
}

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

export function BeerCard({ beer, onClick, index = 0 }: BeerCardProps) {
  const isTrending = beer.totalCheckins > 30000;
  const styleBorder = getStyleBorderColor(beer.style);
  const { compareBeers, addToCompare, removeFromCompare } = useBeerStore();
  const { toast } = useToast();
  const isInCompare = compareBeers.some((b) => b.id === beer.id);

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInCompare) {
      removeFromCompare(beer.id);
      toast({ title: "Убрано из сравнения", description: beer.name });
    } else if (compareBeers.length < 2) {
      addToCompare(beer);
      toast({ title: "Добавлено к сравнению", description: beer.name });
    } else {
      toast({
        title: "Максимум 2 пива",
        description: "Уберите одно пиво, чтобы добавить другое",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
    >
      <Card
        className={`beer-card-hover group cursor-pointer border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl border-l-4 ${styleBorder} hover:shadow-xl hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20 transition-all duration-300`}
        onClick={onClick}
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
              {isTrending && (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
                  🔥 Trending
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
                <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCompareClick}
                    className={`h-7 w-7 rounded-full transition-all duration-200 ${
                      isInCompare
                        ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-400/40"
                        : "text-muted-foreground/40 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 opacity-0 group-hover:opacity-100"
                    }`}
                    aria-label={isInCompare ? "Убрать из сравнения" : "Добавить к сравнению"}
                  >
                    <Scale className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-amber-500 transition-colors" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {beer.source === 'online' && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  >
                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                    Онлайн
                  </Badge>
                )}
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
                <span className="text-xs text-muted-foreground ml-auto">
                  {beer.totalCheckins?.toLocaleString("ru-RU")} чекинов
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-1.5">
                <RatingStars rating={beer.rating} size={14} />
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {beer.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}