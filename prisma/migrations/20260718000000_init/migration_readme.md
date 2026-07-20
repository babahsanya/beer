# Migration: 20260718000000_init

This is the initial Prisma migration for BeerID (PostgreSQL). It creates the full schema from scratch, including the NextAuth identity tables and all user-scoped domain tables.

## What it creates

### Identity (NextAuth v5 + Prisma Adapter)

| Table | Purpose |
|---|---|
| **User** | Application user. `email @unique`, `@@index([email])`. Owns all user-scoped data. |
| **Account** | OAuth provider linkage. `@@unique([provider, providerAccountId])`. Cascade-deleted with User. |
| **Session** | Database session storage (used only if session strategy = 'database'). JWT is the default. |
| **VerificationToken** | Email magic-link tokens. `@@unique([identifier, token])`. |

### Domain

| Table | Purpose |
|---|---|
| **Beer** | Catalog (seed + Untappd + OBD). Hot-path fields indexed. |
| **Review** | Beer ratings + comments. `@@unique([beerId, userId])` — one review per user per beer. |
| **Favorite** | User bookmarks. `@@unique([userId, beerId])`. |
| **SearchHistory** | Per-user search log. Indexed on `[userId, createdAt]`. |
| **TrendingBeer** | Per-category leaderboard. `@@unique([category, rank])`. |
| **ViewHistory** | Per-user recently-viewed beers. `@@unique([userId, beerId])`. |
| **TastingEntry** | Personal tasting journal. Indexed on `[userId, createdAt]` and `[userId, beerStyle]`. |
| **UserAchievement** | Per-user gamification progress. `@@unique([userId, key])`. |

### Indexes (hot paths)

- `Beer`: style, country, brewery, untappdBid, rating, totalCheckins, createdAt
- `Review`: `[beerId, createdAt]`, `userId`
- `Favorite`: beerId, createdAt, userId
- `SearchHistory`: createdAt, `[userId, createdAt]`
- `TrendingBeer`: `[category, rank]`
- `ViewHistory`: beerId, createdAt, userId
- `TastingEntry`: beerStyle, createdAt, `[userId, createdAt]`, `[userId, beerStyle]`
- `UserAchievement`: userId
- `User`: email
- `Account`: userId
- `Session`: userId

### Foreign keys

All child tables cascade-delete with their parent:
- `Account`, `Session`, `Favorite`, `Review`, `ViewHistory`, `SearchHistory`, `TastingEntry`, `UserAchievement` → `User(id)` ON DELETE CASCADE
- `Review`, `Favorite`, `TrendingBeer`, `ViewHistory` → `Beer(id)` ON DELETE CASCADE

## Applying

```bash
# Production / Docker
prisma migrate deploy

# Local dev
DATABASE_URL=postgresql://user:password@localhost:5432/beerid?schema=public \
  prisma migrate deploy
```

## Notes

- `provider` lock is `postgresql` — SQLite is no longer supported.
- This migration is the combined Stage 1 + Stage 2 schema (User model + userId backfill landed in a single migration since Stage 1 was never deployed).
