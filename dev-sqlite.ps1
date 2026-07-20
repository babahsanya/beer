# ──────────────────────────────────────────────────────────────────────
# BeerID — Dev режим на SQLite (Windows PowerShell версия)
#
# Быстрый запуск для разработки на Windows: создаёт SQLite БД,
# применяет схему, сидирует начальными данными, запускает dev server.
#
# НЕ используйте для production — Postgres-only features (ARRAY, FILTER,
# ANY()) в routes не будут работать на SQLite. Для prod используйте
# start.ps1 + docker-compose (PostgreSQL).
#
# Запуск:
#   PowerShell:  .\dev-sqlite.ps1
#   Или двойной клик на BeerID.cmd
# ──────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "🍺 BeerID — Dev режим (SQLite)" -ForegroundColor Yellow
Write-Host "⚠️  Только для разработки. Production → start.ps1 + PostgreSQL" -ForegroundColor DarkYellow
Write-Host ""

# 1. Проверяем что установлен bun
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Bun не установлен!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите Bun для Windows:" -ForegroundColor Cyan
    Write-Host "  powershell -c ""irm bun.sh/install.ps1 | iex""" -ForegroundColor White
    Write-Host ""
    Write-Host "Или через scoop:" -ForegroundColor Cyan
    Write-Host "  scoop install bun" -ForegroundColor White
    Write-Host ""
    Write-Host "Сайт: https://bun.sh" -ForegroundColor Cyan
    exit 1
}

Write-Host "✓ Bun установлен: $(bun --version)" -ForegroundColor Green

# 2. Переключаем схему на SQLite если ещё нет
$backupCreated = $false
if ((Get-Content prisma/schema.prisma -Raw) -match 'provider = "postgresql"') {
    Write-Host "🔄 Переключаю схему на SQLite..." -ForegroundColor Cyan
    Copy-Item prisma/schema.prisma prisma/schema.prisma.postgres.bak -Force
    $content = Get-Content prisma/schema.prisma -Raw
    $content = $content -replace 'provider = "postgresql"', 'provider = "sqlite"'
    # Удаляем @db.Text (Postgres-only) — для SQLite валиден как String
    $content = $content -replace '@db\.Text', ''
    Set-Content prisma/schema.prisma $content -NoNewline
    $backupCreated = $true
    Write-Host "   ✓ Schema → SQLite (backup: schema.prisma.postgres.bak)" -ForegroundColor Green
}

# 3. Создаём .env для SQLite
$envContent = @"
DATABASE_URL=file:./prisma/dev.db
AUTH_SECRET=dev_secret_please_change_in_production_min_32_chars_long_xxxxxx
AUTH_URL=http://localhost:3000
NODE_ENV=development
"@
Set-Content .env $envContent -NoNewline
Write-Host "   ✓ .env создан (SQLite)" -ForegroundColor Green

# 4. Функция восстановления postgres схемы (вызывается при выходе)
function Restore-PostgresSchema {
    if ($backupCreated -and (Test-Path prisma/schema.prisma.postgres.bak)) {
        Write-Host ""
        Write-Host "🔄 Восстанавливаю postgres схему..." -ForegroundColor Cyan
        Copy-Item prisma/schema.prisma.postgres.bak prisma/schema.prisma -Force
        Remove-Item prisma/schema.prisma.postgres.bak -Force
        bunx prisma generate 2>&1 | Select-Object -Last 2
        Write-Host "   ✓ Schema restored to PostgreSQL" -ForegroundColor Green
    }
}

# 5. Устанавливаем trap для восстановления при любом выходе
trap {
    Restore-PostgresSchema
    break
}

try {
    # 6. Устанавливаем deps если нет
    if (-not (Test-Path node_modules)) {
        Write-Host "📦 Устанавливаю зависимости..." -ForegroundColor Cyan
        bun install 2>&1 | Select-Object -Last 3
        Write-Host "   ✓ Зависимости установлены" -ForegroundColor Green
    }

    # 7. Генерируем Prisma client (с SQLite схемой!)
    Write-Host "🔧 Генерирую Prisma client (SQLite)..." -ForegroundColor Cyan
    bunx prisma generate 2>&1 | Select-Object -Last 2

    # 8. Создаём SQLite БД через db push
    Write-Host "🗄️  Создаю SQLite БД..." -ForegroundColor Cyan
    bunx prisma db push --accept-data-loss --force-reset 2>&1 | Select-Object -Last 5
    Write-Host "   ✓ БД создана" -ForegroundColor Green

    # 9. Сидируем
    Write-Host "🌱 Заполняю начальными данными..." -ForegroundColor Cyan
    bunx prisma db seed 2>&1 | Select-Object -Last 3

    Write-Host ""
    Write-Host "🚀 Запускаю dev server..." -ForegroundColor Green
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "  BeerID (dev, SQLite): http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "  Ctrl+C — остановить (схема автоматически вернётся на PostgreSQL)" -ForegroundColor DarkGray
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""

    # 10. Запускаем dev server
    bun run dev

} finally {
    # Гарантированно восстанавливаем postgres схему при любом выходе
    Restore-PostgresSchema
}
