export interface Beer {
  id: string;
  name: string;
  style: string;
  abv: number;
  ibu: number;
  country: string;
  brewery: string;
  description: string;
  label: string;
  rating: number;
  ratingCount: number;
  totalCheckins: number;
  monthlyCheckins: number;
  dailyCheckins: number;
  source: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SimilarBeer extends Beer {
  similarity: number;
}

export interface BeerStats {
  totalCheckins: number;
  monthlyCheckins: number;
  dailyCheckins: number;
  ratings: {
    aroma: number;
    taste: number;
    appearance: number;
    overall: number;
  };
  ratingBreakdown?: {
    aroma: number;
    taste: number;
    appearance: number;
    overall: number;
  };
  ratingDistribution?: Record<string, number>;
}

export interface TrendingBeer extends Beer {
  checkinDelta?: number;
}

export interface SearchHistory {
  id: string;
  query: string;
  createdAt: string;
}

export interface Favorite {
  id: string;
  beerId: string;
  beer: Beer;
  createdAt: string;
}

export interface StyleInfo {
  style: string;
  count: number;
  avgRating: number;
  exampleBeer: string;
  exampleBeerId: string;
}

export interface QuickStats {
  totalBeers: number;
  totalReviews: number;
  totalFavorites: number;
  totalStyles: number;
  totalCountries: number;
  topRatedBeer: string;
  mostCheckedIn: string;
  avgRating: number;
}

export interface QuizQuestion {
  id: string;
  fact1: string;
  fact2: string;
  fact3: string;
  options: string[];
 correctIndex: number;
 beerName: string;
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export interface BreweryMapPoint {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  beerCount: number;
  topBeer: string;
 topBeerId: string;
 avgRating: number;
}

export interface Recommendation {
  beer: Beer;
  reason: string;
 score: number;
}

export type AppView =
  | "home"
  | "search"
  | "detail"
  | "trending"
  | "history"
  | "favorites"
  | "recognize"
  | "styles"
  | "compare"
  | "help"
  | "settings"
  | "quiz"
  | "calculator"
  | "map"
  | "achievements"
  | "recommendations";

export type TrendingCategory = "craft" | "macro" | "global" | "weekly";