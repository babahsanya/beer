#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# BeerID — dev режим на SQLite (без Docker/Postgres)
#
# Быстрый запуск для разработки: создаёт SQLite БД, применяет схему,
# сиddирует начальными данными, запускает dev server.
#
# НЕ используйте для production — Postgres-only features (ARRAY, FILTER,
# ANY()) в routes не будут работать на SQLite. Для prod используйте
# start.sh + docker-compose (PostgreSQL).
# ──────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

echo "🍺 BeerID — Dev режим (SQLite)"
echo "⚠️  Только для разработки. Production → start.sh + PostgreSQL"
echo ""

# 1. Переключаем схему на SQLite если ещё нет
if grep -q 'provider = "postgresql"' prisma/schema.prisma; then
  echo "🔄 Переключаю схему на SQLite..."
  cp prisma/schema.prisma prisma/schema.prisma.postgres.bak
  sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
  # Удаляем @db.Text (Postgres-only) — для SQLite это валидно просто как String
  sed -i 's/@db.Text//' prisma/schema.prisma
  echo "   ✓ Schema → SQLite (backup: schema.prisma.postgres.bak)"
fi

# 2. Создаём .env для SQLite
cat > .env << 'EOF'
DATABASE_URL=file:./prisma/dev.db
AUTH_SECRET=dev_secret_please_change_in_production_min_32_chars_long_xxxxxx
AUTH_URL=http://localhost:3000
NODE_ENV=development
EOF
echo "   ✓ .env создан (SQLite)"

# 3. Восстанавливаем postgres схему при выходе (любой сигнал)
restore_postgres() {
  if [ -f prisma/schema.prisma.postgres.bak ]; then
    echo ""
    echo "🔄 Восстанавливаю postgres схему..."
    cp prisma/schema.prisma.postgres.bak prisma/schema.prisma
    rm prisma/schema.prisma.postgres.bak
    bunx prisma generate 2>&1 | tail -2
    echo "   ✓ Schema restored to PostgreSQL"
  fi
}
trap restore_postgres EXIT INT TERM

# 4. Устанавливаем deps если нет
if [ ! -d node_modules ]; then
  echo "📦 Устанавливаю зависимости..."
  bun install 2>&1 | tail -3
fi

# 5. Генерируем Prisma client (с SQLite схемой!)
echo "🔧 Генерирую Prisma client (SQLite)..."
bunx prisma generate 2>&1 | tail -2

# 6. Создаём SQLite БД через db push
echo "🗄️  Создаю SQLite БД..."
bunx prisma db push --accept-data-loss --force-reset 2>&1 | tail -5
echo "   ✓ БД создана"

# 7. Сидируем
echo "🌱 Заполняю начальными данными..."
bunx prisma db seed 2>&1 | tail -3

echo ""
echo "🚀 Запускаю dev server..."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  BeerID (dev, SQLite): http://localhost:3000"
echo ""
echo "  Ctrl+C — остановить (схема автоматически вернётся на PostgreSQL)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Передаём trap в child process через exec
exec bun run dev
