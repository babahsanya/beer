"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RatingStars } from "./rating-stars";
import { EmptyState } from "./empty-state";
import { MessageSquare, Loader2 } from "lucide-react";
import type { Review } from "@/types/beer";

interface BeerReviewsProps {
  beerId: string;
}

export function BeerReviews({ beerId }: BeerReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 4;
  const [offset, setOffset] = useState(0);

  const fetchReviews = async (newOffset: number, append: boolean) => {
    try {
      const res = await fetch(
        `/api/beers/${beerId}/reviews?limit=${limit}&offset=${newOffset}`
      );
      if (!res.ok) throw new Error("Ошибка загрузки");
      const data = await res.json();
      if (append) {
        setReviews((prev) => [...prev, ...(data.reviews || [])]);
      } else {
        setReviews(data.reviews || []);
      }
      setTotal(data.pagination?.total || data.total || 0);
      setOffset(newOffset + (data.reviews?.length || 0));
      setError(null);
    } catch {
      setError("Не удалось загрузить отзывы");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchReviews(0, false);
  }, [beerId]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchReviews(offset, true);
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return "только что";
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 30) return `${diffDays} дн назад`;
    return `${diffMonths} мес назад`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={i}
            className="border-amber-200 dark:border-amber-900/50"
          >
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 bg-amber-100 dark:bg-amber-900/30" />
                  <Skeleton className="h-4 w-32 bg-amber-100 dark:bg-amber-900/30" />
                  <Skeleton className="h-12 w-full bg-amber-100 dark:bg-amber-900/30" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState title={error} description="Попробуйте позже" />;
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="Пока нет отзывов"
        description="Будьте первым, кто оставит отзыв об этом пиве"
        icon={<MessageSquare className="h-8 w-8 text-amber-500" />}
      />
    );
  }

  const hasMore = reviews.length < total;

  return (
    <div className="space-y-3">
      {/* Reviews counter */}
      <p className="text-xs text-muted-foreground text-center">
        Показано {reviews.length} из {total}{" "}
        {total === 1
          ? "отзыва"
          : total >= 2 && total <= 4
          ? "отзывов"
          : "отзывов"}
      </p>

      {reviews.map((review) => (
        <Card
          key={review.id}
          className="border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800"
        >
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30">
                <AvatarFallback className="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-sm font-semibold">
                  {review.author?.slice(0, 2).toUpperCase() || "???"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-foreground">
                    {review.author || "Аноним"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTimeAgo(review.createdAt)}
                  </span>
                </div>
                <div className="mt-1">
                  <RatingStars rating={review.rating} size={12} />
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {hasMore && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка...
              </>
            ) : (
              `Ещё отзывы (${total - reviews.length})`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}