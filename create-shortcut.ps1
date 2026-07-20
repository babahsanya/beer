# ──────────────────────────────────────────────────────────────────────
# BeerID — Windows ярлык (.lnk файл)
#
# Этот PowerShell скрипт создаёт BeerID.lnk ярлык на рабочем столе,
# который запускает BeerID двойным кликом.
#
# Запуск ОДИН раз для создания ярлыка:
#   powershell -ExecutionPolicy Bypass -File create-shortcut.ps1
# ──────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

# Путь к BeerID.cmd (в той же директории что и этот скрипт)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetPath = Join-Path $scriptDir "BeerID.cmd"
$iconPath = Join-Path $scriptDir "src\app\icon.svg"

# Путь к рабочему столу
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "BeerID.lnk"

# Создаём ярлык через WScript.Shell
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)

$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $scriptDir
$shortcut.IconLocation = $iconPath
$shortcut.Description = "BeerID — Пивной справочник"
$shortcut.WindowStyle = 1  # Normal window

$shortcut.Save()

Write-Host ""
Write-Host "✓ Ярлык BeerID.lnk создан на рабочем столе" -ForegroundColor Green
Write-Host ""
Write-Host "Двойной клик по ярлыку запустит BeerID в dev режиме (SQLite)." -ForegroundColor Cyan
Write-Host "BeerID будет доступен по адресу: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для удаления ярлыка — просто удалите BeerID.lnk с рабочего стола." -ForegroundColor DarkGray
Write-Host ""
