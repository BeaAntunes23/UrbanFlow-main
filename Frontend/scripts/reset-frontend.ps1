param(
  [switch]$FreshInstall
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "[reset] Frontend root: $projectRoot" -ForegroundColor Cyan
Push-Location $projectRoot

try {
  Write-Host "[reset] A parar processos Node antigos..." -ForegroundColor Yellow
  Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

  if ($FreshInstall -or -not (Test-Path "node_modules")) {
    Write-Host "[reset] A instalar dependências..." -ForegroundColor Yellow
    npm install
  }

  Write-Host "[reset] A validar build..." -ForegroundColor Yellow
  npm run build

  Write-Host "[reset] A arrancar servidor dev em http://localhost:3000 ..." -ForegroundColor Green
  npm start
}
finally {
  Pop-Location
}
