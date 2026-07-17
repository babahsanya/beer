"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dice5, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBeerStore } from "@/store/beer-store";
import type { Beer } from "@/types/beer";

export function RandomBeerButton() {
  const [spinning, setSpinning] = useState(false);
  const [showSlot, setShowSlot] = useState(false);
  const [slotText, setSlotText] = useState("");
  const { selectBeer } = useBeerStore();

  const slotNames = [
    "Жигулёвское",
    "Невское",
    "Балтика №9",
    "Толстяк",
    "Афанасий",
    "Пивзаводчик",
    "Хмельной",
    "Солодовый",
  ];

  const handleRandom = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    setShowSlot(true);

    // Slot machine animation
    let tick = 0;
    const maxTicks = 12;
    const interval = setInterval(() => {
      setSlotText(slotNames[tick % slotNames.length]);
      tick++;
      if (tick >= maxTicks) {
        clearInterval(interval);
      }
    }, 80);

    try {
      const res = await fetch("/api/beers/random");
      if (res.ok) {
        const data: Beer & { reviewCount?: number } = await res.json();
        // Wait for animation to finish
        setTimeout(() => {
          setSlotText(data.name);
          setTimeout(() => {
            setShowSlot(false);
            setSpinning(false);
            selectBeer(data);
          }, 600);
        }, maxTicks * 80);
      } else {
        clearInterval(interval);
        setShowSlot(false);
        setSpinning(false);
      }
    } catch {
      clearInterval(interval);
      setShowSlot(false);
      setSpinning(false);
    }
  }, [spinning, selectBeer]);

  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence>
        {showSlot && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="h-10 flex items-center justify-center overflow-hidden w-full max-w-xs"
          >
            <motion.p
              key={slotText}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.05 }}
              className="text-lg font-bold text-amber-600 dark:text-amber-400 truncate"
            >
              {slotText}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          onClick={handleRandom}
          disabled={spinning}
          className="gap-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 px-6 h-11"
        >
          {spinning ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Dice5 className="h-5 w-5" />
          )}
          {spinning ? "Ищем..." : "Случайное пиво"}
        </Button>
      </motion.div>
    </div>
  );
}