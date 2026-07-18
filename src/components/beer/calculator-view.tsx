"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/beer/back-button";
import { useBeerStore } from "@/store/beer-store";
import { Plus, Trash2, Calculator } from "lucide-react";

interface Drink {
  id: string;
  abv: number;
  volume: number;
}

function getColorForBAC(bac: number): {
  color: string;
  bg: string;
  border: string;
  label: string;
  description: string;
} {
  if (bac < 0.3) {
    return {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30",
      border: "border-emerald-300 dark:border-emerald-700",
      label: "Можно водить",
      description: "Лёгкое расслабление, допустимый уровень",
    };
  }
  if (bac < 0.8) {
    return {
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "from-yellow-50 to-yellow-100 dark:from-yellow-950/40 dark:to-yellow-900/30",
      border: "border-yellow-300 dark:border-yellow-700",
      label: "Осторожно",
      description: "Снижение реакции, не садитесь за руль",
    };
  }
  if (bac < 1.5) {
    return {
      color: "text-orange-600 dark:text-orange-400",
      bg: "from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/30",
      border: "border-orange-300 dark:border-orange-700",
      label: "Опьянение",
      description: "Заметное нарушение координации и речи",
    };
  }
  return {
    color: "text-red-600 dark:text-red-400",
    bg: "from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30",
    border: "border-red-300 dark:border-red-700",
    label: "Сильное опьянение",
    description: "Серьёзное опьянение, риск для здоровья",
  };
}

function getProgressBarColor(bac: number): string {
  if (bac < 0.3) return "bg-emerald-500";
  if (bac < 0.8) return "bg-yellow-500";
  if (bac < 1.5) return "bg-orange-500";
  return "bg-red-500";
}

export function CalculatorView() {
  const setView = useBeerStore((s) => s.setView);

  const [gender, setGender] = useState<"male" | "female">("male");
  const [weight, setWeight] = useState(80);
  const [hours, setHours] = useState(1);
  const [drinks, setDrinks] = useState<Drink[]>([
    { id: crypto.randomUUID(), abv: 5, volume: 500 },
  ]);
  const [result, setResult] = useState<{
    bac: number;
    timeToSober: number;
    beerCans: number;
  } | null>(null);

  const addDrink = useCallback(() => {
    setDrinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), abv: 5, volume: 500 },
    ]);
  }, []);

  const removeDrink = useCallback((id: string) => {
    setDrinks((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const updateDrink = useCallback(
    (id: string, field: "abv" | "volume", value: number) => {
      setDrinks((prev) =>
        prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
      );
    },
    []
  );

  const calculate = useCallback(() => {
    const r = gender === "male" ? 0.68 : 0.55;
    const ethanolDensity = 0.789;

    let totalAlcoholGrams = 0;
    for (const drink of drinks) {
      totalAlcoholGrams +=
        drink.volume * (drink.abv / 100) * ethanolDensity;
    }

    let bac = totalAlcoholGrams / (weight * r) - 0.15 * hours;
    bac = Math.max(0, bac);

    const timeToSober = bac > 0 ? bac / 0.15 : 0;

    // One standard beer can: 500ml * 5% * 0.789 = ~19.7g ethanol
    const standardBeerGrams = 500 * 0.05 * ethanolDensity;
    const beerCans = Math.round(totalAlcoholGrams / standardBeerGrams * 10) / 10;

    setResult({ bac: Math.round(bac * 1000) / 1000, timeToSober: Math.round(timeToSober * 10) / 10, beerCans });
  }, [gender, weight, hours, drinks]);

  const levelInfo = result ? getColorForBAC(result.bac) : null;

  return (
    <div className="space-y-4">
      <BackButton onClick={() => setView("home")} />

      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <span className="text-3xl">🧮</span>
        Калькулятор промилле
      </h1>

      {/* Ваши данные */}
      <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Ваши данные</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Gender toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Пол
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  gender === "male"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-300/40 dark:shadow-amber-900/40"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                }`}
              >
                Мужской
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  gender === "female"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-300/40 dark:shadow-amber-900/40"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                }`}
              >
                Женский
              </button>
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <label
              htmlFor="weight-input"
              className="text-sm font-medium text-muted-foreground"
            >
              Вес (кг)
            </label>
            <Input
              id="weight-input"
              type="number"
              min={30}
              max={250}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value) || 0)}
              className="border-amber-200 dark:border-amber-800"
            />
          </div>
        </CardContent>
      </Card>

      {/* Что пили */}
      <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Что пили</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <AnimatePresence>
            {drinks.map((drink) => (
              <motion.div
                key={drink.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-end gap-2"
              >
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Крепость (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={drink.abv}
                    onChange={(e) =>
                      updateDrink(drink.id, "abv", Number(e.target.value) || 0)
                    }
                    className="border-amber-200 dark:border-amber-800 h-9"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Объём (мл)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    step={10}
                    value={drink.volume}
                    onChange={(e) =>
                      updateDrink(
                        drink.id,
                        "volume",
                        Number(e.target.value) || 0
                      )
                    }
                    className="border-amber-200 dark:border-amber-800 h-9"
                  />
                </div>
                {drinks.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDrink(drink.id)}
                    className="h-9 w-9 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    aria-label="Удалить напиток"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <Button
            variant="outline"
            onClick={addDrink}
            className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 gap-2"
          >
            <Plus className="h-4 w-4" />
            Добавить напиток
          </Button>
        </CardContent>
      </Card>

      {/* Время */}
      <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Время</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <label
            htmlFor="hours-input"
            className="text-sm font-medium text-muted-foreground"
          >
            Сколько времени прошло с первого напитка? (часы)
          </label>
          <Input
            id="hours-input"
            type="number"
            min={0}
            max={48}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value) || 0)}
            className="border-amber-200 dark:border-amber-800"
          />
        </CardContent>
      </Card>

      {/* Calculate button */}
      <Button
        onClick={calculate}
        size="lg"
        className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-lg shadow-amber-300/40 dark:shadow-amber-900/40 font-semibold text-base"
      >
        <Calculator className="h-5 w-5" />
        Рассчитать
      </Button>

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && levelInfo && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
          >
            <Card
              className={`overflow-hidden border-2 ${levelInfo.border}`}
            >
              <div className={`bg-gradient-to-br ${levelInfo.bg} p-6`}>
                {/* BAC Value */}
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Промилле
                  </p>
                  <motion.p
                    className={`text-5xl sm:text-6xl font-extrabold ${levelInfo.color}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      duration: 0.6,
                      type: "spring",
                      stiffness: 150,
                      damping: 12,
                    }}
                  >
                    {result.bac.toFixed(3)}
                  </motion.p>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mx-auto max-w-xs h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"
                  >
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{
                        width: `${Math.min((result.bac / 3) * 100, 100)}%`,
                      }}
                      transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                      className={`h-full rounded-full ${getProgressBarColor(result.bac)}`}
                    />
                  </motion.div>
                </div>

                {/* Status */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur-sm">
                    <span className="text-sm text-muted-foreground">
                      Состояние
                    </span>
                    <span
                      className={`text-sm font-semibold ${levelInfo.color}`}
                    >
                      {levelInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    {levelInfo.description}
                  </p>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur-sm">
                    <span className="text-sm text-muted-foreground">
                      Время до трезвости
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      ~{result.timeToSober.toFixed(1)} ч
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur-sm">
                    <span className="text-sm text-muted-foreground">
                      Эквивалент
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {result.beerCans} банок пива 🍺
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}