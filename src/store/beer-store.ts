import { create } from "zustand";
import type {
  AppView,
  Beer,
  SearchHistory,
  TrendingCategory,
} from "@/types/beer";

interface BeerStore {
  // View state
  currentView: AppView;
  previousView: AppView | null;

  // Data state
  selectedBeer: Beer | null;
  searchQuery: string;
  searchResults: Beer[];
  searchTotal: number;
  isLoading: boolean;
  isFavorite: boolean;

  // Trending
  trendingCategory: TrendingCategory;

  // Compare
  compareBeers: Beer[];
  showCompare: boolean;

  // Actions
  setView: (view: AppView) => void;
  goBack: () => void;
  goHome: () => void;
  selectBeer: (beer: Partial<Beer>) => void;
  clearBeer: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Beer[], total: number) => void;
  setLoading: (loading: boolean) => void;
  setFavorite: (fav: boolean) => void;
  setTrendingCategory: (cat: TrendingCategory) => void;
  addToCompare: (beer: Beer) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  setShowCompare: (show: boolean) => void;
}

export const useBeerStore = create<BeerStore>((set, get) => ({
  currentView: "home",
  previousView: null,
  selectedBeer: null,
  searchQuery: "",
  searchResults: [],
  searchTotal: 0,
  isLoading: false,
  isFavorite: false,
  trendingCategory: "craft",
  compareBeers: [],
  showCompare: false,

  setView: (view) =>
    set((state) => ({
      currentView: view,
      previousView: state.currentView,
    })),

  goBack: () => {
    const { previousView } = get();
    if (previousView) {
      set((state) => ({
        currentView: state.previousView!,
        previousView: "home" as AppView,
      }));
    } else {
      set({ currentView: "home", previousView: null });
    }
  },

  goHome: () =>
    set({ currentView: "home", previousView: null, selectedBeer: null }),

  selectBeer: (beer) => set({
    selectedBeer: {
      id: beer.id ?? "",
      name: beer.name ?? "",
      style: beer.style ?? "Неизвестный стиль",
      abv: beer.abv ?? 0,
      ibu: beer.ibu ?? 0,
      country: beer.country ?? "",
      brewery: beer.brewery ?? "",
      description: beer.description ?? "",
      label: beer.label ?? "",
      rating: beer.rating ?? 0,
      ratingCount: beer.ratingCount ?? 0,
      totalCheckins: beer.totalCheckins ?? 0,
      monthlyCheckins: beer.monthlyCheckins ?? 0,
      dailyCheckins: beer.dailyCheckins ?? 0,
      source: beer.source ?? "unknown",
      // Spread any extra fields the caller provided last so they win over
      // the safe defaults above (e.g. untappdBid, lastUpdated if present).
      ...beer,
    } as Beer,
    currentView: "detail",
  }),

  clearBeer: () => set({ selectedBeer: null }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchResults: (results, total) =>
    set({ searchResults: results, searchTotal: total }),

  setLoading: (loading) => set({ isLoading: loading }),

  setFavorite: (fav) => set({ isFavorite: fav }),

  setTrendingCategory: (cat) => set({ trendingCategory: cat }),

  addToCompare: (beer) => {
    const { compareBeers } = get();
    if (compareBeers.some((b) => b.id === beer.id)) {
      // Remove if already there
      set({ compareBeers: compareBeers.filter((b) => b.id !== beer.id) });
    } else if (compareBeers.length < 2) {
      set({ compareBeers: [...compareBeers, beer] });
    }
    // If full, the caller shows a toast
  },

  removeFromCompare: (id) => {
    set({ compareBeers: get().compareBeers.filter((b) => b.id !== id) });
  },

  clearCompare: () => set({ compareBeers: [], showCompare: false }),

  setShowCompare: (show) => set({ showCompare: show }),
}));