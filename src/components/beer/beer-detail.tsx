"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import {
  Heart,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Home,
  ArrowLeft,
  Star,
  Beer as BeerIcon,
  Globe,
  Building2,
  Palette,
  FlaskConical,
  Hash,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCountryFlag } from "@/lib/countries";
import { getSRMColor } from "@/lib/srm-colors";
import { useBeerStore } from "@/store/beer-store";
import {
  apiGet,
  apiPost,
  apiDelete,
  isUnauthorized,
  getErrorMessage,
} from "@/lib/api-client";
import { RatingStars } from "./rating-stars";
import { BeerReviews } from "./beer-reviews";
import { BeerStatsView } from "./beer-stats";
import { SimilarBeers } from "./similar-beers";
import { FoodPairing } from "./food-pairing";
import type { Beer, SimilarBeer } from "@/types/beer";
import { useToast } from "@/hooks/use-toast";

export function BeerDetail() {
  const {
    selectedBeer,
    goBack,
    goHome,
    selectBeer,
    isFavorite,
    setFavorite,
  } = useBeerStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  const beer = selectedBeer;

  const fetchBeer = useCallback(
    async (showRefresh = false) => {
      if (!beer?.id) return;
      // For online beers, skip API fetch — use data from search result
      if (beer.id.startsWith('online-')) {
        setLoading(false);
        return;
      }
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await apiGet<Beer>(`/api/beers/${beer.id}`);
        useBeerStore.getState().selectBeer(data);
        // Track view (fire-and-forget, non-blocking)
        apiPost('/api/recent', { beerId: data.id, beerName: data.name }).catch(() => {});
      } catch (err) {
        toast({
          title: "Ошибка",
          description: getErrorMessage(err, "Не удалось обновить данные"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [beer?.id, toast]
  );

  useEffect(() => {
    if (beer?.id) {
      setActiveTab("description");
      fetchBeer();
    }
  }, [beer?.id, fetchBeer]);

  const toggleFavorite = async () => {
    if (!beer) return;
    const prev = isFavorite;
    try {
      if (prev) {
        // Optimistic update — flip UI now, roll back on failure.
        setFavorite(false);
        await apiDelete(`/api/favorites?beerId=${encodeURIComponent(beer.id)}`);
        toast({ title: "Удалено из избранного" });
      } else {
        setFavorite(true);
        await apiPost('/api/favorites', { beerId: beer.id });
        toast({ title: "Добавлено в избранное", description: beer.name });
      }
    } catch (err) {
      // Roll back the optimistic flip on failure.
      setFavorite(prev);
      toast({
        title: "Ошибка",
        description: isUnauthorized(err)
          ? "Войдите, чтобы сохранять избранное"
          : getErrorMessage(err, "Не удалось обновить избранное"),
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!beer) return;
    try {
      await navigator.clipboard.writeText(`${beer.name} — ${beer.brewery} (${beer.style}, ${beer.abv}%) ⭐ ${beer.rating.toFixed(1)} | BeerID`);
      toast({ title: "Скопировано!", description: "Название пива скопировано в буфер обмена" });
    } catch {
      toast({ title: "Ошибка", description: "Не удалось скопировать", variant: "destructive" });
    }
  };

  // Check favorite status — uses the boolean endpoint to avoid loading
  // the user's entire favorites list on every beer view.
  useEffect(() => {
    if (!beer?.id) return;
    const checkFav = async () => {
      try {
        const data = await apiGet<{ isFavorite: boolean }>(
          '/api/favorites?beerId=' + encodeURIComponent(beer.id),
        );
        setFavorite(!!data.isFavorite);
      } catch (err) {
        // 401 means the user is anonymous — not an error, just not a favorite.
        if (!isUnauthorized(err)) {
          // ignore other errors
        }
      }
    };
    checkFav();
  }, [beer?.id, setFavorite]);

  const handleSelectSimilar = (similar: SimilarBeer) => {
    selectBeer(similar);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!beer) return null;

  const isHighAbv = beer.abv > 8;
  const isOnline = beer.id.startsWith('online-');

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-32 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <Skeleton className="h-48 w-36 rounded-xl bg-amber-100 dark:bg-amber-900/30 shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-3/4 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
                <Skeleton className="h-5 w-1/2 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
                <Skeleton className="h-5 w-1/3 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-16 bg-amber-100 dark:bg-amber-900/30 rounded-full" />
                  <Skeleton className="h-7 w-16 bg-amber-100 dark:bg-amber-900/30 rounded-full" />
                  <Skeleton className="h-7 w-20 bg-amber-100 dark:bg-amber-900/30 rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const infoGrid = [
    { icon: Palette, label: "Стиль", value: beer.style },
    { icon: FlaskConical, label: "ABV", value: `${beer.abv}%` },
    { icon: Hash, label: "IBU", value: beer.ibu?.toString() || "—" },
    { icon: Globe, label: "Страна", value: beer.country ? `${getCountryFlag(beer.country)} ${beer.country}` : "—" },
    { icon: Building2, label: "Пивоварня", value: beer.brewery },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={beer.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* Header Card */}
        <Card className="border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl overflow-hidden grain-overlay">
          <CardContent className="relative z-[2] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Label Image - Decorative frame with amber glow */}
              <div className="relative mx-auto sm:mx-0 shrink-0">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 opacity-40 blur-sm" />
                <div className="relative h-44 sm:h-52 w-36 sm:w-40 rounded-xl overflow-hidden bg-amber-50 dark:bg-amber-900/20 shadow-xl ring-2 ring-amber-300/50 dark:ring-amber-700/50">
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
                      <BeerIcon className="h-16 w-16 text-amber-300 dark:text-amber-700" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                      {beer.name}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                      {beer.brewery}
                      {beer.country && (
                        <span> • {getCountryFlag(beer.country)} {beer.country}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShare}
                      className="text-muted-foreground hover:text-amber-600"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fetchBeer(true)}
                      disabled={refreshing}
                      className="text-muted-foreground hover:text-amber-600"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFavorite}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          isFavorite
                            ? "fill-red-500 text-red-500"
                            : ""
                        }`}
                      />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {isOnline && (
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 gap-1">
                      <Globe className="h-3 w-3" />
                      Данные из интернета
                    </Badge>
                  )}
                  <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100">
                    {beer.style}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`font-semibold ${isHighAbv ? "bg-gradient-to-r from-amber-500 to-red-500 text-white border-0" : ""}`}
                  >
                    ABV {beer.abv}%
                  </Badge>
                  {beer.ibu != null && (
                    <Badge variant="outline">IBU {beer.ibu}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <RatingStars rating={beer.rating} size={18} />
                  {beer.ratingCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({beer.ratingCount.toLocaleString("ru-RU")} оценок)
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  🍻 {beer.totalCheckins?.toLocaleString("ru-RU")} чекинов
                  {beer.monthlyCheckins > 0 && (
                    <span>
                      {" "}
                      • +{beer.monthlyCheckins.toLocaleString("ru-RU")} за месяц
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card className="border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl overflow-hidden grain-overlay">
          <CardContent className="relative z-[2]">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="relative">
              <TabsList className="w-full glass-tab bg-amber-50/60 dark:bg-amber-900/15 p-1 h-auto rounded-b-none">
                <TabsTrigger
                  value="description"
                  className="flex-1 data-[state=active]:bg-white/80 dark:data-[state=active]:bg-stone-800/80 data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm text-xs sm:text-sm py-2.5 rounded-lg data-[state=active]:text-amber-800 dark:data-[state=active]:text-amber-300 transition-all duration-200"
                >
                  📋 Описание
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="flex-1 data-[state=active]:bg-white/80 dark:data-[state=active]:bg-stone-800/80 data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm text-xs sm:text-sm py-2.5 rounded-lg data-[state=active]:text-amber-800 dark:data-[state=active]:text-amber-300 transition-all duration-200"
                >
                  💬 Отзывы
                </TabsTrigger>
                <TabsTrigger
                  value="stats"
                  className="flex-1 data-[state=active]:bg-white/80 dark:data-[state=active]:bg-stone-800/80 data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm text-xs sm:text-sm py-2.5 rounded-lg data-[state=active]:text-amber-800 dark:data-[state=active]:text-amber-300 transition-all duration-200"
                >
                  📊 Статистика
                </TabsTrigger>
                <TabsTrigger
                  value="similar"
                  className="flex-1 data-[state=active]:bg-white/80 dark:data-[state=active]:bg-stone-800/80 data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm text-xs sm:text-sm py-2.5 rounded-lg data-[state=active]:text-amber-800 dark:data-[state=active]:text-amber-300 transition-all duration-200"
                >
                  🍻 Похожее
                </TabsTrigger>
              </TabsList>
              <motion.div
                className="tab-indicator"
                animate={{
                  left: activeTab === "description" ? "0%" : activeTab === "reviews" ? "25%" : activeTab === "stats" ? "50%" : "75%",
                  width: "25%",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>

            <TabsContent value="description" className="p-4 sm:p-6 mt-0">
              <div className="space-y-6">
                {beer.description && (
                  <div>
                    <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-widest">
                      О пиве
                    </h3>
                    <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                      {beer.description}
                    </p>
                  </div>
                )}

                <Separator className="bg-amber-200 dark:bg-amber-900/50" />

                {/* SRM color strip */}
                <div
                  className="h-1 rounded-full"
                  style={{ backgroundColor: getSRMColor(beer.style) }}
                />

                <div>
                  <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3 uppercase tracking-widest">
                    Характеристики
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {infoGrid.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10"
                      >
                        <item.icon className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Food Pairing */}
                <div className="mt-2">
                  <FoodPairing style={beer.style} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="p-4 sm:p-6 mt-0">
              <BeerReviews beerId={beer.id} />
            </TabsContent>

            <TabsContent value="stats" className="p-4 sm:p-6 mt-0">
              <BeerStatsView beerId={beer.id} />
            </TabsContent>

            <TabsContent value="similar" className="p-4 sm:p-6 mt-0">
              <SimilarBeers beerId={beer.id} onSelect={handleSelectSimilar} />
            </TabsContent>
          </Tabs>
          </CardContent>
        </Card>

        {/* Bottom Navigation - Frosted glass */}
        <div className="sticky bottom-0 z-10 bg-white/80 dark:bg-stone-900/80 backdrop-blur-2xl border-t border-amber-200/60 dark:border-amber-900/40 pt-3 pb-2 mt-4 -mx-4 px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("reviews")}
              className="gap-1.5 border-amber-300 dark:border-amber-700 text-xs"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Отзывы
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("stats")}
              className="gap-1.5 border-amber-300 dark:border-amber-700 text-xs"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Статистика
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("similar")}
              className="gap-1.5 border-amber-300 dark:border-amber-700 text-xs"
            >
              <BeerIcon className="h-3.5 w-3.5" />
              Похожее
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFavorite}
              className="gap-1.5 text-xs"
            >
              <Heart
                className={`h-3.5 w-3.5 ${
                  isFavorite ? "fill-red-500 text-red-500" : ""
                }`}
              />
              {isFavorite ? "В избранном" : "В избранное"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Назад
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goHome}
              className="gap-1.5 text-xs"
            >
              <Home className="h-3.5 w-3.5" />
              Главное
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}