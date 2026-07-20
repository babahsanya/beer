# BeerID — Запуск 🍺

> Персональный журнал и гид по пиву

## 🪟 Windows

### Вариант 1 — Быстрый dev (SQLite, без Docker) — РЕКОМЕНДУЕТСЯ

**Требования:** [Bun 1.3+](https://bun.sh) для Windows

**Установка Bun (один раз):**
```powershell
# В PowerShell (от администратора):
powershell -c "irm bun.sh/install.ps1 | iex"

# Или через scoop:
scoop install bun
```

**Запуск BeerID:**

1. Откройте папку с проектом в Проводнике
2. **Двойной клик на `BeerID.cmd`** — откроется PowerShell с запущенным сервером
3. Дождитесь сообщения `BeerID доступен по адресу: http://localhost:3000`
4. Откройте http://localhost:3000 в браузере

**Или через PowerShell:**
```powershell
cd C:\path\to\beer
.\dev-sqlite.ps1
```

**Создать ярлык на рабочем столе (один раз):**
```powershell
powershell -ExecutionPolicy Bypass -File .\create-shortcut.ps1
```
После этого на рабочем столе появится `BeerID.lnk` — двойной клик запускает BeerID.

### Вариант 2 — Production-like (PostgreSQL через Docker Desktop)

**Требования:** [Docker Desktop для Windows](https://www.docker.com/products/docker-desktop/)

```powershell
# Запускает Postgres 16 + BeerID app
docker compose up -d

# Применить миграции + сид (один раз)
docker compose exec app bunx prisma migrate deploy
docker compose exec app bunx prisma db seed

# Проверить
curl http://localhost:3000/api/health
```

### Вариант 3 — С локальным PostgreSQL

Если у вас установлен PostgreSQL локально:

1. Создайте БД `beerid`:
   ```sql
   CREATE DATABASE beerid;
   ```
2. Отредактируйте `.env` — укажите ваш `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/beerid?schema=public
   ```
3. Запустите:
   ```powershell
   .\start.ps1
   ```

---

## 🐧 Linux / 🍎 macOS

### Вариант 1 — Быстрый dev (SQLite, без Docker) — РЕКОМЕНДУЕТСЯ

**Требования:** [Bun 1.3+](https://bun.sh)

```bash
./dev-sqlite.sh
```

### Вариант 2 — Linux Desktop — иконка запуска

**Установка иконки на рабочий стол:**
```bash
cp BeerID.desktop ~/Desktop/
chmod +x ~/Desktop/BeerID.desktop
# Двойной клик → откроется терминал с dev server
```

**Добавить в Applications menu:**
```bash
cp BeerID.desktop ~/.local/share/applications/
update-desktop-database ~/.local/share/applications/
```

### Вариант 3 — Production deploy на VPS

См. `docs/DEPLOYMENT.md` — подробное руководство:
- VPS + Caddy + auto-LetsEncrypt
- Managed PostgreSQL (Neon/Supabase/RDS)
- GitHub OAuth app
- Sentry DSN

---

## 📋 Что делают скрипты запуска

### `dev-sqlite.sh` / `dev-sqlite.ps1` (быстрый dev на SQLite)

Автоматически:
- ✓ Переключает Prisma схему на SQLite (с авто-восстановлением на PostgreSQL при выходе)
- ✓ Создаёт `.env` с dev-настройками
- ✓ Генерирует Prisma client
- ✓ Создаёт SQLite БД `prisma/dev.db`
- ✓ Заполняет 38+ пивами, стилями, trending entries
- ✓ Запускает dev server на http://localhost:3000
- ✓ При выходе (Ctrl+C) возвращает схему на PostgreSQL

**Идеально для:** быстрой разработки, тестирования, демонстрации.

### `start.sh` / `start.ps1` (production с PostgreSQL)

- ✓ Создаёт `.env` если нет
- ✓ Устанавливает deps если нет
- ✓ Генерирует Prisma client
- ✓ Применяет `prisma migrate deploy` (PostgreSQL миграции)
- ✓ Сидирует если пусто
- ✓ Запускает dev server

**Идеально для:** staging, testing production features (ARRAY, FILTER aggregation).

---

## 🛠️ Все команды

| Windows (PowerShell) | Linux/macOS (Bash) | Описание |
|---|---|---|
| `.\dev-sqlite.ps1` | `./dev-sqlite.sh` | Dev server на SQLite (быстро) |
| `.\start.ps1` | `./start.sh` | Production-режим с PostgreSQL |
| — | `./BeerID.desktop` | Linux desktop иконка |
| `BeerID.cmd` (двойной клик) | — | Windows запуск двойным кликом |
| `bun run dev` | `bun run dev` | Dev server (нужна настроенная БД) |
| `bun run build` | `bun run build` | Production build |
| `bun run start` | `bun run start` | Запуск prod (после build) |
| `bun run lint` | `bun run lint` | ESLint |
| `bun run typecheck` | `bun run typecheck` | TypeScript проверка |
| `bunx prisma studio` | `bunx prisma studio` | GUI для БД |
| `bunx prisma migrate reset` | `bunx prisma migrate reset` | Сброс БД (dev) |
| `bunx prisma db seed` | `bunx prisma db seed` | Заполнить начальными данными |

---

## 📦 Возможности

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

---

## ❓ Устранение проблем

### Windows: "bun: command not found" или "не является внутренней командой"

Bun не установлен или не в PATH. Установите:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```
Перезапустите терминал после установки.

### Windows: "Невозможно загрузить файл ... выполнение сценариев отключено"

PowerShell ExecutionPolicy блокирует скрипты. Запустите:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Или используйте `BeerID.cmd` (двойной клик) — он использует `-ExecutionPolicy Bypass`.

### Windows: "Порт 3000 уже занят"

Другой процесс использует порт 3000. Найдите и остановите его:
```powershell
netstat -ano | findstr :3000
# Затем taskkill /PID <найденный_PID> /F
```

Или запустите BeerID на другом порту:
```powershell
$env:PORT=3001; .\dev-sqlite.ps1
```

### Linux: "bash: ./dev-sqlite.sh: Отказано в доступе"

Скрипт не исполняемый. Сделайте его исполняемым:
```bash
chmod +x dev-sqlite.sh
```

### Prisma: "URL must start with postgresql://"

В `.env` невалидный `DATABASE_URL`. Для dev на SQLite используйте:
```
DATABASE_URL=file:./prisma/dev.db
```

### Все страницы возвращают 500 после deploy

Применены не все миграции:
```bash
bunx prisma migrate deploy
bunx prisma db seed
```

---

## 📁 Структура проекта

```
beer/
├── start.sh                    ← Linux/macOS запуск production
├── start.ps1                   ← Windows запуск production
├── dev-sqlite.sh               ← Linux/macOS запуск dev (SQLite)
├── dev-sqlite.ps1              ← Windows запуск dev (SQLite)
├── BeerID.cmd                  ← Windows двойной клик
├── BeerID.desktop              ← Linux desktop иконка
├── create-shortcut.ps1         ← Windows создать .lnk ярлык
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
│   ├── schema.prisma          # 12 моделей с @@unique constraints
│   ├── migrations/             # Initial migration (306 строк)
│   └── seed.ts                 # 38 пив начальных данных
├── docs/                       # AUDIT.md + DEPLOYMENT.md + ARCHITECTURE.md
├── Dockerfile                  # Multi-stage production образ
├── docker-compose.yml          # Postgres + app
├── Caddyfile                   # Reverse proxy с security headers
├── sentry.*.config.ts          # Error tracking
└── package.json
```

## 📚 Документация

- `docs/AUDIT.md` — полный отчёт аудита (6 этапов, ~87 проверок)
- `docs/README.md` — подробный README
- `docs/DEPLOYMENT.md` — deploy на VPS с Caddy + Docker + Postgres
- `docs/ARCHITECTURE.md` — архитектура, ER-диаграмма, API контракты

## 📄 Лицензия

MIT — см. [LICENSE](./LICENSE).
