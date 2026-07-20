# BeerID — Запуск

> Персональный журнал и гид по пиву

## Быстрый запуск

### Linux / macOS — запустить по иконке

1. Установить зависимости (один раз):
   ```bash
   bun install
   ```

2. Сделать скрипт исполняемым (один раз):
   ```bash
   chmod +x start.sh
   ```

3. **Запуск по иконке**:
   - Linux: дважды кликните на файл `BeerID.desktop` — откроется терминал и запустится сервер
   - Или перетащите `BeerID.desktop` на панель задач / рабочий стол для постоянной иконки
   - Или через терминал: `./start.sh`

4. После запуска откройте в браузере: **http://localhost:3000**

### Windows

```cmd
# Установить bun (https://bun.sh)
bun install
start.sh
# Или: bash start.sh
```

### Через терминал (любая ОС)

```bash
./start.sh
```

Скрипт `start.sh` автоматически:
- ✓ Создаёт `.env` с dev-настройками (SQLite)
- ✓ Устанавливает зависимости если их нет
- ✓ Генерирует Prisma client
- ✓ Создаёт БД и применяет миграции
- ✓ Заполняет начальными данными (38 пив, стили, trending)
- ✓ Запускает dev server на http://localhost:3000

## Что нужно预先

- **Bun 1.3+** — runtime и пакетный менеджер ([установка](https://bun.sh))
- Опционально для prod: **PostgreSQL 14+**, **Docker**

## Команды

| Команда | Описание |
|---|---|
| `./start.sh` | Запуск dev server (порт 3000) |
| `bun run build` | Production build |
| `bun run start` | Запуск prod (после build) |
| `bun run lint` | ESLint |
| `bun run typecheck` | TypeScript проверка |
| `bunx prisma studio` | GUI для БД |
| `bunx prisma migrate reset` | Сброс БД (dev) |
| `bunx prisma db seed` | Заполнить начальными данными |

## Production deploy

См. `docs/DEPLOYMENT.md` — подробное руководство по деплою на VPS с Caddy, Docker, PostgreSQL.

## Структура

```
beer/
├── start.sh                    ← Запуск по иконке (этот файл)
├── BeerID.desktop              ← Иконка для Linux desktop
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/beer/        # React компоненты
│   └── lib/                    # Shared утилиты
├── prisma/                     # БД схема + миграции
├── docs/                       # Документация
├── Dockerfile                  # Production образ
└── docker-compose.yml          # Postgres + app
```

## Возможности

- 🍺 Каталог 38+ пив (локально + Untappd онлайн)
- 🔍 Поиск с fuzzy matching (рус↔англ алиасы)
- 📝 Дегустационный журнал (4 категории оценки)
- ⭐ Избранное + оптимистичный UI
- 📊 Статистика по стилям, странам, ABV/IBU
- 🎰 Пивная рулетка
- 🧠 Викторина
- 🗺️ Карта пивоварен
- 🏆 Геймификация (ачивки)
- 📅 Пиво дня
- 🧮 Калькулятор BAC (Widmark)
- 📸 Распознавание по фото (VLM, опционально)

## Документация

- `docs/AUDIT.md` — полный отчёт аудита (6 этапов)
- `docs/README.md` — подробный README
- `docs/DEPLOYMENT.md` — deploy на VPS
- `docs/ARCHITECTURE.md` — архитектура проекта
