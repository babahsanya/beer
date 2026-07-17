# Task A + B — Calculator & Achievements

## Files Created

### Task A: Калькулятор промилле
- `/src/components/beer/calculator-view.tsx` — Pure client-side BAC calculator using Widmark formula
  - Gender toggle (Мужской/Женский), weight input, dynamic drink rows, hours elapsed
  - Color-coded results: green (<0.3), yellow (0.3-0.8), orange (0.8-1.5), red (>1.5)
  - Framer Motion animated result number, progress bar, spring transitions
  - Amber theme, shadcn/ui Card/Input/Button, BackButton for navigation
  - Fun fact: "X банок пива 🍺" equivalent

### Task B: Пивные ачивки
- `/src/app/api/achievements/route.ts` — GET (fetch all, auto-seed) + POST (increment progress, auto-unlock)
- `/src/app/api/achievements/check/route.ts` — GET sync endpoint that queries real DB counts:
  - SearchHistory → first_search
  - ViewHistory distinct beerId → beer_explorer + beer_guru
  - ViewHistory + Beer join distinct styles → style_taster
  - ViewHistory + Beer where style includes "stout" → stout_lover
  - Favorite count → favorite_collector
  - Current hour >= 23 → night_owl unlock
- `/src/components/beer/achievements-view.tsx` — Achievement grid with:
  - On mount: sync then fetch
  - Progress summary with animated gradient progress bar
  - 2-col desktop / 1-col mobile grid
  - Staggered framer-motion entrance
  - Unlocked: green border + glow + checkmark + date
  - Locked: amber border, dimmed, progress bar

## Notes
- Did NOT modify page.tsx, types/beer.ts, or store
- All text in Russian
- Lint passes clean for all new files
- DB schema already had UserAchievement model, no changes needed