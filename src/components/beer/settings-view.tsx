"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  Trash2,
  Database,
  Info,
  Shield,
  Palette,
  History,
  Heart,
  RefreshCw,
} from "lucide-react";
import { DataManager } from "@/components/beer/data-manager";
import { useToast } from "@/hooks/use-toast";
import { apiDelete, isUnauthorized, getErrorMessage } from "@/lib/api-client";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const clearHistory = async () => {
    try {
      await apiDelete("/api/history");
      toast({
        title: "История очищена",
        description: "Все поисковые запросы удалены",
      });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: isUnauthorized(err)
          ? "Войдите, чтобы управлять историей"
          : getErrorMessage(err, "Не удалось очистить историю"),
        variant: "destructive",
      });
    }
  };

  const clearFavorites = async () => {
    try {
      await apiDelete("/api/favorites?all=true");
      toast({
        title: "Избранное очищено",
        description: "Все избранные сорта удалены",
      });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: isUnauthorized(err)
          ? "Войдите, чтобы управлять избранным"
          : getErrorMessage(err, "Не удалось очистить избранное"),
        variant: "destructive",
      });
    }
  };

  const resetData = async () => {
    try {
      await apiDelete("/api/favorites?all=true");
      await apiDelete("/api/history");
      toast({
        title: "Данные сброшены",
        description: "История и избранное очищены",
      });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: isUnauthorized(err)
          ? "Войдите, чтобы сбросить данные"
          : getErrorMessage(err, "Не удалось сбросить данные"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold beer-gradient-text">Настройки</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Настройте BeerID под себя
        </p>
      </motion.div>

      <motion.div
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Theme */}
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Palette className="h-5 w-5 text-amber-500" />
                Внешний вид
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Theme toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30">
                <div className="flex items-center gap-3">
                  {mounted && theme === "dark" ? (
                    <Moon className="h-5 w-5 text-amber-400" />
                  ) : (
                    <Sun className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Тема оформления</p>
                    <p className="text-xs text-muted-foreground">
                      {mounted
                        ? theme === "dark"
                          ? "Тёмная тема активна"
                          : "Светлая тема активна"
                        : "..."}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  onClick={() =>
                    setTheme(theme === "dark" ? "light" : "dark")
                  }
                >
                  {mounted && theme === "dark" ? (
                    <>
                      <Sun className="h-4 w-4 mr-1.5" />
                      Светлая
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4 mr-1.5" />
                      Тёмная
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Management */}
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Database className="h-5 w-5 text-amber-500" />
                Управление данными
              </CardTitle>
              <p className="text-xs text-muted-foreground -mt-1">
                Управление локальными данными приложения
              </p>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">История поиска</p>
                    <p className="text-xs text-muted-foreground">
                      Очистить все сохранённые запросы
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300"
                  onClick={clearHistory}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Очистить
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Избранное</p>
                    <p className="text-xs text-muted-foreground">
                      Удалить все сохранённые сорта
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300"
                  onClick={clearFavorites}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Очистить
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/60 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      Сбросить всё
                    </p>
                    <p className="text-xs text-red-600/70 dark:text-red-500/60">
                      Очистить историю и избранное
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={resetData}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Сбросить
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Manager (Export / Import) */}
        <motion.div variants={itemVariants}>
          <DataManager />
        </motion.div>

        {/* Privacy */}
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Shield className="h-5 w-5 text-amber-500" />
                Конфиденциальность
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {[
                  "Все данные хранятся локально на вашем устройстве",
                  "Никакие учётные записи или авторизация не требуются",
                  "BeerID использует только открытые данные без OAuth",
                  "История поиска и избранное — локальные данные",
                  "Нет отслеживания, аналитики или сбора персональных данных",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground/80"
                  >
                    <span className="text-amber-500 mt-0.5 shrink-0">
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* About */}
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Info className="h-5 w-5 text-amber-500" />
                О приложении
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Версия", value: "1.0.0" },
                  { label: "Данные", value: "Открытые" },
                  { label: "Пивоварен", value: "15+" },
                  { label: "Сортов пива", value: "100+" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30 text-center"
                  >
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground pt-2">
                BeerID — пивная энциклопедия с открытыми данными
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="pb-4" />
    </div>
  );
}