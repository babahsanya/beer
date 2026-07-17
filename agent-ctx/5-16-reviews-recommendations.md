# Task 5+16: Review Form + Recommendations

## Files Modified
- `/src/app/api/beers/[id]/reviews/route.ts` — Added POST handler
- `/src/components/beer/beer-reviews.tsx` — Added review form with star selector, author input, comment textarea

## Files Created
- `/src/app/api/recommendations/route.ts` — GET endpoint for personalized beer recommendations
- `/src/components/beer/recommendations-view.tsx` — Recommendations UI with cards

## Summary
### Task A (Reviews POST)
- POST `/api/beers/[id]/reviews` validates author (min 2 chars), rating (0.5-5), comment (max 500 chars)
- Creates review, recalculates beer average rating and count
- UI: animated form with star selector (1-5), author Input, Textarea with char counter, "Отправить отзыв" button
- Toast on success, form clears and hides, new review prepended to list

### Task B (Recommendations)
- GET `/api/recommendations` fetches favorites, finds candidate beers not in favorites
- Scoring: +2 matching style, +1 matching country, +1 high rating (>=3.8)
- Returns top 8 with Russian reason strings
- Fallback: 5 random top-rated beers with "Популярное пиво" reason
- UI: `RecommendationsView` with Sparkles heading, beer cards with reason, refresh button