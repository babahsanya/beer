"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/beer/back-button";
import { useBeerStore } from "@/store/beer-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Plus,
  Star,
  MapPin,
  Wine,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Trophy,
  BarChart3,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "./empty-state";
import { RatingStars } from "./rating-stars";

// --- Types ---

interface TastingEntry {
  id: string;
  beerId: string;
  beerName: string;
  beerStyle: string;
  brewery: string;
  abv: number;
  country: string;
  personalRating: number;
  aroma: number;
  taste: number;
  appearance: number;
  mouthfeel: number;
  comment: string;
  location: string;
  glassType: string;
  wouldBuyAgain: boolean;
  createdAt: string;
  updatedAt: string;
}

interface JournalStats {
  totalEntries: number;
  avgRating: number;
  mostTastedStyle: string;
  ratingDistribution: Record<string, number>;
  tastingsPerMonth: { month: string; count: number }[];
  topRated: {
    beerName: string;
    personalRating: number;
    beerStyle: string;
    brewery: string;
  }[];
  styleDiversity: number;
}

type FilterTab = "all" | "style" | "high" | "notes";

const GLASS_TYPES = [
  "Шило",
  "Пинта",
  "Пилснер",
  "Вайз",
  "Тюльпан",
  "Рюмка",
  "Другое",
];

const RUSSIAN_MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// --- Helpers ---

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${RUSSIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function MiniRatingBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] text-muted-foreground w-14 shrink-0 text-right">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden min-w-0">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${(value / 5) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 w-3 text-right">
        {value}
      </span>
    </div>
  );
}

function InteractiveStars({
  value,
  onChange,
  size = 24,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className="focus:outline-none transition-transform active:scale-90"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i === value ? 0 : i)}
        >
          <Star
            size={size}
            className={`transition-colors ${
              i <= display
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/20"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// --- Beer Search for Dialog ---

function BeerSearchInput({
  onSelect,
  initialName,
}: {
  onSelect: (beer: {
    name: string;
    style: string;
    brewery: string;
    abv: number;
    country: string;
    id: string;
  }) => void;
  initialName: string;
}) {
  const [query, setQuery] = useState(initialName);
  const [results, setResults] = useState<
    { id: string; name: string; style: string; brewery: string; abv: number; country: string }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchBeers = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/beers/search?q=${encodeURIComponent(q)}&limit=5&offset=0`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(
          (data.beers || []).map(
            (b: Record<string, unknown>) => ({
              id: String(b.id),
              name: String(b.name || ""),
              style: String(b.style || ""),
              brewery: String(b.brewery || ""),
              abv: Number(b.abv) || 0,
              country: String(b.country || ""),
            })
          )
        );
        setShowDropdown(true);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchBeers(query), 400);
    return () => clearTimeout(timer);
  }, [query, searchBeers]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название пива..."
          className="pl-9"
        />
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-stone-900 shadow-lg">
          {results.map((b) => (
            <button
              key={b.id}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border-b border-amber-100 dark:border-amber-900/40 last:border-0"
              onClick={() => {
                onSelect(b);
                setQuery(b.name);
                setShowDropdown(false);
              }}
            >
              <p className="text-sm font-medium truncate">{b.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {b.brewery} · {b.style} · {b.abv}%
              </p>
            </button>
          ))}
        </div>
      )}
      {searching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-3.5 w-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// --- Add/Edit Dialog Form ---

function EntryForm({
  entry,
  onClose,
  onSaved,
}: {
  entry: TastingEntry | null;
  onClose: () => void;
  onSaved: (entry: TastingEntry) => void;
}) {
  const { toast } = useToast();
  const isEdit = !!entry;

  const [form, setForm] = useState({
    beerId: entry?.beerId || "",
    beerName: entry?.beerName || "",
    beerStyle: entry?.beerStyle || "",
    brewery: entry?.brewery || "",
    abv: entry?.abv || 0,
    country: entry?.country || "",
    personalRating: entry?.personalRating || 0,
    aroma: entry?.aroma || 0,
    taste: entry?.taste || 0,
    appearance: entry?.appearance || 0,
    mouthfeel: entry?.mouthfeel || 0,
    comment: entry?.comment || "",
    location: entry?.location || "",
    glassType: entry?.glassType || "",
    wouldBuyAgain: entry?.wouldBuyAgain || false,
  });
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleBeerSelect = (beer: {
    name: string;
    style: string;
    brewery: string;
    abv: number;
    country: string;
    id: string;
  }) => {
    setForm((prev) => ({
      ...prev,
      beerId: beer.id,
      beerName: beer.name,
      beerStyle: beer.style,
      brewery: beer.brewery,
      abv: beer.abv,
      country: beer.country,
    }));
  };

  const handleSave = async () => {
    if (!form.beerName.trim()) {
      toast({ title: "Укажите название пива", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/journal/${entry!.id}` : "/api/journal";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Ошибка сохранения");
      }

      const data = await res.json();
      toast({
        title: isEdit ? "Запись обновлена" : "Запись добавлена",
        description: form.beerName,
      });
      onSaved(data.entry);
      onClose();
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось сохранить",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const ratingFields = [
    { key: "personalRating", label: "Общая оценка" },
    { key: "aroma", label: "Аромат" },
    { key: "taste", label: "Вкус" },
    { key: "appearance", label: "Внешний вид" },
    { key: "mouthfeel", label: "Тело" },
  ] as const;

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
      {/* Beer selector */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
          Пиво
        </Label>
        <BeerSearchInput
          onSelect={handleBeerSelect}
          initialName={form.beerName}
        />
      </div>

      {/* Optional extra info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Пивоварня</Label>
          <Input
            value={form.brewery}
            onChange={(e) => update("brewery", e.target.value)}
            placeholder="Пивоварня"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Стиль</Label>
          <Input
            value={form.beerStyle}
            onChange={(e) => update("beerStyle", e.target.value)}
            placeholder="IPA, Stout..."
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">ABV %</Label>
          <Input
            type="number"
            step="0.1"
            value={form.abv || ""}
            onChange={(e) => update("abv", parseFloat(e.target.value) || 0)}
            placeholder="5.0"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Страна</Label>
          <Input
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="Россия"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Ratings */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
          Оценки
        </Label>
        <div className="space-y-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
          {ratingFields.map((field) => (
            <div
              key={field.key}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm text-foreground w-28 shrink-0">
                {field.label}
              </span>
              <InteractiveStars
                value={form[field.key as keyof typeof form] as number}
                onChange={(v) => update(field.key, v)}
                size={22}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Заметки</Label>
        <Textarea
          value={form.comment}
          onChange={(e) => update("comment", e.target.value)}
          placeholder="Впечатления от дегустации..."
          className="min-h-[80px] text-sm resize-none"
        />
      </div>

      {/* Location + Glass */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Место
          </Label>
          <Input
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Бар, дом..."
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Wine className="h-3 w-3" />
            Бокал
          </Label>
          <Select
            value={form.glassType}
            onValueChange={(v) => update("glassType", v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Выберите" />
            </SelectTrigger>
            <SelectContent>
              {GLASS_TYPES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Would buy again */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
        <div>
          <p className="text-sm font-medium">Куплю ещё</p>
          <p className="text-xs text-muted-foreground">
            Хотите попробовать снова?
          </p>
        </div>
        <Switch
          checked={form.wouldBuyAgain}
          onCheckedChange={(v) => update("wouldBuyAgain", v)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 border-amber-300 dark:border-amber-700"
        >
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !form.beerName.trim()}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
        >
          {saving ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isEdit ? (
            "Сохранить"
          ) : (
            "Добавить"
          )}
        </Button>
      </div>
    </div>
  );
}

// --- Main Journal View ---

export function JournalView() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<TastingEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TastingEntry | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [styleFilter, setStyleFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);

  // Fetch entries and stats
  const fetchEntries = useCallback(async (filters?: Record<string, string>) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.set(k, v);
        });
      }
      const res = await fetch(`/api/journal?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/journal/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchStyles = useCallback(async () => {
    try {
      const res = await fetch("/api/journal?limit=1000");
      if (res.ok) {
        const data = await res.json() as { entries?: Array<{ beerStyle?: string }> };
        const styles: string[] = [
          ...new Set(
            (data.entries || [])
              .map((e) => e.beerStyle)
              .filter((s): s is string => typeof s === 'string' && s.length > 0)
          ),
        ].sort();
        setAvailableStyles(styles);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchStats();
    fetchStyles();
  }, [fetchEntries, fetchStats, fetchStyles]);

  // Apply filters
  useEffect(() => {
    const filters: Record<string, string> = {};
    if (activeFilter === "style" && styleFilter) {
      filters.style = styleFilter;
    } else if (activeFilter === "high") {
      filters.minRating = "4";
    } else if (activeFilter === "notes") {
      filters.withNotes = "true";
    }
    fetchEntries(filters);
  }, [activeFilter, styleFilter, fetchEntries]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/journal/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      fetchStats();
      fetchStyles();
      toast({ title: "Запись удалена" });
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить запись",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (entry: TastingEntry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleSaved = (entry: TastingEntry) => {
    setEntries((prev) => {
      const exists = prev.findIndex((e) => e.id === entry.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = entry;
        return updated;
      }
      return [entry, ...prev];
    });
    fetchStats();
    fetchStyles();
  };

  const openNewEntry = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  // --- Render ---

  if (loading && entries.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <Skeleton className="h-8 w-48 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
          <Skeleton className="h-4 w-64 mx-auto mt-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-20 bg-amber-100 dark:bg-amber-900/30 rounded-xl"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-44 bg-amber-100 dark:bg-amber-900/30 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackButton onClick={() => useBeerStore.getState().goHome()} />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-3"
      >
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 beer-gradient-text">
            <BookOpen className="h-6 w-6" />
            Пивной журнал
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ваши личные записи о дегустациях
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingEntry(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={openNewEntry}
              className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shadow-lg shadow-amber-500/20 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Новая запись</span>
              <span className="sm:hidden">Добавить</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingEntry ? (
                  <>
                    <Pencil className="h-5 w-5 text-amber-500" />
                    Редактировать запись
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-amber-500" />
                    Новая дегустация
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            <EntryForm
              entry={editingEntry}
              onClose={() => {
                setDialogOpen(false);
                setEditingEntry(null);
              }}
              onSaved={handleSaved}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats Bar */}
      {stats && stats.totalEntries > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
        >
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                {stats.totalEntries}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Дегустаций
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center">
                <RatingStars rating={stats.avgRating} size={12} showValue />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Средняя оценка
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
            <CardContent className="p-3 text-center">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 truncate">
                {stats.mostTastedStyle || "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Топ стиль
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                <Trophy className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 truncate mt-0.5">
                {stats.topRated[0]?.beerName || "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Гордость коллекции
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filter Tabs */}
      {entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 flex-wrap"
        >
          {(
            [
              { key: "all", label: "Все" },
              { key: "style", label: "По стилю" },
              { key: "high", label: "Высокие оценки" },
              { key: "notes", label: "С заметками" },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.key}
              variant={activeFilter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(tab.key)}
              className={
                activeFilter === tab.key
                  ? "bg-amber-500 hover:bg-amber-600 text-white text-xs h-7"
                  : "text-xs h-7 border-amber-300 dark:border-amber-700"
              }
            >
              {tab.label}
            </Button>
          ))}

          {activeFilter === "style" && availableStyles.length > 0 && (
            <Select value={styleFilter} onValueChange={setStyleFilter}>
              <SelectTrigger className="h-7 w-auto text-xs min-w-[120px] border-amber-300 dark:border-amber-700">
                <SelectValue placeholder="Выберите стиль" />
              </SelectTrigger>
              <SelectContent>
                {availableStyles.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </motion.div>
      )}

      {/* Entry Cards */}
      {entries.length === 0 && !loading ? (
        <EmptyState
          title="Ваш журнал пуст"
          description="Начните записывать свои впечатления от пива"
          icon={<BookOpen className="h-8 w-8 text-amber-500" />}
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={activeFilter + styleFilter}
        >
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id;

              return (
                <motion.div
                  key={entry.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-lg hover:shadow-amber-200/20 dark:hover:shadow-amber-900/20 transition-all duration-300 overflow-hidden h-full">
                    <CardContent className="relative z-[2] p-3 sm:p-4 flex flex-col h-full">
                      {/* Header: Name + Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm text-foreground truncate">
                            {entry.beerName}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {entry.brewery}
                            {entry.country && ` · ${entry.country}`}
                          </p>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground/60 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={() => handleEdit(entry)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {entry.beerStyle && (
                          <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 text-[10px] px-2 py-0">
                            {entry.beerStyle}
                          </Badge>
                        )}
                        {entry.abv > 0 && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0">
                            {entry.abv}%
                          </Badge>
                        )}
                        {entry.wouldBuyAgain && (
                          <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-[10px] px-2 py-0 gap-0.5">
                            <TrendingUp className="h-2.5 w-2.5" />
                            Куплю ещё
                          </Badge>
                        )}
                      </div>

                      {/* Overall Rating */}
                      <div className="flex items-center gap-2 mt-2.5">
                        <RatingStars
                          rating={entry.personalRating}
                          size={14}
                          showValue
                        />
                      </div>

                      {/* Sub-ratings */}
                      <div className="space-y-1 mt-2.5">
                        <MiniRatingBar value={entry.aroma} label="Аромат" />
                        <MiniRatingBar value={entry.taste} label="Вкус" />
                        <MiniRatingBar
                          value={entry.appearance}
                          label="Внешний вид"
                        />
                        <MiniRatingBar value={entry.mouthfeel} label="Тело" />
                      </div>

                      {/* Comment */}
                      {entry.comment && (
                        <div className="mt-2.5">
                          <p
                            className={`text-xs text-muted-foreground leading-relaxed ${
                              !isExpanded ? "line-clamp-2" : ""
                            }`}
                          >
                            {entry.comment}
                          </p>
                          {entry.comment.length > 80 && (
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : entry.id)
                              }
                              className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 mt-1 hover:underline"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Свернуть
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Подробнее
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Footer: Location + Glass + Date */}
                      <div className="flex items-center gap-2 flex-wrap mt-auto pt-2.5 border-t border-amber-100 dark:border-amber-900/30">
                        {entry.location && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {entry.location}
                          </span>
                        )}
                        {entry.glassType && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Wine className="h-3 w-3" />
                            {entry.glassType}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Loading more indicator */}
      {loading && entries.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="pb-4" />
    </div>
  );
}