@echo off
REM ──────────────────────────────────────────────────────────────────────
REM BeerID — Запуск двойным кликом (Windows cmd wrapper)
REM
REM Двойной клик на этом файле откроет PowerShell с запущенным BeerID.
REM По умолчанию запускает dev режим на SQLite (без Docker/Postgres).
REM
REM Для production режима отредактируйте последнюю строку:
REM   powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
REM ──────────────────────────────────────────────────────────────────────

cd /d "%~dp0"

echo.
echo  BeerID - запуск...
echo.

REM Запускаем PowerShell скрипт, bypass ExecutionPolicy (для локальных скриптов)
powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0dev-sqlite.ps1"

REM Если PowerShell не запустился — возможно ExecutionPolicy блокирует
if errorlevel 1 (
    echo.
    echo  Ошибка: PowerShell не удалось запустить
    echo  Попробуйте вручную:
    echo    powershell -ExecutionPolicy Bypass -File dev-sqlite.ps1
    echo.
    pause
)
