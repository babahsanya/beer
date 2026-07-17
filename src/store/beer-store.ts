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
  selectBeer: (beer: Beer) => void;
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

  selectBeer: (beer) => set({ selectedBeer: beer, currentView: "detail" }),

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