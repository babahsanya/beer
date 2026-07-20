"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useBeerStore } from "@/store/beer-store";
import { useToast } from "@/hooks/use-toast";
import { SearchBar } from "@/components/beer/search-bar";
import { BeerCard } from "@/components/beer/beer-card";
import { BeerDetail } from "@/components/beer/beer-detail";
import { TrendingList } from "@/components/beer/trending-list";
import { HistoryList } from "@/components/beer/history-list";
import { FavoritesGrid } from "@/components/beer/favorites-grid";
import { PhotoRecognizer } from "@/components/beer/photo-recognizer";
import { BackButton } from "@/components/beer/back-button";
import { EmptyState } from "@/components/beer/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StyleExplorer } from "@/components/beer/style-explorer";
import { CompareView } from "@/components/beer/compare-view";
import { ScrollToTop } from "@/components/beer/scroll-to-top";
import { RandomBeerButton } from "@/components/beer/random-beer-button";
import { QuickStats } from "@/components/beer/quick-stats";
import { TopBeers } from "@/components/beer/top-beers";
import { BeerOfTheDay } from "@/components/beer/beer-of-the-day";
import { HelpView } from "@/components/beer/help-view";
import { SettingsView } from "@/components/beer/settings-view";
import { BreweryMap } from "@/components/beer/brewery-map";
import QuizView from "@/components/beer/quiz-view";
import { CalculatorView } from "@/components/beer/calculator-view";
import { apiGet, isUnauthorized } from "@/lib/api-client";
import { AchievementsView } from "@/components/beer/achievements-view";
import { RecommendationsView } from "@/components/beer/recommendations-view";
import { EnhancedStats } from "@/components/beer/enhanced-stats";
import { BeerRoulette } from "@/components/beer/beer-roulette";
import { JournalView } from "@/components/beer/journal-view";
import { StyleDistribution } from "@/components/beer/style-distribution";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getStyleInfo } from "@/lib/style-info";
import Image from "next/image";
import {
  Search,
  Camera,
  TrendingUp,
  Star,
  Clock,
  ChevronRight,
  LayoutGrid,
  ArrowLeftRight,
  Sun,
  Moon,
  Filter,
  Eye,
  Download,
  Database,
  Globe,
  HelpCircle,
  Trophy,
  Hash,
  Settings,
  MapPin,
  Brain,
  Calculator,
  Award,
  Sparkles,
  Dices,
  BarChart3,
  BookOpen,
} from "lucide-react";
import type { Beer, SearchHistory } from "@/types/beer";

const styleChips = [
  "IPA", "Stout", "Lager", "Wheat Beer", "Porter", "Sour",
  "Pilsner", "Belgian", "Pale Ale", "Amber Ale", "Brown Ale", "Barleywine",
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full glass-card flex items-center justify-center text-amber-600 dark:text-amber-400 hover:scale-110 transition-transform duration-200 shadow-lg"
      aria-label="Переключить тему"
    >
      {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function Home() {
  const {
    currentView,
    searchQuery,
    setSearchQuery,
    setSearchResults,
    selectBeer,
    setView,
    setLoading,
    compareBeers,
    setShowCompare,
  } = useBeerStore();
  const { toast } = useToast();

  // Search
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResultsLocal] = useState<Beer[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchSources, setSearchSources] = useState<string[]>([]);
  const [searchLocalCount, setSearchLocalCount] = useState(0);
  const [searchOnlineCount, setSearchOnlineCount] = useState(0);
  const [sortBy, setSortBy] = useState("rating");
  const searchLimit = 20;

  // ABV filter state
  const [abvRange, setAbvRange] = useState<[number, number]>([0, 15]);
  const [ibuRange, setIbuRange] = useState<[number, number]>([0, 120]);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AbortController for cancelling in-flight requests
  const searchAbortRef = useRef<AbortController | null>(null);
  const suggestionsAbortRef = useRef<AbortController | null>(null);
  // Search loading indicator state (for search bar spinner)
  const [searchDebouncing, setSearchDebouncing] = useState(false);

  // Search suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [styleSuggestions, setStyleSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Sorted search results
  const sortedResults = useMemo(() => {
    const results = [...searchResults].filter(
      (b) => b.abv >= abvRange[0] && b.abv <= abvRange[1] && b.ibu >= ibuRange[0] && b.ibu <= ibuRange[1]
    );
    if (sortBy === "rating") {
      results.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "abv") {
      results.sort((a, b) => b.abv - a.abv);
    } else if (sortBy === "checkins") {
      results.sort((a, b) => b.totalCheckins - a.totalCheckins);
    }
    return results;
  }, [searchResults, sortBy, abvRange, ibuRange]);

  // Home history
  const [recentHistory, setRecentHistory] = useState<SearchHistory[]>([]);
  const [recentViews, setRecentViews] = useState<Array<{ beerId: string; beer: Beer }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const doSearch = useCallback(
    async (query?: string, offset = 0) => {
      const q = query ?? searchQuery;
      if (!q.trim()) return;
      // Cancel previous in-flight search request
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setShowSuggestions(false);
      setSearchLoading(true);
      try {
        const data = await apiGet<{
          beers: Array<Beer & { _source?: string; _type?: string }>;
          sources: string[];
          localCount?: number;
          onlineCount?: number;
          pagination?: { total: number; limit: number; offset: number; hasMore: boolean };
          total?: number;
        }>(`/api/beers/search?q=${encodeURIComponent(q)}&limit=${searchLimit}&offset=${offset}&sort=${sortBy}`, { signal: controller.signal });
        // Strip internal _source field before passing to Beer type
        const beers: Beer[] = (data.beers || []).map((b) => {
          const { _source: _s, _type: _t, ...rest } = b;
          void _s; void _t;
          return rest;
        });
        if (offset === 0) {
          setSearchResultsLocal(beers);
          setSearchSources(data.sources || []);
          setSearchLocalCount(data.localCount || 0);
          setSearchOnlineCount(data.onlineCount || 0);
        } else {
          setSearchResultsLocal((prev) => [...prev, ...beers]);
        }
        setSearchTotal(data.pagination?.total || data.total || 0);
        setSearchOffset(offset);
        setSearchResults(beers, data.pagination?.total || data.total || 0);
        if (offset === 0) setView("search");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast({
          title: "Ошибка",
          description: "Не удалось выполнить поиск",
          variant: "destructive",
        });
      } finally {
        if (searchAbortRef.current === controller) {
          setSearchLoading(false);
        }
      }
    },
    [searchQuery, sortBy, setView, setSearchResults, toast]
  );

  const handleSearchAction = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      doSearch();
    }
  };

  // Fetch suggestions when query changes (with cancellation)
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setStyleSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    // Cancel previous in-flight suggestions request
    if (suggestionsAbortRef.current) {
      suggestionsAbortRef.current.abort();
    }
    const controller = new AbortController();
    suggestionsAbortRef.current = controller;
    try {
      setSuggestionsLoading(true);
      // Suggestions is a public endpoint and still returns the raw payload
      // shape ({ suggestions, styles }) — we use fetch directly so we can
      // pass an AbortSignal without interference from the envelope wrapper.
      const res = await fetch(
        `/api/beers/suggestions?q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setStyleSuggestions(data.styles || []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // ignore
    } finally {
      if (suggestionsAbortRef.current === controller) {
        setSuggestionsLoading(false);
      }
    }
  }, []);

  // Debounced search: auto-search after 300ms of inactivity
  const handleSearchChange = useCallback(
    (val: string) => {
      setSearchQuery(val);
      setShowSuggestions(true);

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (val.trim().length >= 2) {
        setSearchDebouncing(true);
        debounceTimerRef.current = setTimeout(() => {
          setSearchDebouncing(false);
          doSearch(val);
        }, 300);
      } else {
        setSearchDebouncing(false);
      }

      // Fetch suggestions
      fetchSuggestions(val);
    },
    [setSearchQuery, doSearch, fetchSuggestions]
  );

  // Clean up debounce timer and abort controllers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      if (suggestionsAbortRef.current) {
        suggestionsAbortRef.current.abort();
      }
    };
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    doSearch(suggestion);
  };

  const loadMoreResults = () => {
    doSearch(searchQuery, searchOffset + searchLimit);
  };

  // Search by style (from StyleExplorer)
  const handleSearchStyle = (styleName: string) => {
    setShowSuggestions(false);
    setSearchQuery(styleName);
    doSearch(styleName);
  };

  const handleStyleChipClick = (styleName: string) => {
    setShowSuggestions(false);
    setSearchQuery(styleName);
    doSearch(styleName);
  };

  // Fetch recent history for home screen
  const fetchRecentHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await apiGet<{ history: SearchHistory[] } | SearchHistory[]>("/api/history");
      const list = Array.isArray(data) ? data : (data.history ?? []);
      setRecentHistory(list.slice(0, 5));
    } catch (err) {
      // 401 is fine — anonymous users have no history.
      if (!isUnauthorized(err)) {
        // ignore other errors
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Fetch recently viewed beers
  const fetchRecentViews = useCallback(async () => {
    try {
      const data = await apiGet<Array<{ beerId: string; beer: Beer }>>("/api/recent");
      setRecentViews(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!isUnauthorized(err)) {
        // ignore other errors
      }
    }
  }, []);

  useEffect(() => {
    if (currentView === "home") {
      fetchRecentHistory();
      fetchRecentViews();
    }
  }, [currentView, fetchRecentHistory, fetchRecentViews]);

  // Global keyboard shortcut: Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder*="пиво"]'
        );
        input?.focus();
      }
      // Escape to go home
      if (e.key === "Escape" && currentView !== "home" && currentView !== "detail") {
        setView("home");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, setView]);

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    doSearch(query);
  };

  // Action cards for home screen
  const actionCards = [
    {
      icon: <Search className="h-6 w-6" />,
      emoji: "🔍",
      title: "Поиск по названию",
      subtitle: "Найдите пиво в базе",
      action: () => {
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder*="пиво"]'
        );
        input?.focus();
      },
      color: "from-amber-400 to-amber-600",
    },
    {
      icon: <Camera className="h-6 w-6" />,
      emoji: "📸",
      title: "Распознать по фото",
      subtitle: "Фото этикетки → пиво",
      action: () => setView("recognize"),
      color: "from-orange-400 to-orange-600",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      emoji: "🔥",
      title: "Тренды сегодня",
      subtitle: "Популярное сейчас",
      action: () => setView("trending"),
      color: "from-red-400 to-red-600",
    },
    {
      icon: <Star className="h-6 w-6" />,
      emoji: "⭐",
      title: "Избранное",
      subtitle: "Ваша коллекция",
      action: () => setView("favorites"),
      color: "from-yellow-400 to-yellow-600",
    },
  ];

  const exportCSV = () => {
    if (sortedResults.length === 0) return;
    const headers = ["Название", "Стиль", "ABV", "IBU", "Страна", "Пивоварня", "Рейтинг", "Чекинов"];
    const rows = sortedResults.map(b => [
      b.name, b.style, b.abv, b.ibu, b.country, b.brewery, b.rating, b.totalCheckins
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beers_${searchQuery || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Экспорт завершён", description: `${sortedResults.length} сортов сохранено в CSV` });
  };

  const extraActionCards = [
    {
      icon: <MapPin className="h-6 w-6" />,
      emoji: "🗺️",
      title: "Карта пивоварен",
      subtitle: "Мир пива на карте",
      action: () => setView("map"),
      color: "from-amber-500 to-orange-600",
    },
    {
      icon: <Brain className="h-6 w-6" />,
      emoji: "🧠",
      title: "Пивной квиз",
      subtitle: "Угадай пиво по фактам",
      action: () => setView("quiz"),
      color: "from-violet-400 to-violet-600",
    },
    {
      icon: <Calculator className="h-6 w-6" />,
      emoji: "🧮",
      title: "Калькулятор",
      subtitle: "Расчёт промилле",
      action: () => setView("calculator"),
      color: "from-rose-400 to-rose-600",
    },
    {
      icon: <Award className="h-6 w-6" />,
      emoji: "🏆",
      title: "Достижения",
      subtitle: "Ваши ачивки",
      action: () => setView("achievements"),
      color: "from-amber-400 to-amber-600",
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      emoji: "✨",
      title: "Для вас",
      subtitle: "Персональные советы",
      action: () => setView("recommendations"),
      color: "from-pink-400 to-pink-600",
    },
    {
      icon: <LayoutGrid className="h-6 w-6" />,
      emoji: "📋",
      title: "Каталог стилей",
      subtitle: "Все стили пива",
      action: () => setView("styles"),
      color: "from-emerald-400 to-emerald-600",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      emoji: "📊",
      title: "Аналитика",
      subtitle: "Графики и статистика",
      action: () => setView("analytics"),
      color: "from-emerald-500 to-teal-600",
    },
    {
      icon: <HelpCircle className="h-6 w-6" />,
      emoji: "❓",
      title: "Справка",
      subtitle: "Как пользоваться",
      action: () => setView("help"),
      color: "from-sky-400 to-sky-600",
    },
    {
      icon: <Settings className="h-6 w-6" />,
      emoji: "⚙️",
      title: "Настройки",
      subtitle: "Управление данными",
      action: () => setView("settings"),
      color: "from-stone-400 to-stone-600",
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      emoji: "📝",
      title: "Журнал",
      subtitle: "Дегустационный дневник",
      action: () => setView("journal"),
      color: "from-amber-400 to-amber-600",
    },
    {
      icon: <Dices className="h-6 w-6" />,
      emoji: "🎰",
      title: "Рулетка",
      subtitle: "Пивная рулетка",
      action: () => setView("roulette"),
      color: "from-rose-500 to-orange-500",
    },
  ];

  return (
    <>
      <ThemeToggle />
      <main className="min-h-screen flex flex-col pb-20">
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {/* ===== HOME VIEW ===== */}
          {currentView === "home" && (
            <motion.div
              key="home"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Hero */}
              <div className="relative text-center space-y-4">
                <div className="hero-gradient -m-4 sm:-m-8 -mt-6 sm:-mt-8 py-12 sm:py-16 px-4 rounded-b-3xl relative overflow-hidden">
                  <div className="beer-pulse inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-300/40 dark:shadow-amber-900/40">
                    <span className="text-4xl">🍺</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mt-4">
                    Beer
                    <span className="beer-gradient-text">ID</span>
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                    Пивной справочник — ищите по названию, распознавайте по фото,
                    изучайте рейтинги и отзывы
                  </p>
                  <div className="mt-3 inline-flex items-center rounded-full bg-white/60 dark:bg-stone-700/60 backdrop-blur-sm border border-amber-200 dark:border-amber-800/40 px-4 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                    100+ сортов пива • 26 стран • 360 отзывов
                  </div>
                  {/* Foam wave decoration */}
                  <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden beer-wave">
                    <div className="flex h-full">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-white/40 dark:bg-stone-300/10 rounded-t-full mx-0.5"
                          style={{ height: `${60 + Math.sin(i * 0.8) * 30}%`, animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onSearch={handleSearchAction}
                  autoFocus={false}
                  loading={searchDebouncing}
                />
                {showSuggestions && searchQuery.trim().length >= 2 && (suggestions.length > 0 || styleSuggestions.length > 0) && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl bg-white/90 dark:bg-stone-800/90 backdrop-blur-xl border border-amber-200 dark:border-amber-800/50 shadow-lg shadow-amber-200/30 dark:shadow-amber-900/20 overflow-hidden">
                    {styleSuggestions.length > 0 && (
                      <div className="px-3 pt-2 pb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Стили</p>
                      </div>
                    )}
                    {styleSuggestions.map((style) => (
                      <button
                        key={`style-${style}`}
                        onClick={() => handleSuggestionClick(style)}
                        className="w-full text-left px-3 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-2"
                      >
                        <span className="text-xs">🍺</span>
                        <span>{style}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">стиль</span>
                      </button>
                    ))}
                    {suggestions.length > 0 && (
                      <div className="px-3 pt-2 pb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Пиво</p>
                      </div>
                    )}
                    {suggestions.map((name) => (
                      <button
                        key={name}
                        onClick={() => handleSuggestionClick(name)}
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-2"
                      >
                        <Search className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Random Beer Button */}
              <RandomBeerButton />

              {/* Action Cards - 2 rows of 2 + extra card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {actionCards.map((card) => (
                  <motion.div
                    key={card.title}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Card
                      className="cursor-pointer border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl hover:shadow-lg hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20 transition-all duration-200 h-full"
                      onClick={card.action}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                        <div
                          className={`h-12 w-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md`}
                        >
                          {card.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {card.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {card.subtitle}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {/* Extra cards (Style Catalog + Help) */}
                {extraActionCards.map((card) => (
                  <motion.div
                    key={card.title}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="col-span-1"
                  >
                    <Card
                      className="cursor-pointer border-amber-200 dark:border-amber-900/50 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl hover:shadow-lg hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20 transition-all duration-200 h-full"
                      onClick={card.action}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                        <div
                          className={`h-12 w-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md`}
                        >
                          {card.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {card.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {card.subtitle}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Quick Stats */}
              <QuickStats />

              {/* Beer of the Day */}
              <BeerOfTheDay onSelect={(beer) => selectBeer(beer)} />

              {/* Top 5 Beers */}
              <TopBeers onSelect={(beer) => selectBeer(beer)} />

              {/* Style Chips */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Стили пива
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                  {styleChips.map((style) => {
                    const info = getStyleInfo(style);
                    return (
                      <Popover key={style}>
                        <PopoverTrigger asChild>
                          <button
                            onClick={() => handleStyleChipClick(style)}
                            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-900/50 hover:border-amber-400 dark:hover:border-amber-600 transition-all duration-200"
                          >
                            {info?.emoji && <span className="mr-1">{info.emoji}</span>}
                            {style}
                          </button>
                        </PopoverTrigger>
                        {info && (
                          <PopoverContent className="w-64 p-3" side="bottom" align="start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{info.emoji}</span>
                                <span className="font-semibold text-sm">{info.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{info.description}</p>
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span>ABV: {info.abvRange}</span>
                                <span>IBU: {info.ibuRange}</span>
                              </div>
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                    );
                  })}
                </div>
              </div>

              {/* Recent History */}
              {!historyLoading && recentHistory.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Последние поиски
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setView("history")}
                      className="text-xs text-amber-600 dark:text-amber-400 gap-1"
                    >
                      Все
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentHistory.map((item) => (
                      <Card
                        key={item.id}
                        className="cursor-pointer border-amber-200/60 dark:border-amber-900/30 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl hover:border-amber-400 transition-colors"
                        onClick={() => handleHistoryClick(item.query)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <Search className="h-4 w-4 text-amber-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.query}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {!historyLoading && recentViews.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Недавно просмотренные
                    </h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {recentViews.slice(0, 8).map((item) => (
                      <motion.div
                        key={item.beerId}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="shrink-0"
                      >
                        <Card
                          className="cursor-pointer border-amber-200/60 dark:border-amber-900/30 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl hover:border-amber-400 transition-all w-32"
                          onClick={() => selectBeer(item.beer)}
                        >
                          <CardContent className="p-2 flex flex-col items-center text-center gap-1">
                            <div className="h-10 w-8 rounded-md overflow-hidden bg-amber-50 dark:bg-amber-900/20">
                              {item.beer?.label ? (
                                <Image src={item.beer.label} alt={item.beer.name} width={32} height={40} className="object-cover w-full h-full" unoptimized />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg">🍺</div>
                              )}
                            </div>
                            <p className="text-xs font-medium text-foreground truncate w-full">{item.beer?.name}</p>
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{item.beer?.rating?.toFixed(1)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {historyLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-14 rounded-xl skeleton-shimmer"
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ===== SEARCH VIEW ===== */}
          {currentView === "search" && (
            <motion.div
              key="search"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <BackButton onClick={() => setView("home")} />
              <div className="relative">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onSearch={handleSearchAction}
                  autoFocus
                  loading={searchDebouncing}
                />
                {showSuggestions && searchQuery.trim().length >= 2 && (suggestions.length > 0 || styleSuggestions.length > 0) && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl bg-white/90 dark:bg-stone-800/90 backdrop-blur-xl border border-amber-200 dark:border-amber-800/50 shadow-lg shadow-amber-200/30 dark:shadow-amber-900/20 overflow-hidden">
                    {styleSuggestions.length > 0 && (
                      <div className="px-3 pt-2 pb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Стили</p>
                      </div>
                    )}
                    {styleSuggestions.map((style) => (
                      <button
                        key={`search-style-${style}`}
                        onClick={() => handleSuggestionClick(style)}
                        className="w-full text-left px-3 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-2"
                      >
                        <span className="text-xs">🍺</span>
                        <span>{style}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">стиль</span>
                      </button>
                    ))}
                    {suggestions.length > 0 && (
                      <div className="px-3 pt-2 pb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Пиво</p>
                      </div>
                    )}
                    {suggestions.map((name) => (
                      <button
                        key={`search-${name}`}
                        onClick={() => handleSuggestionClick(name)}
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-2"
                      >
                        <Search className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Style Filter Chips in Search */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                {styleChips.map((style) => (
                  <button
                    key={style}
                    onClick={() => handleStyleChipClick(style)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                      searchQuery === style
                        ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-300/40"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? "Скрыть фильтры" : "Фильтры"}
              </button>

              {/* ABV Range Filter */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <Card className="border-amber-200/60 dark:border-amber-900/30 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">ABV диапазон</span>
                            <span className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
                              {abvRange[0]}% — {abvRange[1]}%
                            </span>
                          </div>
                          <Slider
                            value={abvRange}
                            onValueChange={(val) => setAbvRange(val as [number, number])}
                            min={0}
                            max={15}
                            step={0.5}
                            className="py-2"
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              <Hash className="h-3.5 w-3.5 text-amber-500" />
                              IBU диапазон
                            </span>
                            <span className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
                              {ibuRange[0]} — {ibuRange[1]}
                            </span>
                          </div>
                          <Slider
                            value={ibuRange}
                            onValueChange={(val) => setIbuRange(val as [number, number])}
                            min={0}
                            max={120}
                            step={5}
                            className="py-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results count + Sort + Source indicator */}
              {!searchLoading && searchTotal > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      Найдено: {searchTotal.toLocaleString("ru-RU")} сортов
                    </p>
                    {searchSources.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {searchSources.includes('local') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                            <Database className="h-2.5 w-2.5" />
                            База {searchLocalCount}
                          </span>
                        )}
                        {searchSources.includes('online') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                            <Globe className="h-2.5 w-2.5" />
                            Онлайн {searchOnlineCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[130px] h-8 text-xs border-amber-200 dark:border-amber-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">Рейтинг</SelectItem>
                        <SelectItem value="abv">ABV</SelectItem>
                        <SelectItem value="checkins">Чекины</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportCSV}
                      className="h-8 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading skeletons */}
              {searchLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-24 rounded-xl skeleton-shimmer"
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!searchLoading && searchTotal === 0 && searchQuery && (
                <EmptyState
                  title="Нет результатов"
                  description={`По запросу «${searchQuery}» ничего не найдено. Попробуйте другой запрос.`}
                  icon={<Search className="h-8 w-8 text-amber-500" />}
                />
              )}

              {/* Results list */}
              <div className="space-y-3">
                {sortedResults.map((beer, index) => (
                  <BeerCard
                    key={beer.id}
                    beer={beer}
                    onClick={() => selectBeer(beer)}
                    index={index}
                  />
                ))}
              </div>

              {/* Load More */}
              {!searchLoading &&
                searchResults.length > 0 &&
                searchResults.length < searchTotal && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={loadMoreResults}
                      className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                    >
                      Загрузить ещё
                    </Button>
                  </div>
                )}
            </motion.div>
          )}

          {/* ===== DETAIL VIEW ===== */}
          {currentView === "detail" && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <BeerDetail />
            </motion.div>
          )}

          {/* ===== TRENDING VIEW ===== */}
          {currentView === "trending" && (
            <motion.div
              key="trending"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <BackButton onClick={() => setView("home")} />
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                🔥 Тренды
              </h1>
              <TrendingList />
            </motion.div>
          )}

          {/* ===== HISTORY VIEW ===== */}
          {currentView === "history" && (
            <motion.div
              key="history"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <BackButton onClick={() => setView("home")} />
              <HistoryList onSearch={(q) => doSearch(q)} />
            </motion.div>
          )}

          {/* ===== FAVORITES VIEW ===== */}
          {currentView === "favorites" && (
            <motion.div
              key="favorites"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <BackButton onClick={() => setView("home")} />
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                ⭐ Избранное
              </h1>
              <FavoritesGrid />
            </motion.div>
          )}

          {/* ===== RECOGNIZE VIEW ===== */}
          {currentView === "recognize" && (
            <motion.div
              key="recognize"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <BackButton onClick={() => setView("home")} />
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                📸 Распознать пиво
              </h1>
              <PhotoRecognizer />
            </motion.div>
          )}

          {/* ===== STYLES VIEW ===== */}
          {currentView === "styles" && (
            <motion.div
              key="styles"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <BackButton onClick={() => setView("home")} />
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <LayoutGrid className="h-6 w-6 text-emerald-500" />
                Каталог стилей
              </h1>
              <StyleExplorer onSearchStyle={handleSearchStyle} />
              <StyleDistribution />
            </motion.div>
          )}

          {/* ===== MAP VIEW ===== */}
          {currentView === "map" && (
            <motion.div
              key="map"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <BackButton onClick={() => setView("home")} />
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                🗺️ Карта пивоварен
              </h1>
              <BreweryMap onNavigateToBeer={(beerId) => {
                fetch(`/api/beers/${beerId}`)
                  .then(r => r.ok ? r.json() : null)
                  .then(beer => { if (beer) selectBeer(beer); });
              }} />
            </motion.div>
          )}

          {/* ===== COMPARE VIEW ===== */}
          {currentView === "compare" && (
            <motion.div
              key="compare"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <CompareView />
            </motion.div>
          )}

          {/* ===== HELP VIEW ===== */}
          {currentView === "help" && (
            <motion.div
              key="help"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <BackButton onClick={() => setView("home")} />
              <HelpView />
            </motion.div>
          )}

          {/* ===== SETTINGS VIEW ===== */}
          {currentView === "settings" && (
            <motion.div
              key="settings"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <BackButton onClick={() => setView("home")} />
              <SettingsView />
            </motion.div>
          )}

          {/* ===== QUIZ VIEW ===== */}
          {currentView === "quiz" && (
            <motion.div
              key="quiz"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <QuizView />
            </motion.div>
          )}

          {/* ===== CALCULATOR VIEW ===== */}
          {currentView === "calculator" && (
            <motion.div
              key="calculator"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <CalculatorView />
            </motion.div>
          )}

          {/* ===== ACHIEVEMENTS VIEW ===== */}
          {currentView === "achievements" && (
            <motion.div
              key="achievements"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <BackButton onClick={() => setView("home")} />
              <AchievementsView />
            </motion.div>
          )}

          {/* ===== RECOMMENDATIONS VIEW ===== */}
          {currentView === "recommendations" && (
            <motion.div
              key="recommendations"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <BackButton onClick={() => setView("home")} />
              <RecommendationsView />
            </motion.div>
          )}

          {/* ===== ANALYTICS VIEW ===== */}
          {currentView === "analytics" && (
            <motion.div
              key="analytics"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <EnhancedStats />
            </motion.div>
          )}

          {/* ===== JOURNAL VIEW ===== */}
          {currentView === "journal" && (
            <motion.div
              key="journal"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <JournalView />
            </motion.div>
          )}

          {/* ===== ROULETTE VIEW ===== */}
          {currentView === "roulette" && (
            <motion.div
              key="roulette"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <BeerRoulette />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ScrollToTop />

      {/* Floating Compare Bar */}
      <AnimatePresence>
        {compareBeers.length > 0 && currentView !== "compare" && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-3"
          >
            <div className="max-w-2xl mx-auto">
              <Button
                onClick={() => {
                  if (compareBeers.length === 2) {
                    setShowCompare(true);
                    setView("compare");
                  } else {
                    toast({
                      title: "Выберите 2 пива",
                      description: `Добавьте ещё ${2 - compareBeers.length} пиво для сравнения`,
                    });
                  }
                }}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-xl shadow-amber-500/30 dark:shadow-amber-900/40 rounded-xl font-semibold"
              >
                <ArrowLeftRight className="h-5 w-5" />
                Сравнить ({compareBeers.length}/2)
                <span className="text-amber-200 text-xs ml-1">
                  {compareBeers.map((b) => b.name).join(" vs ")}
                </span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
    </>
  );
}