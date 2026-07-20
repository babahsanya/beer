# ──────────────────────────────────────────────────────────────────────
# BeerID — Production-like запуск (Windows PowerShell версия)
#
# Запускает с PostgreSQL — нужен локальный Postgres или docker-compose up.
# Для быстрого dev на SQLite используйте dev-sqlite.ps1
#
# Запуск:
#   PowerShell:  .\start.ps1
# ──────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "🍺 BeerID — Production-like запуск (PostgreSQL)" -ForegroundColor Yellow
Write-Host ""

# 1. Проверяем что установлен bun
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Bun не установлен!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите Bun:" -ForegroundColor Cyan
    Write-Host "  powershell -c ""irm bun.sh/install.ps1 | iex""" -ForegroundColor White
    Write-Host "  Сайт: https://bun.sh" -ForegroundColor Cyan
    exit 1
}

Write-Host "✓ Bun установлен: $(bun --version)" -ForegroundColor Green

# 2. Создаём .env если нет
if (-not (Test-Path .env)) {
    Write-Host "⚙️  Создаю .env из .env.example..." -ForegroundColor Cyan
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
    } else {
        # Минимальный .env для dev
        $envContent = @"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/beerid?schema=public
AUTH_SECRET=dev_secret_please_change_in_production_min_32_chars_long_xxxxxx
AUTH_URL=http://localhost:3000
NODE_ENV=development
"@
        Set-Content .env $envContent -NoNewline
    }
    Write-Host "   ✓ .env создан — отредактируйте DATABASE_URL под ваш Postgres" -ForegroundColor Green
    Write-Host "   ℹ️  DATABASE_URL сейчас: postgresql://postgres:postgres@localhost:5432/beerid" -ForegroundColor DarkGray
}

# 3. Устанавливаем deps если нет
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Устанавливаю зависимости..." -ForegroundColor Cyan
    bun install 2>&1 | Select-Object -Last 3
    Write-Host "   ✓ Зависимости установлены" -ForegroundColor Green
}

# 4. Генерируем Prisma client
Write-Host "🔧 Генерирую Prisma client..." -ForegroundColor Cyan
bunx prisma generate 2>&1 | Select-Object -Last 2

# 5. Применяем миграции
Write-Host "🗄️  Применяю миграции..." -ForegroundColor Cyan
try {
    bunx prisma migrate deploy 2>&1 | Select-Object -Last 3
    Write-Host "   ✓ Миграции применены" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Ошибка миграции — убедитесь что PostgreSQL запущен" -ForegroundColor Yellow
    Write-Host "   ℹ️  Запустите: docker compose up -d postgres" -ForegroundColor DarkGray
    Write-Host "   ℹ️  Или используйте dev-sqlite.ps1 для SQLite" -ForegroundColor DarkGray
    exit 1
}

# 6. Сидируем если БД пустая
Write-Host "🌱 Заполняю начальными данными..." -ForegroundColor Cyan
bunx prisma db seed 2>&1 | Select-Object -Last 3

Write-Host ""
Write-Host "🚀 Запускаю dev server..." -ForegroundColor Green
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  BeerID: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  Ctrl+C — остановить" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

bun run dev
