$ErrorActionPreference = 'Stop'

$frontendRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $frontendRoot
$backendRoot = Join-Path $projectRoot 'Backend'

if (-not (Test-Path $backendRoot)) {
  throw "Backend path not found: $backendRoot"
}

function Stop-ProcessOnPort {
  param([int]$Port)

  $pids = @()

  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq 'Listen' }
  if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  } else {
    $netstatLines = netstat -ano | Select-String ":$Port"
    if ($netstatLines) {
      $pids = $netstatLines | ForEach-Object {
        ($_.ToString().Trim() -split '\s+')[-1]
      } | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique
    }
  }

  foreach ($pidValue in $pids) {
    if ([int]$pidValue -gt 0) {
      try {
        taskkill /PID $pidValue /T /F | Out-Null
        Write-Host "[dev:one] Porta $Port libertada (PID $pidValue)." -ForegroundColor Yellow
      } catch {
        try {
          Stop-Process -Id [int]$pidValue -Force -ErrorAction Stop
          Write-Host "[dev:one] Porta $Port libertada (PID $pidValue)." -ForegroundColor Yellow
        } catch {
          Write-Host "[dev:one] Não foi possível terminar PID $pidValue na porta $Port." -ForegroundColor DarkYellow
        }
      }
    }
  }
}

Stop-ProcessOnPort -Port 3000
Stop-ProcessOnPort -Port 8000

$pythonLauncher = if (Get-Command py -ErrorAction SilentlyContinue) {
  'py'
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  'python'
} else {
  throw 'Python launcher not found (py/python).'
}

$backendCommand = if ($pythonLauncher -eq 'py') {
  'py -m uvicorn server:app --reload --port 8000'
} else {
  'python -m uvicorn server:app --reload --port 8000'
}

Write-Host '[dev:one] A iniciar backend em background...' -ForegroundColor Cyan
$backendProcess = Start-Process powershell -ArgumentList @(
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-Command',
  "Set-Location '$backendRoot'; $backendCommand"
) -WindowStyle Hidden -PassThru
Write-Host '[dev:one] Backend lançado (arranque assíncrono).' -ForegroundColor Green

Write-Host '[dev:one] A iniciar frontend em http://localhost:3000 ...' -ForegroundColor Cyan
Push-Location $frontendRoot

try {
  npm start
} finally {
  Pop-Location
  if ($backendProcess -and -not $backendProcess.HasExited) {
    Write-Host '[dev:one] A terminar backend...' -ForegroundColor Yellow
    Stop-Process -Id $backendProcess.Id -Force
  }
}
