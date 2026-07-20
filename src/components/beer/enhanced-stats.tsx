"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useBeerStore } from "@/store/beer-store";
import {
  Beer as BeerIcon,
  Star,
  Trophy,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";

/* ── Types ──────────────────────────────────────── */
interface StyleRating {
  style: string;
  avgRating: number;
  count: number;
}

interface AbvBucket {
  range: string;
  count: number;
}

interface IbuBucket {
  range: string;
  count: number;
}

interface CountryBucket {
  country: string;
  count: number;
}

interface TopBeer {
  name: string;
  rating: number;
  style: string;
  brewery: string;
}

interface StylePopularity {
  style: string;
  count: number;
}

interface ChartsData {
  styleRatings: StyleRating[];
  abvDistribution: AbvBucket[];
  ibuDistribution: IbuBucket[];
  countryDistribution: CountryBucket[];
  topRated: TopBeer[];
  stylePopularity: StylePopularity[];
}

/* ── Color palette ──────────────────────────────── */
const AMBER_COLORS = [
  "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e",
  "#78350f", "#a16207", "#ca8a04", "#eab308", "#facc15",
];

const AMBER_PIE_COLORS = [
  "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f",
];

/* ── Donut chart (pure SVG) ─────────────────────── */
function DonutChart({
  data,
  total,
  size = 220,
  strokeWidth = 36,
}: {
  data: { range: string; count: number }[];
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filtered = data.filter((d) => d.count > 0);

  if (filtered.length === 0) return null;

  let offset = 0;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/30"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {filtered.reduce<Array<React.ReactNode>>((acc, d, i) => {
          const pct = d.count / total;
          const dashLength = pct * circumference;
          const gap = circumference - dashLength;
          const color = AMBER_PIE_COLORS[i % AMBER_PIE_COLORS.length];
          const currentOffset = filtered
            .slice(0, i)
            .reduce((sum, prev) => sum + (prev.count / total) * circumference, 0);
          acc.push(
            <circle
              key={d.range}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-700"
            />
          );
          return acc;
        }, [])}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground">сортов</p>
        </div>
      </div>
    </div>
  );
}

/* ── Horizontal Bar (pure CSS) ──────────────────── */
function HBar({
  label,
  value,
  max,
  color,
  subtitle,
  delay = 0,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  subtitle?: string;
  delay?: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="space-y-1"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
          {label}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {subtitle ?? value.toFixed(2)}
        </span>
      </div>
      <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}

/* ── Main Component ─────────────────────────────── */
export function EnhancedStats() {
  const [data, setData] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const store = useBeerStore();

  useEffect(() => {
    async function fetchCharts() {
      try {
        const json = await apiGet<ChartsData>("/api/stats/charts");
        setData(json);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchCharts();
  }, []);

  /* ── Derived overview values ─────────────────── */
  const totalBeers =
    data?.abvDistribution?.reduce((sum, b) => sum + b.count, 0) ?? 0;
  const avgRating =
    data?.styleRatings?.length
      ? data.styleRatings.reduce((s, r) => s + r.avgRating * r.count, 0) /
        data.styleRatings.reduce((s, r) => s + r.count, 0)
      : 0;
  const mostPopularStyle = data?.stylePopularity?.[0]?.style ?? "—";
  const mostRepresentedCountry = data?.countryDistribution?.[0]?.country ?? "—";

  const overviewCards = [
    {
      icon: <BeerIcon className="h-5 w-5 text-amber-500" />,
      value: totalBeers.toLocaleString("ru-RU"),
      label: "Всего сортов",
    },
    {
      icon: <Star className="h-5 w-5 text-amber-500" />,
      value: avgRating.toFixed(2),
      label: "Средний рейтинг",
    },
    {
      icon: <Trophy className="h-5 w-5 text-amber-500" />,
      value: mostPopularStyle,
      label: "Популярный стиль",
    },
    {
      icon: <Globe className="h-5 w-5 text-amber-500" />,
      value: mostRepresentedCountry,
      label: "Представленная страна",
    },
  ];

  /* ── Skeleton loader ──────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => store.setView("home")}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  /* ── Styles data sorted by rating desc ────────── */
  const stylesByRating = [...data.styleRatings].sort(
    (a, b) => b.avgRating - a.avgRating
  ).slice(0, 12);

  const maxStyleRating = Math.max(...stylesByRating.map((s) => s.avgRating), 5);
  const maxCountryCount = Math.max(...data.countryDistribution.map((c) => c.count), 1);
  const maxIbuCount = Math.max(...data.ibuDistribution.map((b) => b.count), 1);

  return (
    <div className="space-y-6 pb-8">
      <button
        onClick={() => store.setView("home")}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChartIcon className="h-6 w-6 text-amber-500" />
          Аналитика пива
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Подробная статистика и визуализация данных
        </p>
      </motion.div>

      {/* ═══ Section 1: Overview Cards ═══ */}
      <div className="grid grid-cols-2 gap-4">
        {overviewCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.1 }}
          >
            <div className="glass-card rounded-2xl p-4 flex flex-col gap-2">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                {card.icon}
              </div>
              <div className="min-h-0">
                <p className="text-lg font-bold text-foreground truncate">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Section 2: Rating by Style (CSS Bars) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <h3 className="text-base font-bold text-foreground mb-4">
            Рейтинг по стилям
          </h3>
          {stylesByRating.length > 0 ? (
            <div className="space-y-3">
              {stylesByRating.map((s, i) => (
                <HBar
                  key={s.style}
                  label={s.style}
                  value={s.avgRating}
                  max={maxStyleRating}
                  color={AMBER_COLORS[i % AMBER_COLORS.length]}
                  subtitle={`${s.avgRating.toFixed(2)} ⭐ · ${s.count} ${s.count === 1 ? "сорт" : "сортов"}`}
                  delay={0.3 + i * 0.04}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет данных
            </p>
          )}
        </div>
      </motion.div>

      {/* ═══ Section 3: ABV Distribution (SVG Donut) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <h3 className="text-base font-bold text-foreground mb-4">
            Распределение крепости (ABV)
          </h3>
          {data.abvDistribution.some((b) => b.count > 0) ? (
            <div className="flex flex-col items-center gap-4">
              <DonutChart data={data.abvDistribution} total={totalBeers} />
              <div className="flex flex-wrap justify-center gap-3">
                {data.abvDistribution
                  .filter((b) => b.count > 0)
                  .map((b, i) => (
                    <div
                      key={b.range}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            AMBER_PIE_COLORS[i % AMBER_PIE_COLORS.length],
                        }}
                      />
                      <span>{b.range}</span>
                      <span className="font-medium text-foreground">
                        {b.count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет данных
            </p>
          )}
        </div>
      </motion.div>

      {/* ═══ Section 4: Country Distribution (CSS Bars) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <h3 className="text-base font-bold text-foreground mb-4">
            Пиво по странам
          </h3>
          {data.countryDistribution.length > 0 ? (
            <div className="space-y-3">
              {data.countryDistribution.slice(0, 10).map((c, i) => (
                <HBar
                  key={c.country}
                  label={c.country}
                  value={c.count}
                  max={maxCountryCount}
                  color={AMBER_COLORS[i % AMBER_COLORS.length]}
                  subtitle={`${c.count} ${c.count === 1 ? "сорт" : "сортов"}`}
                  delay={0.5 + i * 0.04}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет данных
            </p>
          )}
        </div>
      </motion.div>

      {/* ═══ Section 5: IBU Distribution (CSS Bars) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <h3 className="text-base font-bold text-foreground mb-4">
            Горечь по шкале IBU
          </h3>
          {data.ibuDistribution.some((b) => b.count > 0) ? (
            <div className="space-y-3">
              {data.ibuDistribution.map((b, i) => (
                <HBar
                  key={b.range}
                  label={b.range}
                  value={b.count}
                  max={maxIbuCount}
                  color={AMBER_COLORS[i % AMBER_COLORS.length]}
                  subtitle={`${b.count} ${b.count === 1 ? "сорт" : "сортов"}`}
                  delay={0.6 + i * 0.04}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет данных
            </p>
          )}
        </div>
      </motion.div>

      {/* ═══ Section 6: Top 10 Beers ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <h3 className="text-base font-bold text-foreground mb-4">
            Топ-10 пива
          </h3>
          {data.topRated.length > 0 ? (
            <div className="space-y-2">
              {data.topRated.map((beer, index) => {
                const rankColors = [
                  "text-yellow-500",
                  "text-stone-400",
                  "text-amber-700",
                ];
                const rankBg = [
                  "bg-yellow-100 dark:bg-yellow-900/30",
                  "bg-stone-100 dark:bg-stone-700/30",
                  "bg-orange-100 dark:bg-orange-900/30",
                ];
                const isTop3 = index < 3;
                return (
                  <motion.div
                    key={beer.name}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors duration-200 ${
                      isTop3
                        ? `${rankBg[index]} border border-amber-200/50 dark:border-amber-800/30`
                        : "hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                    }`}
                  >
                    {/* Rank */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                        isTop3
                          ? `${rankColors[index]} ${rankBg[index]}`
                          : "bg-amber-50 dark:bg-amber-900/20 text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {beer.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {beer.brewery}
                      </p>
                    </div>

                    {/* Style badge */}
                    <Badge
                      variant="secondary"
                      className="hidden sm:inline-flex text-xs shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-0"
                    >
                      {beer.style}
                    </Badge>

                    {/* Rating stars */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {beer.rating.toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет данных
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Tiny BarChart icon (inline SVG) ── */
function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}