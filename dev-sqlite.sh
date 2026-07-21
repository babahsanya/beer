#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# BeerID — Dev режим на SQLite (Linux/macOS)
#
# Все логи пишутся в:
#   logs/beerid-dev.log       — Next.js + Prisma + наш logger (всё в одном)
#   logs/beerid.log           — API routes (structured logger)
#   logs/beerid-error.log     — только ошибки
#
# Открыть логи в реальном времени (в другом терминале):
#   tail -f logs/beerid-dev.log
# ──────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

echo ""
echo "🍺 BeerID — Dev режим (SQLite)"
echo "⚠️  Только для разработки. Production → start.sh + PostgreSQL"
echo ""

# 0. Создаём папку для логов
mkdir -p logs
DEV_LOG="logs/beerid-dev.log"
# Очищаем dev-лог при старте (structured логи НЕ очищаем)
> "$DEV_LOG"
echo "📝 Логи пишутся в:"
echo "   $DEV_LOG"
echo "   logs/beerid.log"
echo "   logs/beerid-error.log"
echo ""

# 1. Проверяем что установлен bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun не установлен!"
    echo ""
    echo "Установите Bun:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    echo "  Сайт: https://bun.sh"
    exit 1
fi

echo "✓ Bun установлен: $(bun --version)"

# 2. Переключаем схему на SQLite
BACKUP_CREATED=false
if grep -q 'provider = "postgresql"' prisma/schema.prisma; then
    echo "🔄 Переключаю схему на SQLite..."
    cp prisma/schema.prisma prisma/schema.prisma.postgres.bak
    sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
    sed -i 's/@db\.Text//' prisma/schema.prisma
    BACKUP_CREATED=true
    echo "   ✓ Schema → SQLite (backup: schema.prisma.postgres.bak)"
fi

# 3. Создаём .env
LOGS_DIR_ABS="$(pwd)/logs"
cat > .env << EOF
DATABASE_URL=file:./prisma/dev.db
AUTH_SECRET=dev_secret_please_change_in_production_min_32_chars_long_xxxxxx
AUTH_URL=http://localhost:3000
NODE_ENV=development
AUTH_TRUST_HOST=true
LOG_DIR=$LOGS_DIR_ABS
LOG_FORMAT=human
EOF
echo "   ✓ .env создан (SQLite)"

# 4. Восстановление postgres схемы при выходе
restore_postgres() {
    if [ "$BACKUP_CREATED" = true ] && [ -f prisma/schema.prisma.postgres.bak ]; then
        echo ""
        echo "🔄 Восстанавливаю postgres схему..."
        cp prisma/schema.prisma.postgres.bak prisma/schema.prisma
        rm prisma/schema.prisma.postgres.bak
        bunx prisma generate 2>&1 | tail -2
        echo "   ✓ Schema restored to PostgreSQL"
    fi
}
trap restore_postgres EXIT INT TERM

# 5. Устанавливаем deps если нет
if [ ! -d node_modules ]; then
    echo "📦 Устанавливаю зависимости..."
    bun install 2>&1 | tail -3
    echo "   ✓ Зависимости установлены"
fi

# 6. Генерируем Prisma client
echo "🔧 Генерирую Prisma client (SQLite)..."
bunx prisma generate 2>&1 | tail -2

# 7. Создаём SQLite БД
echo "🗄️  Создаю SQLite БД..."
bunx prisma db push --accept-data-loss --force-reset 2>&1 | tail -5
echo "   ✓ БД создана"

# 8. Сидируем
echo "🌱 Заполняю начальными данными..."
bunx prisma db seed 2>&1 | tail -3

echo ""
echo "🚀 Запускаю dev server..."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  BeerID: http://localhost:3000"
echo ""
echo "  Логи в реальном времени (другой терминал):"
echo "    tail -f logs/beerid-dev.log"
echo ""
echo "  Ctrl+C — остановить (схема вернётся на PostgreSQL)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 9. Запускаем dev server — вывод идёт В ТЕРМИНАЛ и В ФАЙЛ одновременно
bun run dev 2>&1 | tee "$DEV_LOG"
