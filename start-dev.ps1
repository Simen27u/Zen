$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"
$backend = Join-Path $root "backend"

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "Fant ikke '$name'." -ForegroundColor Yellow
    Write-Host "Installer Node.js LTS fra https://nodejs.org/ og åpne terminalen på nytt."
    Write-Host ""
    exit 1
  }
}

function Install-IfMissing($folder) {
  $nodeModules = Join-Path $folder "node_modules"
  if (-not (Test-Path $nodeModules)) {
    Write-Host "Installerer pakker i $folder ..."
    Push-Location $folder
    npm install
    Pop-Location
  }
}

Assert-Command "node"
Assert-Command "npm"

Install-IfMissing $backend
Install-IfMissing $frontend

Write-Host ""
Write-Host "Starter Zen DEV ..." -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001"
Write-Host "Frontend: http://localhost:3000"
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm run dev"

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
