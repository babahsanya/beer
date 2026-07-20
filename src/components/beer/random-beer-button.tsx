"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

  // Track all timers so we can cancel them on unmount. Without this, a
  // navigation mid-spin would leave dangling intervals/timeouts calling
  // setState on an unmounted component.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

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
    intervalRef.current = setInterval(() => {
      setSlotText(slotNames[tick % slotNames.length]);
      tick++;
      if (tick >= maxTicks) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 80);

    try {
      const res = await fetch("/api/beers/random");
      if (res.ok) {
        const data: Beer & { reviewCount?: number } = await res.json();
        // Wait for animation to finish
        revealTimeoutRef.current = setTimeout(() => {
          revealTimeoutRef.current = null;
          setSlotText(data.name);
          transitionTimeoutRef.current = setTimeout(() => {
            transitionTimeoutRef.current = null;
            setShowSlot(false);
            setSpinning(false);
            selectBeer(data);
          }, 600);
        }, maxTicks * 80);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setShowSlot(false);
        setSpinning(false);
      }
    } catch {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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