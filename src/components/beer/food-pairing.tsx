"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { getFoodPairings } from "@/lib/food-pairings";

interface FoodPairingProps {
  style: string;
}

export function FoodPairing({ style }: FoodPairingProps) {
  const pairings = getFoodPairings(style);

  return (
    <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <UtensilsCrossed className="h-5 w-5 text-amber-500" />
          Гастрономические пары
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground -mt-1">
          Идеальные закуски к {style}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {pairings.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.06 }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30 hover:bg-amber-100/60 dark:hover:bg-amber-900/25 transition-colors"
            >
              <span className="text-xl shrink-0">{item.emoji}</span>
              <span className="text-sm font-medium text-foreground/80 truncate">
                {item.name}
              </span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}