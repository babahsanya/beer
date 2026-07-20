"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Star, Beer, Globe, ChevronRight } from "lucide-react";
import type { BreweryMapPoint } from "@/types/beer";
// Stage 5: replaced local COUNTRY_FLAGS duplicate with shared import.
import { getCountryFlag } from "@/lib/countries";

/* ─── Lat/Lng → SVG coordinate conversion ─── */
function toSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x, y };
}

/* ─── Dot Matrix World Map Data ─── */
// Simplified world map as dots (every ~2% of lat/lng)
// Each entry is [lat, lng] — covering major landmasses
const WORLD_DOTS: [number, number][] = [
  // North America
  [72,-168],[72,-155],[72,-140],[72,-120],[72,-100],[72,-85],[72,-70],[72,-58],
  [68,-168],[68,-155],[68,-140],[68,-120],[68,-100],[68,-85],[68,-70],[68,-58],[68,-45],
  [64,-168],[64,-155],[64,-140],[64,-120],[64,-100],[64,-85],[64,-70],[64,-58],[64,-45],
  [60,-168],[60,-155],[60,-140],[60,-120],[60,-100],[60,-85],[60,-70],[60,-58],[60,-45],
  [56,-168],[56,-150],[56,-140],[56,-125],[56,-110],[56,-95],[56,-85],[56,-72],[56,-58],
  [52,-170],[52,-155],[52,-140],[52,-125],[52,-110],[52,-95],[52,-85],[52,-72],[52,-58],[52,-48],
  [48,-170],[48,-155],[48,-140],[48,-125],[48,-110],[48,-95],[48,-85],[48,-72],[48,-58],[48,-48],
  [44,-170],[44,-155],[44,-140],[44,-125],[44,-110],[44,-95],[44,-85],[44,-72],[44,-58],[44,-48],
  [40,-170],[40,-155],[40,-140],[40,-125],[40,-110],[40,-95],[40,-85],[40,-72],[40,-58],[40,-48],
  [36,-150],[36,-135],[36,-125],[36,-110],[36,-95],[36,-85],[36,-72],[36,-58],
  [32,-140],[32,-125],[32,-115],[32,-105],[32,-95],[32,-85],[32,-75],[32,-65],
  [28,-130],[28,-115],[28,-105],[28,-95],[28,-85],[28,-78],[28,-68],
  [24,-110],[24,-100],[24,-90],[24,-82],[24,-75],
  [20,-105],[20,-95],[20,-88],[20,-80],
  [16,-100],[16,-92],[16,-85],
  // Central America
  [16,-90],[16,-85],[14,-92],[14,-87],[12,-88],[12,-84],
  [10,-85],[10,-80],[8,-82],[8,-78],
  // South America
  [12,-76],[12,-72],[12,-68],[10,-78],[10,-72],[10,-68],[10,-62],
  [8,-78],[8,-72],[8,-66],[8,-60],
  [4,-78],[4,-72],[4,-66],[4,-60],[4,-52],
  [0,-80],[0,-72],[0,-66],[0,-58],[0,-50],
  [-4,-78],[-4,-72],[-4,-66],[-4,-58],[-4,-50],[-4,-42],
  [-8,-76],[-8,-70],[-8,-64],[-8,-56],[-8,-48],[-8,-38],
  [-12,-76],[-12,-70],[-12,-64],[-12,-56],[-12,-48],[-12,-40],
  [-16,-72],[-16,-66],[-16,-58],[-16,-50],[-16,-44],
  [-20,-68],[-20,-60],[-20,-52],[-20,-46],[-20,-40],
  [-24,-64],[-24,-56],[-24,-50],[-24,-44],[-24,-38],
  [-28,-60],[-28,-54],[-28,-48],[-28,-42],[-28,-36],
  [-32,-56],[-32,-50],[-32,-44],[-32,-38],[-32,-30],
  [-36,-54],[-36,-48],[-36,-42],[-36,-36],
  [-40,-72],[-40,-66],[-40,-60],[-40,-54],[-40,-48],
  [-44,-72],[-44,-66],[-44,-60],[-44,-54],
  [-48,-72],[-48,-66],[-48,-60],
  [-52,-70],[-52,-66],
  // Europe
  [72,10],[72,20],[72,30],[72,40],[72,50],[72,60],
  [68,10],[68,20],[68,30],[68,40],[68,50],[68,60],[68,70],
  [64,10],[64,20],[64,30],[64,40],[64,50],[64,60],[64,70],
  [60,5],[60,10],[60,15],[60,20],[60,25],[60,30],[60,35],[60,40],[60,50],[60,60],[60,70],
  [56,5],[56,10],[56,15],[56,20],[56,25],[56,30],[56,35],[56,40],[56,50],[56,60],
  [52,-5],[52,0],[52,5],[52,10],[52,15],[52,20],[52,25],[52,30],[52,35],[52,40],
  [48,-5],[48,0],[48,5],[48,10],[48,15],[48,20],[48,25],[48,30],[48,35],[48,40],
  [44,-8],[44,-2],[44,2],[44,8],[44,12],[44,18],[44,24],[44,30],[44,36],
  [40,-8],[40,-2],[40,2],[40,8],[40,12],[40,18],[40,24],[40,30],
  [36,-8],[36,-2],[36,2],[36,8],[36,12],[36,18],[36,24],[36,28],
  // British Isles
  [58,-6],[58,-3],[56,-8],[56,-5],[56,-2],[54,-6],[54,-3],[54,0],[52,-6],[52,-3],[52,0],[50,-5],[50,-2],
  // Scandinavia
  [64,10],[64,14],[64,18],[62,8],[62,12],[62,16],[60,6],[60,10],[60,14],[58,8],[58,12],[58,16],[56,10],[56,14],[56,18],
  // Iceland
  [66,-22],[66,-18],[64,-22],[64,-18],
  // Iberian Peninsula
  [44,-8],[44,-4],[40,-8],[40,-4],[36,-8],[36,-4],[38,-8],[38,-4],[42,-8],[42,-4],[36,-6],[38,-6],[40,-6],
  // Italy
  [44,8],[44,12],[42,10],[42,14],[40,14],[40,18],[38,14],[38,18],[36,12],[36,16],
  // Greece / Balkans
  [42,20],[42,24],[40,20],[40,24],[38,22],[38,26],[36,22],[36,26],[38,24],
  // Africa
  [36,-2],[36,2],[36,6],[36,10],
  [32,-8],[32,-2],[32,2],[32,8],[32,12],[32,20],[32,28],[32,32],
  [28,-14],[28,-8],[28,-2],[28,4],[28,10],[28,16],[28,22],[28,28],[28,32],
  [24,-16],[24,-10],[24,-4],[24,2],[24,8],[24,14],[24,20],[24,28],[24,34],
  [20,-16],[20,-10],[20,-4],[20,2],[20,8],[20,14],[20,20],[20,28],[20,34],
  [16,-16],[16,-10],[16,-4],[16,2],[16,8],[16,14],[16,20],[16,28],[16,34],[16,40],
  [12,-16],[12,-10],[12,-4],[12,2],[12,8],[12,14],[12,20],[12,28],[12,34],[12,40],[12,44],
  [8,-14],[8,-8],[8,-2],[8,2],[8,8],[8,14],[8,20],[8,28],[8,34],[8,40],[8,44],
  [4,-10],[4,-4],[4,2],[4,8],[4,14],[4,20],[4,28],[4,34],[4,40],[4,44],
  [0,-8],[0,-2],[0,2],[0,8],[0,14],[0,20],[0,28],[0,34],[0,40],[0,44],
  [-4,-12],[-4,-6],[-4,0],[-4,6],[-4,12],[-4,20],[-4,28],[-4,34],[-4,40],
  [-8,-14],[-8,-8],[-8,-2],[-8,4],[-8,12],[-8,20],[-8,28],[-8,34],
  [-12,-16],[-12,-10],[-12,-4],[-12,4],[-12,12],[-12,20],[-12,28],[-12,34],
  [-16,-18],[-16,-12],[-16,-6],[-16,0],[-16,10],[-16,20],[-16,28],[-16,34],
  [-20,-20],[-20,-14],[-20,-8],[-20,0],[-20,10],[-20,20],[-20,28],[-20,34],
  [-24,-20],[-24,-14],[-24,-8],[-24,0],[-24,10],[-24,20],[-24,28],[-24,32],
  [-28,-22],[-28,-16],[-28,-8],[-28,0],[-28,10],[-28,18],[-28,28],[-28,32],
  [-32,-24],[-32,-18],[-32,-10],[-32,0],[-32,10],[-32,18],[-32,26],[-32,30],
  [-34,-24],[-34,-18],[-34,-12],[-34,-4],[-34,4],[-34,14],[-34,22],[-34,28],
  // Asia
  [72,70],[72,80],[72,90],[72,100],[72,110],[72,120],[72,130],[72,140],[72,150],[72,160],[72,170],[72,180],
  [68,60],[68,70],[68,80],[68,90],[68,100],[68,110],[68,120],[68,130],[68,140],[68,150],[68,160],[68,170],[68,180],
  [64,50],[64,60],[64,70],[64,80],[64,90],[64,100],[64,110],[64,120],[64,130],[64,140],[64,150],[64,160],[64,170],[64,180],
  [60,50],[60,60],[60,70],[60,80],[60,90],[60,100],[60,110],[60,120],[60,130],[60,140],[60,150],[60,160],[60,170],
  [56,50],[56,60],[56,70],[56,80],[56,90],[56,100],[56,110],[56,120],[56,130],[56,140],
  [52,50],[52,60],[52,70],[52,80],[52,90],[52,100],[52,110],[52,120],[52,130],[52,140],
  [48,40],[48,50],[48,60],[48,70],[48,80],[48,90],[48,100],[48,110],[48,120],[48,130],[48,140],
  [44,40],[44,50],[44,60],[44,70],[44,80],[44,90],[44,100],[44,110],[44,120],[44,130],[44,140],
  [40,40],[40,50],[40,60],[40,70],[40,80],[40,90],[40,100],[40,110],[40,120],[40,130],
  [36,36],[36,44],[36,52],[36,60],[36,70],[36,80],[36,90],[36,100],[36,110],[36,120],[36,130],[36,140],
  [32,36],[32,44],[32,52],[32,60],[32,70],[32,80],[32,90],[32,100],[32,110],[32,120],[32,130],
  [28,36],[28,44],[28,52],[28,60],[28,70],[28,80],[28,90],[28,100],[28,110],[28,120],
  [24,90],[24,100],[24,110],[24,120],[24,130],
  [20,96],[20,104],[20,110],[20,116],
  [16,100],[16,108],[16,114],
  [12,100],[12,108],[12,114],[12,120],
  [8,100],[8,108],[8,114],[8,120],
  [4,100],[4,108],[4,114],[4,120],
  [0,100],[0,110],[0,120],[0,130],[0,140],
  [-4,110],[-4,120],[-4,130],[-4,140],
  [-8,112],[-8,120],[-8,130],[-8,140],[-8,148],
  // Japan
  [44,142],[44,146],[42,140],[42,144],[40,140],[40,144],[38,138],[38,142],[36,136],[36,140],[34,132],[34,136],
  // Korea
  [38,126],[38,130],[36,126],[36,130],[34,126],[34,130],
  // Southeast Asia
  [20,100],[16,100],[12,100],[8,100],[4,102],
  [16,108],[12,108],[8,108],[4,106],
  [12,112],[8,112],[4,112],
  [0,108],[0,116],
  // Indonesia
  [-2,106],[-2,112],[-2,118],[-2,124],
  [-6,106],[-6,112],[-6,118],[-6,124],
  [-8,112],[-8,118],[-8,124],
  // Philippines
  [16,120],[14,122],[12,122],[10,124],
  // India / Sri Lanka
  [28,68],[28,74],[28,80],[28,86],
  [24,68],[24,74],[24,80],[24,86],
  [20,70],[20,76],[20,82],
  [16,72],[16,78],[16,84],
  [12,76],[12,80],
  [8,76],[8,80],[8,84],
  // Middle East
  [36,36],[36,44],[36,52],[32,36],[32,44],[32,52],[28,48],[28,56],
  [24,44],[24,52],[24,58],[24,64],[20,44],[20,52],[20,58],[20,64],
  [16,44],[16,52],[16,58],[12,44],[12,52],
  // Australia
  [-16,124],[-16,130],[-16,136],[-16,142],[-16,148],
  [-20,120],[-20,126],[-20,132],[-20,138],[-20,144],[-20,150],
  [-24,116],[-24,122],[-24,128],[-24,134],[-24,140],[-24,146],[-24,152],
  [-28,114],[-28,120],[-28,126],[-28,132],[-28,138],[-28,144],[-28,150],
  [-32,116],[-32,122],[-32,128],[-32,134],[-32,140],[-32,146],
  [-36,118],[-36,124],[-36,130],[-36,136],[-36,142],
  [-38,144],[-38,148],
  // New Zealand
  [-36,172],[-36,176],[-38,174],[-38,178],[-40,176],[-42,172],[-42,176],[-46,168],[-46,172],
  // Greenland
  [76,-60],[76,-50],[76,-40],[76,-30],[76,-20],
  [72,-58],[72,-48],[72,-38],[72,-28],[72,-18],
  [68,-52],[68,-42],[68,-32],[68,-22],
  [64,-48],[64,-38],
];

// Pre-compute SVG dot positions
const MAP_DOTS_SVG = WORLD_DOTS.map(([lat, lng]) => toSvg(lat, lng));

/* ─── Tooltip component ─── */
function BreweryTooltip({
  brewery,
  x,
  y,
  svgWidth,
  svgHeight,
}: {
  brewery: BreweryMapPoint;
  x: number;
  y: number;
  svgWidth: number;
  svgHeight: number;
}) {
  const flag = getCountryFlag(brewery.country);
  const padding = 10;
  const tooltipW = 200;
  const tooltipH = 110;

  // Position tooltip — avoid going off-screen
  let tx = x + 12;
  let ty = y - tooltipH / 2;
  if (tx + tooltipW + padding > svgWidth) tx = x - tooltipW - 12;
  if (ty < padding) ty = padding;
  if (ty + tooltipH + padding > svgHeight) ty = svgHeight - tooltipH - padding;

  return (
    <foreignObject x={tx} y={ty} width={tooltipW} height={tooltipH}>
      <div className="rounded-lg border border-amber-400/40 bg-stone-900/95 backdrop-blur-xl p-3 shadow-xl shadow-amber-500/10 text-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{flag}</span>
          <span className="font-bold text-sm text-amber-300 truncate max-w-[140px]">{brewery.name}</span>
        </div>
        <div className="space-y-1 text-xs text-stone-300">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><Beer className="h-3 w-3 text-amber-400" /> Пиво:</span>
            <span className="font-semibold text-white">{brewery.beerCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" /> Рейтинг:</span>
            <span className="font-semibold text-amber-300">{brewery.avgRating.toFixed(2)}</span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-stone-700 text-[11px]">
            <span className="text-muted-foreground">Лучшее: </span>
            <span className="text-amber-200 truncate">{brewery.topBeer}</span>
          </div>
        </div>
      </div>
    </foreignObject>
  );
}

/* ─── Main component ─── */
interface BreweryMapProps {
  onNavigateToBeer?: (beerId: string) => void;
}

export function BreweryMap({ onNavigateToBeer }: BreweryMapProps) {
  const [breweries, setBreweries] = useState<BreweryMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedBrewery, setSelectedBrewery] = useState<BreweryMapPoint | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/map");
        if (res.ok) {
          const data = await res.json();
          setBreweries(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleBreweryClick = useCallback(
    (brewery: BreweryMapPoint) => {
      setSelectedBrewery(brewery);
      onNavigateToBeer?.(brewery.topBeerId);
    },
    [onNavigateToBeer]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, brewery: BreweryMapPoint) => {
      const svg = (e.target as SVGCircleElement).ownerSVGElement;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm.inverse());
      setHoveredId(brewery.id);
      setHoveredPos({ x: svgPt.x, y: svgPt.y });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setHoveredPos(null);
  }, []);

  // Connection lines between nearby breweries — O(N²) over breweries. Memoized
  // so we don't recompute on every hover state change (hoveredId/Pos update
  // on every mouse move, but breweries only change on fetch).
  const connectionLines = useMemo(() => {
    const lines: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < breweries.length; i++) {
      const b = breweries[i];
      const svgPos = toSvg(b.lat, b.lng);
      const nearby: typeof breweries = [];
      for (let j = i + 1; j < breweries.length; j++) {
        const other = breweries[j];
        const otherPos = toSvg(other.lat, other.lng);
        const dist = Math.sqrt(
          (svgPos.x - otherPos.x) ** 2 + (svgPos.y - otherPos.y) ** 2,
        );
        if (dist < 80) {
          nearby.push(other);
          if (nearby.length >= 2) break;
        }
      }
      for (const other of nearby) {
        const otherPos = toSvg(other.lat, other.lng);
        lines.push({
          key: `line-${b.id}-${other.id}`,
          x1: svgPos.x,
          y1: svgPos.y,
          x2: otherPos.x,
          y2: otherPos.y,
        });
      }
    }
    return lines;
  }, [breweries]);

  // Stats
  const countryCount = new Set(breweries.map((b) => b.country)).size;
  const totalBeers = breweries.reduce((sum, b) => sum + b.beerCount, 0);

  // Get marker radius based on beer count
  const getMarkerRadius = (count: number) => {
    if (count >= 5) return 8;
    if (count >= 3) return 6;
    return 4.5;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Card */}
      <Card className="overflow-hidden border-amber-200/40 dark:border-amber-800/30 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
        <CardContent className="p-0">
          <div
            ref={containerRef}
            className="relative w-full overflow-x-auto overflow-y-hidden"
            style={{ minHeight: 300 }}
          >
            <svg
              viewBox="0 0 1000 500"
              className="w-full min-w-[600px] h-auto block"
              style={{ minWidth: 700 }}
            >
              <defs>
                {/* Glow filter for markers */}
                <filter id="markerGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood floodColor="#f59e0b" floodOpacity="0.6" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Pulse animation gradient */}
                <radialGradient id="pulseGrad">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background */}
              <rect width="1000" height="500" fill="#0f172a" rx="0" />

              {/* Grid lines */}
              <g opacity="0.06" stroke="#94a3b8" strokeWidth="0.5">
                {Array.from({ length: 9 }, (_, i) => (
                  <line key={`h-${i}`} x1="0" y1={(i + 1) * 50} x2="1000" y2={(i + 1) * 50} />
                ))}
                {Array.from({ length: 19 }, (_, i) => (
                  <line key={`v-${i}`} x1={(i + 1) * 50} y1="0" x2={(i + 1) * 50} y2="500" />
                ))}
              </g>

              {/* World dots */}
              {MAP_DOTS_SVG.map((dot, i) => (
                <circle
                  key={`dot-${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r="1.5"
                  fill="#d97706"
                  opacity="0.25"
                />
              ))}

              {/* Connection lines between nearby breweries (faint) */}
              {connectionLines.map((line) => (
                <line
                  key={line.key}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="#f59e0b"
                  strokeWidth="0.5"
                  opacity="0.12"
                  strokeDasharray="4,4"
                />
              ))}

              {/* Brewery markers */}
              {breweries.map((brewery, index) => {
                const svgPos = toSvg(brewery.lat, brewery.lng);
                const r = getMarkerRadius(brewery.beerCount);
                const isHovered = hoveredId === brewery.id;

                return (
                  <g key={brewery.id}>
                    {/* Pulse ring */}
                    <circle
                      cx={svgPos.x}
                      cy={svgPos.y}
                      r={r + 4}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1"
                      opacity={isHovered ? 0.6 : 0.3}
                    >
                      <animate
                        attributeName="r"
                        values={`${r + 2};${r + 12};${r + 2}`}
                        dur={`${2.5 + index * 0.15}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.4;0;0.4"
                        dur={`${2.5 + index * 0.15}s`}
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Outer glow */}
                    <circle
                      cx={svgPos.x}
                      cy={svgPos.y}
                      r={r + 2}
                      fill="url(#pulseGrad)"
                      opacity={isHovered ? 0.6 : 0.3}
                    />

                    {/* Main marker */}
                    <circle
                      cx={svgPos.x}
                      cy={svgPos.y}
                      r={isHovered ? r + 1.5 : r}
                      fill="#f59e0b"
                      stroke="#fbbf24"
                      strokeWidth={isHovered ? 2 : 1}
                      filter="url(#markerGlow)"
                      className="cursor-pointer transition-all duration-200"
                      style={{ transition: 'r 0.2s, stroke-width 0.2s' }}
                      onMouseEnter={(e) => handleMouseEnter(e, brewery)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => handleBreweryClick(brewery)}
                    />

                    {/* Inner bright dot */}
                    <circle
                      cx={svgPos.x}
                      cy={svgPos.y}
                      r={Math.max(r * 0.4, 1.5)}
                      fill="#fef3c7"
                      className="pointer-events-none"
                    />
                  </g>
                );
              })}

              {/* Tooltip */}
              {hoveredId && hoveredPos && (() => {
                const brewery = breweries.find((b) => b.id === hoveredId);
                if (!brewery) return null;
                return (
                  <BreweryTooltip
                    brewery={brewery}
                    x={hoveredPos.x}
                    y={hoveredPos.y}
                    svgWidth={1000}
                    svgHeight={500}
                  />
                );
              })()}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-amber-200/40 dark:border-amber-800/30 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <MapPin className="h-4 w-4 text-amber-500" />
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {breweries.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">пивоварен</p>
              </div>
              <div className="h-8 w-px bg-amber-200 dark:bg-amber-800/50" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Globe className="h-4 w-4 text-amber-500" />
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {countryCount}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">стран</p>
              </div>
              <div className="h-8 w-px bg-amber-200 dark:bg-amber-800/50" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Beer className="h-4 w-4 text-amber-500" />
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {totalBeers}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">сортов пива</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Brewery List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-amber-200/40 dark:border-amber-800/30 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Все пивоварни на карте
            </h3>
            <ScrollArea className="max-h-80">
              <div className="space-y-1.5 pr-2">
                {breweries.map((brewery) => {
                  const flag = getCountryFlag(brewery.country);
                  return (
                    <motion.button
                      key={brewery.id}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleBreweryClick(brewery)}
                      onMouseEnter={() => {
                        const pos = toSvg(brewery.lat, brewery.lng);
                        setHoveredId(brewery.id);
                        setHoveredPos(pos);
                      }}
                      onMouseLeave={() => {
                        setHoveredId(null);
                        setHoveredPos(null);
                      }}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        selectedBrewery?.id === brewery.id
                          ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700"
                          : "hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      }`}
                    >
                      <span className="text-lg shrink-0">{flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {brewery.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{brewery.country}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {brewery.avgRating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {brewery.beerCount} {brewery.beerCount === 1 ? "сорт" : brewery.beerCount < 5 ? "сорта" : "сортов"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}