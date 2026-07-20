"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBeerStore } from "@/store/beer-store";
import type { Beer } from "@/types/beer";
import { Star, Loader2, RotateCcw, ArrowLeft } from "lucide-react";

// ---------- Wheel Configuration ----------
const SEGMENTS = [
  { style: "IPA", color: "#D97706", lightColor: "#F59E0B", emoji: "🟠" },
  { style: "Stout", color: "#292524", lightColor: "#44403C", emoji: "⚫" },
  { style: "Lager", color: "#EAB308", lightColor: "#FACC15", emoji: "🌟" },
  { style: "Wheat Beer", color: "#F5DEB3", lightColor: "#FAEBD7", emoji: "🌾" },
  { style: "Porter", color: "#78350F", lightColor: "#92400E", emoji: "🟤" },
  { style: "Sour", color: "#DC2626", lightColor: "#EF4444", emoji: "🍒" },
  { style: "Pilsner", color: "#CA8A04", lightColor: "#EAB308", emoji: "✨" },
  { style: "Belgian", color: "#B45309", lightColor: "#D97706", emoji: "🏰" },
  { style: "Pale Ale", color: "#A16207", lightColor: "#CA8A04", emoji: "🌿" },
  { style: "Amber Ale", color: "#C2410C", lightColor: "#EA580C", emoji: "🪵" },
  { style: "Brown Ale", color: "#44403C", lightColor: "#57534E", emoji: "🌰" },
  { style: "Barleywine", color: "#92400E", lightColor: "#B45309", emoji: "🍷" },
] as const;

const SEGMENT_ANGLE = 360 / SEGMENTS.length; // 30 degrees each

interface SpinResult {
  style: string;
  emoji: string;
  beer: Beer | null;
  notFound?: boolean;
}

interface SpinHistoryItem {
  style: string;
  emoji: string;
  beerName: string | null;
  timestamp: number;
}

export function BeerRoulette() {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isPointerPulsing, setIsPointerPulsing] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [isLoadingBeer, setIsLoadingBeer] = useState(false);
  const [history, setHistory] = useState<SpinHistoryItem[]>([]);
  const [wheelBlur, setWheelBlur] = useState(0);
  const [spinDuration, setSpinDuration] = useState(5);

  const { selectBeer } = useBeerStore();
  const wheelRef = useRef<SVGSVGElement>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up all timers on unmount — pulse interval + spin completion timer
  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) {
        clearInterval(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
    };
  }, []);

  const getWinningSegment = useCallback(
    (finalRotation: number): typeof SEGMENTS[number] => {
      const normalized = ((finalRotation % 360) + 360) % 360;
      const index = Math.floor(normalized / SEGMENT_ANGLE) % SEGMENTS.length;
      return SEGMENTS[index];
    },
    []
  );

  const spin = useCallback(async () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);
    setWheelBlur(2);

    // Start pointer pulse effect
    let pulseCount = 0;
    setIsPointerPulsing(true);
    pulseTimerRef.current = setInterval(() => {
      pulseCount++;
      setIsPointerPulsing((p) => !p);
      if (pulseCount > 30) {
        if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
        setIsPointerPulsing(false);
      }
    }, 150);

    // Calculate spin: 5-10 full rotations + random offset
    const fullRotations = 5 + Math.floor(Math.random() * 6); // 5-10
    const randomAngle = Math.random() * 360;
    const totalSpin = fullRotations * 360 + randomAngle;
    const newRotation = rotation + totalSpin;

    // Duration: 4-6 seconds
    const duration = 4 + Math.random() * 2;
    setSpinDuration(duration);

    setRotation(newRotation);

    // After spin completes (add 100ms buffer for CSS transition)
    spinTimeoutRef.current = setTimeout(async () => {
      spinTimeoutRef.current = null;
      setWheelBlur(0);
      if (pulseTimerRef.current) {
        clearInterval(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
      setIsPointerPulsing(false);
      setIsSpinning(false);

      // Determine winner
      const winner = getWinningSegment(newRotation);

      // Fetch random beer of that style
      setIsLoadingBeer(true);
      try {
        const res = await fetch(
          `/api/beers/random?style=${encodeURIComponent(winner.style)}`
        );
        if (res.ok) {
          const beer: Beer = await res.json();
          setResult({ style: winner.style, emoji: winner.emoji, beer });
          setHistory((prev) => [
            {
              style: winner.style,
              emoji: winner.emoji,
              beerName: beer.name,
              timestamp: Date.now(),
            },
            ...prev.slice(0, 4),
          ]);
        } else {
          setResult({
            style: winner.style,
            emoji: winner.emoji,
            beer: null,
            notFound: true,
          });
          setHistory((prev) => [
            {
              style: winner.style,
              emoji: winner.emoji,
              beerName: null,
              timestamp: Date.now(),
            },
            ...prev.slice(0, 4),
          ]);
        }
      } catch {
        setResult({
          style: winner.style,
          emoji: winner.emoji,
          beer: null,
          notFound: true,
        });
      } finally {
        setIsLoadingBeer(false);
      }
    }, (duration + 0.1) * 1000);
  }, [isSpinning, rotation, getWinningSegment]);

  // Build SVG path for a pie segment
  const buildSegmentPath = (
    index: number,
    cx: number,
    cy: number,
    r: number,
    innerR: number
  ) => {
    const startAngle = (index * SEGMENT_ANGLE * Math.PI) / 180 - Math.PI / 2;
    const endAngle = ((index + 1) * SEGMENT_ANGLE * Math.PI) / 180 - Math.PI / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);

    const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

    return [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");
  };

  // Text position for a segment
  const getTextPosition = (
    index: number,
    cx: number,
    cy: number,
    r: number,
    innerR: number
  ) => {
    const midAngle =
      ((index + 0.5) * SEGMENT_ANGLE * Math.PI) / 180 - Math.PI / 2;
    const textR = (r + innerR) / 2 + 8;
    return {
      x: cx + textR * Math.cos(midAngle),
      y: cy + textR * Math.sin(midAngle),
      angle: (index + 0.5) * SEGMENT_ANGLE - 90,
    };
  };

  const cx = 200;
  const cy = 200;
  const outerR = 190;
  const innerR = 70;
  const { goHome } = useBeerStore();
  const svgSize = 400;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={goHome}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          🎰 Пивная рулетка
        </h1>
        <p className="text-sm text-muted-foreground">
          Крутите колесо и открывайте случайный сорт пива!
        </p>
      </div>

      {/* Wheel */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: svgSize, maxWidth: "100%" }}>
          {/* Pointer at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
            <motion.div
              animate={{
                scale: isPointerPulsing ? [1, 1.3, 1] : 1,
                filter: isPointerPulsing
                  ? ["drop-shadow(0 0 4px #f59e0b)", "drop-shadow(0 0 12px #f59e0b)", "drop-shadow(0 0 4px #f59e0b)"]
                  : "drop-shadow(0 0 4px #f59e0b)",
              }}
              transition={{ duration: 0.15 }}
            >
              <svg width="40" height="44" viewBox="0 0 40 44" fill="none">
                <path
                  d="M20 44L2 4C0.5 0.5 3 0 20 0C37 0 39.5 0.5 38 4L20 44Z"
                  fill="#DC2626"
                  stroke="#991B1B"
                  strokeWidth="2"
                />
              </svg>
            </motion.div>
          </div>

          {/* Spinning Wheel */}
          <svg
            ref={wheelRef}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="w-full h-auto"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? `transform ${spinDuration}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                : "none",
              filter: `blur(${wheelBlur}px)`,
            }}
          >
            {/* Outer ring shadow */}
            <circle
              cx={cx}
              cy={cy}
              r={outerR + 4}
              fill="none"
              stroke="#78350F"
              strokeWidth="4"
              opacity="0.3"
            />

            {/* Segments */}
            {SEGMENTS.map((seg, i) => (
              <g key={seg.style}>
                <path
                  d={buildSegmentPath(i, cx, cy, outerR, innerR)}
                  fill={seg.color}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1.5"
                />
                {/* Slightly lighter inner edge for depth */}
                <path
                  d={buildSegmentPath(i, cx, cy, outerR - 3, innerR + 3)}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.5"
                />
              </g>
            ))}

            {/* Segment labels */}
            {SEGMENTS.map((seg, i) => {
              const { x, y, angle } = getTextPosition(
                i,
                cx,
                cy,
                outerR,
                innerR
              );
              const isDarkColor = [
                "Stout",
                "Porter",
                "Brown Ale",
                "Barleywine",
                "Belgian",
              ].includes(seg.style);

              return (
                <g
                  key={`label-${seg.style}`}
                  transform={`translate(${x},${y}) rotate(${angle})`}
                >
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isDarkColor ? "#FDE68A" : "#451A03"}
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                    style={{ userSelect: "none" }}
                  >
                    {seg.style}
                  </text>
                </g>
              );
            })}

            {/* Decorative dots on outer ring */}
            {SEGMENTS.map((_, i) => {
              const angle =
                (i * SEGMENT_ANGLE * Math.PI) / 180 - Math.PI / 2;
              const dx = cx + (outerR - 10) * Math.cos(angle);
              const dy = cy + (outerR - 10) * Math.sin(angle);
              return (
                <circle
                  key={`dot-${i}`}
                  cx={dx}
                  cy={dy}
                  r="3"
                  fill="rgba(255,255,255,0.5)"
                />
              );
            })}

            {/* Center circle */}
            <circle
              cx={cx}
              cy={cy}
              r={innerR}
              fill="#78350F"
              stroke="#92400E"
              strokeWidth="3"
            />
            <circle
              cx={cx}
              cy={cy}
              r={innerR - 8}
              fill="#44403C"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
            <text
              x={cx}
              y={cy - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="28"
            >
              🍺
            </text>
            <text
              x={cx}
              y={cy + 20}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#FDE68A"
              fontSize="10"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
              style={{ userSelect: "none" }}
            >
              КРУТИ
            </text>
          </svg>
        </div>
      </div>

      {/* Spin Button */}
      <div className="flex justify-center">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
            onClick={spin}
            disabled={isSpinning || isLoadingBeer}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-lg px-8 h-12 rounded-2xl shadow-lg shadow-amber-500/30"
          >
            {isSpinning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RotateCcw className="h-5 w-5" />
            )}
            {isSpinning ? "Крутится..." : "Крутить!"}
          </Button>
        </motion.div>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {isLoadingBeer && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-2xl p-6 space-y-4"
          >
            <div className="text-center space-y-3">
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                🎉 Выпал стиль!
              </p>
              <Skeleton className="h-8 w-48 mx-auto rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </motion.div>
        )}

        {result && !isLoadingBeer && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="glass-card rounded-2xl p-6 space-y-4"
          >
            {/* Winning Style */}
            <div className="text-center space-y-2">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1,
                }}
                className="text-4xl inline-block"
              >
                {result.emoji}
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-extrabold text-amber-700 dark:text-amber-300"
              >
                {result.style}
              </motion.h2>
            </div>

            {/* Beer Card */}
            {result.beer ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card
                  className="cursor-pointer border-amber-200 dark:border-amber-800/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl hover:shadow-lg hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20 transition-all duration-200"
                  onClick={() => selectBeer(result.beer!)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/50 dark:to-amber-800/50 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                      {result.beer.label ? (
                        <img
                          src={result.beer.label}
                          alt={result.beer.name}
                          className="w-full h-full object-cover rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (
                              e.target as HTMLImageElement
                            ).parentElement!.innerHTML = `<span class="text-3xl">🍺</span>`;
                          }}
                        />
                      ) : (
                        "🍺"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-foreground truncate">
                        {result.beer.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {result.beer.brewery} • {result.beer.country}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-amber-700 dark:text-amber-300">
                          {result.beer.abv}%
                        </span>
                        <span>IBU {result.beer.ibu}</span>
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {result.beer.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="text-muted-foreground"
                    >
                      →
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : result.notFound ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center text-sm text-muted-foreground py-4"
              >
                Для стиля{" "}
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {result.style}
                </span>{" "}
                пока нет пива в базе
              </motion.p>
            ) : null}

            {/* Spin Again */}
            {result.beer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center"
              >
                <Button
                  variant="outline"
                  onClick={spin}
                  className="gap-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl"
                >
                  <RotateCcw className="h-4 w-4" />
                  Крутить ещё
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
            Последние вращения
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-h-24 overflow-y-auto">
            {history.map((item, i) => (
              <motion.div
                key={item.timestamp}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
              >
                <span>{item.emoji}</span>
                <span className="font-semibold">{item.style}</span>
                {item.beerName && (
                  <span className="text-amber-600 dark:text-amber-400">
                    — {item.beerName}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}