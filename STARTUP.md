# BeerID — Запуск 🍺

> Персональный журнал и гид по пиву

## Варианты запуска

### 🚀 Вариант 1 — Быстрый dev (SQLite, без Docker)

**Требования:** [Bun 1.3+](https://bun.sh)

```bash
./dev-sqlite.sh
```

Скрипт автоматически:
- ✓ Переключает Prisma схему на SQLite (с авто-восстановлением на PostgreSQL при выходе)
- ✓ Создаёт `.env` с dev-настройками
- ✓ Генерирует Prisma client
- ✓ Создаёт SQLite БД `prisma/dev.db`
- ✓ Заполняет 38+ пивами, стилями, trending entries
- ✓ Запускает dev server на http://localhost:3000
- ✓ При выходе (Ctrl+C) возвращает схему на PostgreSQL

**Идеально для:** быстрой разработки, тестирования, демонстрации.

### 🐳 Вариант 2 — Production-like (PostgreSQL через Docker)

**Требования:** Docker + Docker Compose

```bash
# Запускает Postgres 16 + BeerID app
docker compose up -d

# Применить миграции + сид
docker compose exec app bunx prisma migrate deploy
docker compose exec app bunx prisma db seed

# Проверить
curl http://localhost:3000/api/health
```

**Идеально для:** тестирования production-фич (ARRAY queries, FILTER aggregation), staging-окружения.

### ⚙️ Вариант 3 — Production deploy на VPS

См. `docs/DEPLOYMENT.md` — подробное руководство:
- VPS + Caddy + auto-LetsEncrypt
- Managed PostgreSQL (Neon/Supabase/RDS)
- GitHub OAuth app
- Sentry DSN
- CI/CD pipeline

## Linux Desktop — иконка запуска

Файл `BeerID.desktop` — это Linux .desktop entry для запуска из файлового менеджера или dock.

**Установка иконки на рабочий стол:**

```bash
# 1. Скопировать на рабочий стол
cp BeerID.desktop ~/Desktop/

# 2. Сделать исполняемым
chmod +x ~/Desktop/BeerID.desktop

# 3. Дважды кликнуть — откроется терминал с dev server
```

**Добавить в Applications menu:**

```bash
cp BeerID.desktop ~/.local/share/applications/
update-desktop-database ~/.local/share/applications/
```

После этого BeerID появится в launcher (Super key → "BeerID").

**.desktop файл запускает `bash start.sh`** — это production-режим с PostgreSQL. Для dev на SQLite отредактируйте `Exec=` строку на `bash dev-sqlite.sh`.

## Команды

| Команда | Описание |
|---|---|
| `./dev-sqlite.sh` | Dev server на SQLite (быстро) |
| `./start.sh` | Production-режим с PostgreSQL |
| `bun run dev` | Dev server (нужна настроенная БД) |
| `bun run build` | Production build |
| `bun run start` | Запуск prod (после build) |
| `bun run lint` | ESLint |
| `bun run typecheck` | TypeScript проверка |
| `bunx prisma studio` | GUI для БД |
| `bunx prisma migrate reset` | Сброс БД (dev) |
| `bunx prisma db seed` | Заполнить начальными данными |

## Возможности

- 🍺 Каталог 38+ пив (локально + Untappd онлайн)
- 🔍 Поиск с fuzzy matching (рус↔англ алиасы)
- 📝 Дегустационный журнал (4 категории оценки)
- ⭐ Избранное с optimistic UI
- 📊 Статистика по стилям, странам, ABV/IBU
- 🎰 Пивная рулетка
- 🧠 Викторина (10 вопросов batch mode)
- 🗺️ Карта пивоварен
- 🏆 Геймификация (ачивки)
- 📅 Пиво дня
- 🧮 Калькулятор BAC (Widmark формула)
- 📸 Распознавание по фото (VLM, опционально)
- 📤 Экспорт/импорт JSON-бэкап
- 🌙 Тёмная тема
- 📱 PWA manifest (можно установить как приложение)

## Что нужно заранее

- **Bun 1.3+** — runtime и пакетный менеджер ([установка](https://bun.sh))
- Опционально для prod: **PostgreSQL 14+**, **Docker**

## Структура проекта

```
beer/
├── start.sh                    ← Запуск production с PostgreSQL
├── dev-sqlite.sh               ← Запуск dev с SQLite (быстро)
├── BeerID.desktop              ← Иконка для Linux desktop
├── STARTUP.md                  ← Этот файл
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # 31 API routes
│   │   ├── icon.svg            # Favicon
│   │   ├── manifest.ts         # PWA manifest
│   │   ├── error.tsx           # Error boundaries
│   │   └── layout.tsx          # OG metadata + theme
│   ├── components/beer/        # 30+ React components
│   └── lib/                    # Shared utilities (zod, logger, etc.)
├── prisma/
│   ├── schema.prisma           # 12 моделей с @@unique constraints
│   ├── migrations/             # Initial migration (306 строк)
│   └── seed.ts                 # 38 пив начальных данных
├── docs/                       # AUDIT.md + DEPLOYMENT.md + ARCHITECTURE.md
├── Dockerfile                  # Multi-stage production образ
├── docker-compose.yml          # Postgres + app
├── Caddyfile                   # Reverse proxy с security headers
├── sentry.*.config.ts          # Error tracking
└── package.json
```

## Документация

- `docs/AUDIT.md` — полный отчёт аудита (6 этапов, ~87 проверок)
- `docs/README.md` — подробный README
- `docs/DEPLOYMENT.md` — deploy на VPS с Caddy + Docker + Postgres
- `docs/ARCHITECTURE.md` — архитектура, ER-диаграмма, API контракты

## Лицензия

MIT — см. [LICENSE](./LICENSE).
