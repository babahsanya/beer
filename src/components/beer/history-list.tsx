"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { Clock, Trash2, Search } from "lucide-react";
import { useBeerStore } from "@/store/beer-store";
import { useToast } from "@/hooks/use-toast";
import type { SearchHistory } from "@/types/beer";

interface HistoryListProps {
  onSearch?: (query: string) => void;
}

export function HistoryList({ onSearch }: HistoryListProps) {
  const { setView, setSearchQuery } = useBeerStore();
  const { toast } = useToast();
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error("Ошибка");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const clearHistory = async () => {
    try {
      setClearing(true);
      await fetch("/api/history", { method: "DELETE" });
      setHistory([]);
      toast({ title: "История очищена" });
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось очистить историю",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    } else {
      setView("search");
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "только что";
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    return `${diffDays} дн назад`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-14 rounded-xl bg-amber-100 dark:bg-amber-900/30"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Мои последние поиски
        </h2>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            disabled={clearing}
            className="text-muted-foreground hover:text-red-500 gap-1.5 text-sm"
          >
            <Trash2 className="h-4 w-4" />
            Очистить
          </Button>
        )}
      </div>

      {/* Empty */}
      {history.length === 0 && (
        <EmptyState
          title="История пуста"
          description="Ваши поиски будут отображаться здесь"
          icon={<Clock className="h-8 w-8 text-amber-500" />}
        />
      )}

      {/* List */}
      <div className="space-y-2">
        {history.map((item) => (
          <Card
            key={item.id}
            className="group cursor-pointer border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-600 transition-all duration-200"
            onClick={() => handleSearch(item.query)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Search className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {item.query}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(item.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}