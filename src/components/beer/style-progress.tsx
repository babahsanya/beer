"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Target, Star, Award, Lock, Trophy, GraduationCap, Crown, Sparkles } from "lucide-react";
import { useBeerStore } from "@/store/beer-store";

// ── Style visual config ──────────────────────────────────────────────
const styleConfig: Record<string, { emoji: string; color: string; bg: string; ruName: string }> = {
  "IPA": { emoji: "🌿", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", ruName: "ИПА" },
  "Stout": { emoji: "🖤", color: "text-stone-700 dark:text-stone-300", bg: "bg-stone-100 dark:bg-stone-800/50", ruName: "Стаут" },
  "Lager": { emoji: "✨", color: "text-yellow-500 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", ruName: "Лагер" },
  "Wheat Beer": { emoji: "🌾", color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", ruName: "Пшеничное" },
  "Porter": { emoji: "🟤", color: "text-amber-700 dark:text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", ruName: "Портер" },
  "Sour": { emoji: "🍋", color: "text-lime-500 dark:text-lime-400", bg: "bg-lime-50 dark:bg-lime-900/20", ruName: "Кислый эль" },
  "Pilsner": { emoji: "💫", color: "text-yellow-400 dark:text-yellow-300", bg: "bg-yellow-50 dark:bg-yellow-900/20", ruName: "Пилснер" },
  "Belgian": { emoji: "🏰", color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", ruName: "Бельгийское" },
  "Pale Ale": { emoji: "🍂", color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", ruName: "Пейл-эль" },
  "Amber Ale": { emoji: "🪵", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", ruName: "Янтарный эль" },
  "Brown Ale": { emoji: "🌰", color: "text-amber-800 dark:text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", ruName: "Коричневый эль" },
  "Barleywine": { emoji: "🍷", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", ruName: "Ячменное вино" },
};

function getStyleConf(styleName: string) {
  return styleConfig[styleName] ?? { emoji: "🍺", color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", ruName: styleName };
}

// ── Types ────────────────────────────────────────────────────────────
interface StyleProgressData {
  name: string;
  totalBeers: number;
  viewedBeers: number;
  discovered: boolean;
  topRatedBeerName: string | null;
  topRatedBeerRating: number | null;
}

interface StyleProgressResponse {
  styles: StyleProgressData[];
  totalStyles: number;
  discoveredStyles: number;
  percentage: number;
}

// ── Achievement definitions ──────────────────────────────────────────
const achievements = [
  { key: "novice", title: "Новичок", desc: "Открыто 3+ стиля", icon: Star, threshold: 3 },
  { key: "connoisseur", title: "Знаток", desc: "Открыто 6+ стилей", icon: Award, threshold: 6 },
  { key: "expert", title: "Эксперт", desc: "Открыто 9+ стилей", icon: GraduationCap, threshold: 9 },
  { key: "master", title: "Мастер", desc: "Открыты все стили", icon: Crown, threshold: 999 },
];

// ── SVG Progress Ring ────────────────────────────────────────────────
function ProgressRing({ percentage, discovered, total }: { percentage: number; discovered: number; total: number }) {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-amber-100 dark:text-amber-900/30"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        {/* Animated progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-foreground"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {discovered} <span className="text-muted-foreground text-base font-normal">из {total}</span>
        </motion.span>
        <motion.span
          className="text-sm font-semibold beer-gradient-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.1 }}
        >
          {percentage}%
        </motion.span>
      </div>
    </div>
  );
}

interface StyleProgressProps {
  onSearchStyle?: (styleName: string) => void;
}

// ── Main Component ───────────────────────────────────────────────────
export function StyleProgress({ onSearchStyle }: StyleProgressProps) {
  const [data, setData] = useState<StyleProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const setView = useBeerStore((s) => s.setView);
  const setSearchQuery = useBeerStore((s) => s.setSearchQuery);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch("/api/styles/progress");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        {/* Progress ring skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-[140px] w-[140px] rounded-full" />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.totalStyles === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <Target className="h-10 w-10 mx-auto mb-3 text-amber-400/60" />
        <p className="text-muted-foreground text-sm">
          Стили пива пока не загружены. Попробуйте позже.
        </p>
      </div>
    );
  }

  // Determine master threshold as totalStyles
  const masterAchievements = achievements.map((a) => ({
    ...a,
    unlocked:
      a.key === "master"
        ? data.discoveredStyles === data.totalStyles && data.totalStyles > 0
        : data.discoveredStyles >= a.threshold,
  }));

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Исследователь стилей</h2>
          <p className="text-xs text-muted-foreground">Открывайте новые сорта пива</p>
        </div>
      </motion.div>

      {/* ── Overall Progress Ring ───────────────────────────────── */}
      <motion.div
        className="glass-card rounded-2xl p-6 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <ProgressRing
          percentage={data.percentage}
          discovered={data.discoveredStyles}
          total={data.totalStyles}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {data.discoveredStyles === 0
            ? "Начните просматривать пиво, чтобы открывать стили"
            : data.discoveredStyles === data.totalStyles
              ? "Вы открыли все стили! Настоящий мастер!"
              : `Ещё ${data.totalStyles - data.discoveredStyles} ${getPluralStyle(data.totalStyles - data.discoveredStyles)} до полного открытия`}
        </p>
      </motion.div>

      {/* ── Style Grid ──────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
        }}
      >
        {data.styles.map((style) => {
          const conf = getStyleConf(style.name);
          const progressPct = style.totalBeers > 0 ? Math.round((style.viewedBeers / style.totalBeers) * 100) : 0;

          return (
            <motion.div
              key={style.name}
              variants={{
                hidden: { opacity: 0, y: 14 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
              }}
            >
              <Card
                className={`
                  relative overflow-hidden h-full cursor-pointer
                  border-amber-200 dark:border-amber-900/40
                  bg-white dark:bg-stone-800
                  hover:border-amber-400 dark:hover:border-amber-600
                  hover:shadow-xl hover:shadow-amber-200/20 dark:hover:shadow-amber-900/20
                  transition-all duration-300 ease-out
                  hover:scale-[1.03]
                  ${style.discovered ? "" : "opacity-75"}
                `}
                onClick={() => {
                  // Trigger search if the parent provided a handler, otherwise
                  // fall back to switching the view directly.
                  if (onSearchStyle) {
                    onSearchStyle(style.name);
                  } else {
                    setSearchQuery(style.name);
                    setView("search");
                  }
                }}
              >
                <CardContent className="relative z-[2] p-4 flex flex-col gap-2">
                  {/* Emoji + name */}
                  <div className="flex items-start gap-2">
                    <span className="text-2xl leading-none">{conf.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-sm leading-tight ${conf.color}`}>
                        {conf.ruName}
                      </h3>
                      <p className="text-[11px] text-muted-foreground truncate">{style.name}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        Просмотрено {style.viewedBeers} из {style.totalBeers}{" "}
                        {getPluralBeer(style.totalBeers)}
                      </span>
                      <span className="font-medium">{progressPct}%</span>
                    </div>
                    <Progress
                      value={progressPct}
                      className={`h-1.5 ${conf.bg}`}
                    />
                  </div>

                  {/* Badge */}
                  {style.discovered ? (
                    <Badge
                      className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/40 text-[10px] gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Открыт
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] gap-1 text-muted-foreground"
                    >
                      <Lock className="h-3 w-3" />
                      Не открыт
                    </Badge>
                  )}

                  {/* Top rated beer if discovered */}
                  {style.discovered && style.topRatedBeerName && (
                    <p className="text-[10px] text-muted-foreground/80 truncate mt-auto pt-1 border-t border-border/50">
                      <Trophy className="h-3 w-3 inline-block mr-0.5 text-amber-500" />
                      {style.topRatedBeerName}
                      {style.topRatedBeerRating != null && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400">
                          ★ {style.topRatedBeerRating.toFixed(1)}
                        </span>
                      )}
                    </p>
                  )}
                </CardContent>

                {/* Subtle glow on hover for discovered */}
                {style.discovered && (
                  <div
                    className={`
                      absolute inset-0 z-[1] opacity-0
                      hover:opacity-100 transition-opacity duration-500 pointer-events-none
                      ${conf.bg}
                    `}
                  />
                )}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Achievement Badges ──────────────────────────────────── */}
      <motion.div
        className="glass-card rounded-2xl p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Достижения исследователя
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {masterAchievements.map((ach, idx) => {
            const Icon = ach.icon;
            return (
              <motion.div
                key={ach.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.6 + idx * 0.08 }}
                className={`
                  flex flex-col items-center gap-2 p-3 rounded-xl border text-center
                  transition-all duration-300
                  ${ach.unlocked
                    ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
                    : "border-border/50 bg-muted/30 opacity-50"
                  }
                `}
              >
                <div
                  className={`
                    flex items-center justify-center h-10 w-10 rounded-full
                    ${ach.unlocked
                      ? "bg-amber-200 dark:bg-amber-800/50"
                      : "bg-muted"
                    }
                  `}
                >
                  <Icon
                    className={`h-5 w-5 ${ach.unlocked ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                  />
                </div>
                <div>
                  <p className={`text-xs font-bold ${ach.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                    {ach.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{ach.desc}</p>
                </div>
                {ach.unlocked && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/40 text-[9px]">
                    ✓ Получено
                  </Badge>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function getPluralBeer(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return "пив";
  if (lastDigit > 1 && lastDigit < 5) return "пива";
  if (lastDigit === 1) return "пиво";
  return "пив";
}

function getPluralStyle(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return "стилей";
  if (lastDigit > 1 && lastDigit < 5) return "стиля";
  if (lastDigit === 1) return "стиль";
  return "стилей";
}