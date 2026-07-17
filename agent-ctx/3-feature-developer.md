---
Task ID: 3
Agent: Feature Developer
Task: Create new components (HelpView, TopBeers, StyleDistribution, FoodPairing) and API endpoint

Work Log:
- Created /api/beers/top/route.ts — returns top 5 rated beers with review count via Prisma _count
- Created /src/lib/food-pairings.ts — standalone data file with 12 style→food mappings and getFoodPairings() function
- Created /src/components/beer/help-view.tsx — Russian-language help page with 5 sections (Поиск, Фильтры, Распознавание, Сравнение, Избранное) + keyboard shortcuts grid, glass-card styling, framer-motion staggered animations
- Created /src/components/beer/top-beers.tsx — horizontal scrollable row of top 5 beers with rank badges (gold/silver/bronze for top 3), RatingStars, style Badge, skeleton shimmer loading, framer-motion staggered entrance
- Created /src/components/beer/style-distribution.tsx — horizontal bar chart of beer style distribution, fetches from /api/styles, amber gradient bars with proportional widths, animated bars on mount via framer-motion, sorted by count descending
- Created /src/components/beer/food-pairing.tsx — food pairing suggestions based on beer style, uses getFoodPairings() from lib, emoji+name cards in 2-col grid, framer-motion scale-in animation
- Fixed unused imports in help-view.tsx (removed Badge, SlidersHorizontal, Camera, ArrowLeftRight, Heart, Command, ArrowDownUp, Download)
- Verified /api/beers/top returns correct data (5 beers with reviewCount field)
- Lint: clean (zero errors)

Stage Summary:
- 6 new files created: 1 API endpoint, 4 components, 1 data library
- All components follow existing project patterns (shadcn/ui, framer-motion, amber theme, glass-card, Russian text)
- API endpoint verified returning correct JSON with reviewCount
- Components are self-contained and ready for integration into page.tsx