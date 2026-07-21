# ──────────────────────────────────────────────────────────────────────
# BeerID — Dev режим на SQLite (Windows PowerShell версия)
#
# Все логи пишутся в:
#   logs/beerid-dev.log       — Next.js + Prisma + наш logger (всё в одном)
#   logs/beerid.log           — API routes (structured logger)
#   logs/beerid-error.log     — только ошибки
#
# Открыть логи в реальном времени (в другом окне PowerShell):
#   Get-Content logs\beerid-dev.log -Wait -Tail 50
# ──────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "🍺 BeerID — Dev режим (SQLite)" -ForegroundColor Yellow
Write-Host "⚠️  Только для разработки. Production → start.ps1 + PostgreSQL" -ForegroundColor DarkYellow
Write-Host ""

# 0. Создаём папку для логов
$logsDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}
$devLogPath = Join-Path $logsDir "beerid-dev.log"
$loggerPath = Join-Path $logsDir "beerid.log"
$errorLogPath = Join-Path $logsDir "beerid-error.log"

# Очищаем dev-лог при старте (structured logger логи НЕ очищаем — там история)
Set-Content $devLogPath "" -NoNewline
Write-Host "📝 Логи пишутся в:" -ForegroundColor Cyan
Write-Host "   $devLogPath" -ForegroundColor White
Write-Host "   $loggerPath" -ForegroundColor White
Write-Host "   $errorLogPath" -ForegroundColor White
Write-Host ""

# 1. Проверяем что установлен bun
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Bun не установлен!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите Bun для Windows:" -ForegroundColor Cyan
    Write-Host "  powershell -c ""irm bun.sh/install.ps1 | iex""" -ForegroundColor White
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
AUTH_TRUST_HOST=true
LOG_DIR=$logsDir
LOG_FORMAT=human
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

trap {
    Restore-PostgresSchema
    break
}

try {
    # 5. Устанавливаем deps если нет
    if (-not (Test-Path node_modules)) {
        Write-Host "📦 Устанавливаю зависимости..." -ForegroundColor Cyan
        bun install 2>&1 | Select-Object -Last 3
        Write-Host "   ✓ Зависимости установлены" -ForegroundColor Green
    }

    # 6. Генерируем Prisma client
    Write-Host "🔧 Генерирую Prisma client (SQLite)..." -ForegroundColor Cyan
    bunx prisma generate 2>&1 | Select-Object -Last 2

    # 7. Создаём SQLite БД
    Write-Host "🗄️  Создаю SQLite БД..." -ForegroundColor Cyan
    bunx prisma db push --accept-data-loss --force-reset 2>&1 | Select-Object -Last 5
    Write-Host "   ✓ БД создана" -ForegroundColor Green

    # 8. Сидируем
    Write-Host "🌱 Заполняю начальными данными..." -ForegroundColor Cyan
    bunx prisma db seed 2>&1 | Select-Object -Last 3

    Write-Host ""
    Write-Host "🚀 Запускаю dev server..." -ForegroundColor Green
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "  BeerID: http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "  Логи в реальном времени (другое окно PowerShell):" -ForegroundColor Cyan
    Write-Host "    Get-Content logs\beerid-dev.log -Wait -Tail 50" -ForegroundColor White
    Write-Host ""
    Write-Host "  Ctrl+C — остановить (схема вернётся на PostgreSQL)" -ForegroundColor DarkGray
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""

    # 9. Запускаем dev server — вывод идёт В ТЕРМИНАЛ и В ФАЙЛ одновременно
    bun run dev 2>&1 | Tee-Object -FilePath $devLogPath

} finally {
    Restore-PostgresSchema
}
