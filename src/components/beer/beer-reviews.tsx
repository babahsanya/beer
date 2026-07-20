"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RatingStars } from "./rating-stars";
import { EmptyState } from "./empty-state";
import { MessageSquare, Loader2, Star, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost, isUnauthorized, getErrorMessage } from "@/lib/api-client";
import { plural, PLURAL_REVIEW } from "@/lib/plural";
import type { Review } from "@/types/beer";

interface BeerReviewsProps {
  beerId: string;
}

interface ReviewsResponse {
  reviews: Review[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

// Pure helper — moved outside the component so the render output is stable.
// The computed time-ago depends on the current time, which differs between
// SSR and CSR; we render the value with `suppressHydrationWarning` so the
// client can take over without React throwing a mismatch.
function formatTimeAgo(dateStr: string): string {
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
}

export function BeerReviews({ beerId }: BeerReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 4;
  const [offset, setOffset] = useState(0);

  // Form state
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const fetchReviews = useCallback(async (newOffset: number, append: boolean) => {
    try {
      const data = await apiGet<ReviewsResponse>(
        `/api/beers/${beerId}/reviews?limit=${limit}&offset=${newOffset}`,
      );
      const list = data.reviews || [];
      if (append) {
        setReviews((prev) => [...prev, ...list]);
      } else {
        setReviews(list);
      }
      setTotal(data.pagination?.total || 0);
      setOffset(newOffset + list.length);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось загрузить отзывы"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [beerId]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchReviews(0, false);
  }, [fetchReviews]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchReviews(offset, true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!author.trim() || author.trim().length < 2) {
      setFormError("Имя автора обязательно (минимум 2 символа)");
      return;
    }
    if (rating < 1) {
      setFormError("Пожалуйста, поставьте оценку");
      return;
    }
    if (comment.length > 500) {
      setFormError("Комментарий не должен превышать 500 символов");
      return;
    }

    setSubmitting(true);
    try {
      const newReview = await apiPost<Review>(
        `/api/beers/${beerId}/reviews`,
        { author: author.trim(), rating, comment: comment.trim() },
      );

      // Add the new review to the top of the list
      setReviews((prev) => [newReview, ...prev]);
      setTotal((prev) => prev + 1);

      // Clear form
      setAuthor("");
      setRating(0);
      setComment("");
      setShowForm(false);

      toast({
        title: "Отзыв опубликован!",
        description: "Спасибо за ваш отзыв",
      });
    } catch (err) {
      setFormError(
        isUnauthorized(err)
          ? "Войдите, чтобы оставить отзыв"
          : getErrorMessage(err, "Ошибка при отправке отзыва"),
      );
    } finally {
      setSubmitting(false);
    }
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

  if (error && reviews.length === 0) {
    return <EmptyState title={error} description="Попробуйте позже" />;
  }

  const hasMore = reviews.length < total;

  return (
    <div className="space-y-4">
      {/* Review Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <Card className="border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-amber-950/30 dark:to-stone-900/30">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-base font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Оставить отзыв
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Author input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Ваше имя <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Введите имя..."
                    className="border-amber-200 dark:border-amber-800 bg-white dark:bg-stone-800 focus-visible:ring-amber-400 h-9 text-sm"
                    maxLength={50}
                    disabled={submitting}
                  />
                </div>

                {/* Star rating */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Оценка <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        disabled={submitting}
                        className="p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                        aria-label={`Оценка ${star}`}
                      >
                        <Star
                          size={24}
                          className={
                            star <= rating
                              ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                              : "text-muted-foreground/25 hover:text-amber-300/60"
                          }
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-2 text-sm font-bold text-amber-600 dark:text-amber-400"
                      >
                        {rating}.0
                      </motion.span>
                    )}
                  </div>
                </div>

                {/* Comment textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Комментарий
                  </label>
                  <Textarea
                    value={comment}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setComment(e.target.value);
                      }
                    }}
                    placeholder="Поделитесь впечатлениями..."
                    className="border-amber-200 dark:border-amber-800 bg-white dark:bg-stone-800 focus-visible:ring-amber-400 text-sm min-h-[80px] resize-none"
                    maxLength={500}
                    disabled={submitting}
                  />
                  <div className="flex justify-end">
                    <span
                      className={`text-xs ${
                        comment.length >= 450
                          ? "text-amber-600 dark:text-amber-400 font-medium"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {comment.length}/500
                    </span>
                  </div>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {formError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-red-500 font-medium"
                    >
                      {formError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !author.trim() || rating < 1}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold h-9 text-sm shadow-md shadow-amber-200/50 dark:shadow-amber-900/30 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Отправить отзыв
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle form button (when form is hidden) */}
      {!showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 gap-2 h-9 text-sm"
          >
            <MessageSquare className="h-4 w-4" />
            Написать отзыв
          </Button>
        </motion.div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 && !loading ? (
        <EmptyState
          title="Пока нет отзывов"
          description="Будьте первым, кто оставит отзыв об этом пиве"
          icon={<MessageSquare className="h-8 w-8 text-amber-500" />}
        />
      ) : (
        <>
          {/* Reviews counter */}
          <p className="text-xs text-muted-foreground text-center">
            Показано {reviews.length} из {total}{" "}
            {plural(total, PLURAL_REVIEW)}
          </p>

          <div className="space-y-3">
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
                        <span
                          className="text-xs text-muted-foreground shrink-0"
                          suppressHydrationWarning
                        >
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
          </div>
        </>
      )}

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