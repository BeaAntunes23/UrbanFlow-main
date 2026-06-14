param(
  [string]$GtfsPath = "Backend/experiments/results/gtfs_tub_braga.zip",
  [string]$Date = "20260317",
  [string]$Out = "Frontend/public/data/gtfs_map_latest.json"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$pythonExe = Join-Path $root "Backend/.venv/Scripts/python.exe"
if (-not (Test-Path $pythonExe)) {
  throw "Python venv nao encontrado em $pythonExe"
}

if (-not (Test-Path $GtfsPath)) {
  throw "Ficheiro GTFS nao encontrado: $GtfsPath"
}

& $pythonExe "Backend/experiments/export_gtfs_map_data.py" --gtfs $GtfsPath --date $Date --out $Out
Write-Host "Mapa GTFS exportado para $Out"
