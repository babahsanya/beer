"use client";

import { useBeerStore } from "@/store/beer-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "./back-button";
import { RatingStars } from "./rating-stars";
import { ArrowLeftRight, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Beer as BeerIcon } from "lucide-react";

function CompareCell({
  value,
  isWinner,
}: {
  value: string | number;
  isWinner?: boolean;
}) {
  return (
    <span
      className={`text-sm font-medium px-2 py-1 rounded-md inline-flex items-center gap-1 ${
        isWinner
          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
          : "text-foreground"
      }`}
    >
      {value}
      {isWinner && <Trophy className="h-3 w-3 text-emerald-500" />}
    </span>
  );
}

export function CompareView() {
  const { compareBeers, clearCompare, goHome, selectBeer } = useBeerStore();
  const [a, b] = compareBeers;

  if (!a || !b) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 text-amber-300" />
        <p className="text-sm">Выберите 2 пива для сравнения</p>
        <Button variant="ghost" onClick={goHome} className="mt-4 text-amber-600 dark:text-amber-400">
          На главную
        </Button>
      </div>
    );
  }

  const rows: { label: string; key: string; numeric?: boolean; higherBetter?: boolean; format?: (v: number) => string }[] = [
    { label: "Название", key: "name" },
    { label: "Пивоварня", key: "brewery" },
    { label: "Страна", key: "country" },
    { label: "Стиль", key: "style" },
    { label: "ABV %", key: "abv", numeric: true, higherBetter: false, format: (v) => v.toFixed(1) },
    { label: "IBU", key: "ibu", numeric: true, higherBetter: false },
    { label: "Рейтинг", key: "rating", numeric: true, higherBetter: true },
    { label: "Оценок", key: "ratingCount", numeric: true, higherBetter: true },
    { label: "Чекины", key: "totalCheckins", numeric: true, higherBetter: true },
  ];

  const getWinner = (key: string): "left" | "right" | "tie" | null => {
    const row = rows.find((r) => r.key === key);
    if (!row?.numeric) return null;
    const va = a[key as keyof typeof a] as number;
    const vb = b[key as keyof typeof b] as number;
    if (typeof va !== "number" || typeof vb !== "number") return null;
    if (va === vb) return "tie";
    const higherBetter = row.higherBetter ?? false;
    return higherBetter
      ? (va > vb ? "left" : "right")
      : (va < vb ? "left" : "right");
  };

  const formatValue = (row: typeof rows[number], beer: typeof a) => {
    const raw = beer[row.key as keyof typeof beer];
    if (row.format && typeof raw === "number") {
      return row.format(raw);
    }
    if (typeof raw === "number") {
      return raw.toLocaleString("ru-RU");
    }
    return String(raw ?? "—");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackButton onClick={() => { clearCompare(); goHome(); }} label="Назад" />
        <Button
          variant="outline"
          size="sm"
          onClick={clearCompare}
          className="text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
        >
          Очистить
        </Button>
      </div>

      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <ArrowLeftRight className="h-5 w-5 text-amber-500" />
        Сравнение пива
      </h1>

      {/* Beer headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <Card
          className="border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
          onClick={() => { clearCompare(); selectBeer(a); }}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="relative h-12 w-10 shrink-0 rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/20">
              {a.label ? (
                <Image src={a.label} alt={a.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BeerIcon className="h-5 w-5 text-amber-400" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{a.name}</p>
              <p className="text-xs text-muted-foreground truncate">{a.brewery}</p>
            </div>
          </CardContent>
        </Card>

        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-muted-foreground text-xs font-bold bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full"
        >
          VS
        </motion.span>

        <Card
          className="border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
          onClick={() => { clearCompare(); selectBeer(b); }}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="relative h-12 w-10 shrink-0 rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/20">
              {b.label ? (
                <Image src={b.label} alt={b.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BeerIcon className="h-5 w-5 text-amber-400" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{b.name}</p>
              <p className="text-xs text-muted-foreground truncate">{b.brewery}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison rows */}
      <Card className="border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800 overflow-hidden">
        <CardContent className="p-0">
          {rows.map((row, i) => {
            const winner = getWinner(row.key);
            return (
              <motion.div
                key={row.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className={`grid grid-cols-[1fr_auto_1fr] gap-3 items-center ${
                  i > 0
                    ? "border-t border-amber-100 dark:border-amber-900/30"
                    : ""
                }`}
              >
                <div className="px-4 py-3 text-center">
                  {row.key === "rating" ? (
                    <div className="flex flex-col items-center gap-1">
                      <CompareCell
                        value={a.rating.toFixed(1)}
                        isWinner={winner === "left"}
                      />
                      <RatingStars rating={a.rating} size={10} />
                    </div>
                  ) : (
                    <CompareCell
                      value={formatValue(row, a)}
                      isWinner={winner === "left"}
                    />
                  )}
                </div>
                <div className="px-3 py-3 text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {row.label}
                  </span>
                </div>
                <div className="px-4 py-3 text-center">
                  {row.key === "rating" ? (
                    <div className="flex flex-col items-center gap-1">
                      <CompareCell
                        value={b.rating.toFixed(1)}
                        isWinner={winner === "right"}
                      />
                      <RatingStars rating={b.rating} size={10} />
                    </div>
                  ) : (
                    <CompareCell
                      value={formatValue(row, b)}
                      isWinner={winner === "right"}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}