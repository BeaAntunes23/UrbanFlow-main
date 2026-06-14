$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $root 'Backend'
$frontendPath = Join-Path $root 'Frontend'

if (-not (Test-Path $backendPath)) {
  throw "Backend path not found: $backendPath"
}

if (-not (Test-Path $frontendPath)) {
  throw "Frontend path not found: $frontendPath"
}

function Stop-ProcessOnPort {
  param([int]$Port)

  $pids = @()
  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

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
        Write-Host "[dev] Port $Port freed (PID $pidValue)." -ForegroundColor Yellow
      } catch {
        try {
          Stop-Process -Id [int]$pidValue -Force -ErrorAction Stop
          Write-Host "[dev] Port $Port freed (PID $pidValue)." -ForegroundColor Yellow
        } catch {
          Write-Host "[dev] Could not terminate PID $pidValue on port $Port." -ForegroundColor DarkYellow
        }
      }
    }
  }
}

Stop-ProcessOnPort -Port 3000
Stop-ProcessOnPort -Port 8000

$venvPython = Join-Path $backendPath '.venv\Scripts\python.exe'
$venvPythonParent = Join-Path (Split-Path -Parent $backendPath) '.venv\Scripts\python.exe'
$reloadArgs = '--reload --reload-dir . --reload-exclude __pycache__/* --reload-exclude experiments/results/* --reload-exclude experiments/__pycache__/* --port 8000'
$pythonCommand = if (Test-Path $venvPython) {
  "& '$venvPython' -m uvicorn server:app $reloadArgs"
} elseif (Test-Path $venvPythonParent) {
  "& '$venvPythonParent' -m uvicorn server:app $reloadArgs"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
  "py -m uvicorn server:app $reloadArgs"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  "python -m uvicorn server:app $reloadArgs"
} else {
  throw 'Python launcher not found (py/python).'
}

Write-Host "[dev] Starting Backend at $backendPath" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$backendPath'; $pythonCommand"
)

Write-Host "[dev] Starting Frontend at $frontendPath" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$frontendPath'; npm start"
)

Write-Host '[dev] Backend: http://localhost:8000' -ForegroundColor Green
Write-Host '[dev] Frontend: http://localhost:3000' -ForegroundColor Green
Write-Host '[dev] Both services launched in separate terminals.' -ForegroundColor Green
