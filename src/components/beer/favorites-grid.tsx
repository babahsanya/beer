"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { RatingStars } from "./rating-stars";
import { Heart, Trash2 } from "lucide-react";
import { useBeerStore } from "@/store/beer-store";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import type { Favorite } from "@/types/beer";

export function FavoritesGrid() {
  const { selectBeer } = useBeerStore();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/favorites");
      if (!res.ok) throw new Error("Ошибка");
      const data = await res.json();
      setFavorites(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const removeFavorite = async (e: React.MouseEvent, beerId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/favorites?beerId=${beerId}`, { method: "DELETE" });
      setFavorites((prev) => prev.filter((f) => f.beerId !== beerId));
      toast({ title: "Удалено из избранного" });
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-32 rounded-xl bg-amber-100 dark:bg-amber-900/30"
          />
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        title="У вас пока нет избранных сортов"
        description="Нажмите ❤️ на странице пива, чтобы добавить его в избранное"
        icon={<Heart className="h-8 w-8 text-amber-500" />}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {favorites.map((fav) => (
        <Card
          key={fav.id}
          className="group cursor-pointer border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-lg hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20 hover:scale-[1.01] grain-overlay transition-all duration-300 ease-out"
          onClick={() => selectBeer(fav.beer)}
        >
          <CardContent className="relative z-[2] p-3 sm:p-4">
            <div className="flex gap-3">
              {/* Label */}
              <div className="relative h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/20 shadow-sm">
                {fav.beer?.label ? (
                  <Image
                    src={fav.beer.label}
                    alt={fav.beer.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-lg">🍺</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground truncate">
                  {fav.beer?.name || "Неизвестное пиво"}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {fav.beer?.brewery} • {fav.beer?.style}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <RatingStars
                    rating={fav.beer?.rating || 0}
                    size={12}
                    showValue={false}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                    onClick={(e) => removeFavorite(e, fav.beerId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}