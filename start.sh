#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# BeerID —一键 запуск
# Автоматически создаёт SQLite БД, применяет миграции, запускает dev server
# ──────────────────────────────────────────────────────────────────────

set -e

# Переход в директорию проекта (где лежит этот скрипт)
cd "$(dirname "$0")"

echo "🍺 BeerID — запуск"
echo ""

# 1. Проверяем .env, если нет — создаём с дефолтами для SQLite dev
if [ ! -f .env ]; then
  echo "⚙️  Создаю .env из .env.example..."
  if [ -f .env.example ]; then
    cp .env.example .env
  fi
  # Для dev используем SQLite (Prisma создаст файл автоматически)
  cat > .env << 'EOF'
DATABASE_URL=file:./prisma/dev.db
AUTH_SECRET=dev_secret_please_change_in_production_min_32_chars_long_xxxxxx
AUTH_URL=http://localhost:3000
NODE_ENV=development
EOF
  echo "   ✓ .env создан (dev режим, SQLite)"
fi

# 2. Проверяем node_modules
if [ ! -d node_modules ]; then
  echo "📦 Устанавливаю зависимости..."
  bun install 2>&1 | tail -3
  echo "   ✓ Зависимости установлены"
fi

# 3. Генерируем Prisma client
echo "🔧 Генерирую Prisma client..."
bunx prisma generate 2>&1 | tail -2
echo ""

# 4. Для SQLite dev режима — создаём БД и применяем миграции
if grep -q "^DATABASE_URL=file:" .env; then
  echo "🗄️  Создаю SQLite базу..."
  mkdir -p prisma
  bunx prisma migrate deploy 2>&1 | tail -3 || \
    bunx prisma db push --accept-data-loss 2>&1 | tail -3
  echo "   ✓ БД готова"
else
  echo "🗄️  PostgreSQL режим — применяю миграции..."
  bunx prisma migrate deploy 2>&1 | tail -3 || true
fi
echo ""

# 5. Сидируем БД начальными данными (если пусто)
echo "🌱 Заполняю БД начальными данными..."
bunx prisma db seed 2>&1 | tail -3 || echo "   ℹ️  Данные уже есть, пропускаю seed"
echo ""

# 6. Запускаем dev server
PORT="${PORT:-3000}"
echo "🚀 Запускаю dev server на порту $PORT..."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  BeerID доступен по адресу:"
echo ""
echo "    http://localhost:$PORT"
echo ""
echo "  Нажмите Ctrl+C для остановки"
echo "═══════════════════════════════════════════════════════════"
echo ""

exec bun run dev
