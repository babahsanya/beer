"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BackButton } from "@/components/beer/back-button";
import { useBeerStore } from "@/store/beer-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, CheckCircle2 } from "lucide-react";
import type { Achievement } from "@/types/beer";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AchievementsView() {
  const setView = useBeerStore((s) => s.setView);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    try {
      // Sync progress first
      await fetch("/api/achievements/check");
      // Then fetch all
      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setAchievements(data.achievements || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;
  const overallProgress =
    totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setView("home")} />
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackButton onClick={() => setView("home")} />

      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <span className="text-3xl">🏆</span>
        Достижения
      </h1>

      {/* Progress summary */}
      <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">
                {unlockedCount} из {totalCount} разблокировано
              </span>
            </div>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Achievement grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {achievements.map((achievement) => {
          const isUnlocked = !!achievement.unlockedAt;
          const progressPct =
            achievement.target > 0
              ? Math.min((achievement.progress / achievement.target) * 100, 100)
              : 0;

          return (
            <motion.div key={achievement.id} variants={itemVariants}>
              <Card
                className={`h-full transition-all duration-300 ${
                  isUnlocked
                    ? "border-2 border-emerald-400 dark:border-emerald-600 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-stone-800/70 shadow-md shadow-emerald-200/30 dark:shadow-emerald-900/20"
                    : "border-2 border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl opacity-80"
                }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl">{achievement.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {achievement.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                    {isUnlocked && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={
                          isUnlocked
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {isUnlocked
                          ? "✅ Разблокировано"
                          : `${achievement.progress}/${achievement.target}`}
                      </span>
                      {!isUnlocked && (
                        <span className="text-muted-foreground">
                          {Math.round(progressPct)}%
                        </span>
                      )}
                    </div>
                    <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full transition-colors ${
                          isUnlocked
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-amber-400 to-amber-500"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Unlocked date */}
                  {isUnlocked && achievement.unlockedAt && (
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(achievement.unlockedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}