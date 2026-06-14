<#
.SYNOPSIS
  Pipeline completo: download GTFS Portugal → merge → exportar mapa + shapes.
#>
param(
  [string]$Date      = (Get-Date -Format "yyyyMMdd"),
  [int]   $Stride    = 2,
  [string]$FeedsDir  = "Backend\experiments\results\feeds",
  [string]$MapOut    = "Frontend\public\data\gtfs_map_latest.json",
  [string]$ShapesOut = "Frontend\public\data\gtfs_shapes_latest.json",
  [switch]$SkipDownload
)

$root   = $PSScriptRoot | Split-Path -Parent
$python = Join-Path $root "Backend\.venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
  Write-Error "Python venv não encontrado em: $python"; exit 1
}

Set-Location $root

# 1. Download
if (-not $SkipDownload) {
  Write-Host "`n[1/3] A descarregar feeds GTFS…" -ForegroundColor Cyan
  & powershell -ExecutionPolicy Bypass -File "scripts\download-gtfs-portugal.ps1" -FeedsDir $FeedsDir
}

# 2. Merge
Write-Host "`n[2/3] A fazer merge dos feeds…" -ForegroundColor Cyan
& $python "Backend\experiments\merge_gtfs_feeds.py" `
    --feeds-dir  (Join-Path $root $FeedsDir) `
    --date       $Date `
    --map-out    (Join-Path $root $MapOut) `
    --shapes-out (Join-Path $root $ShapesOut) `
    --stride     $Stride

if ($LASTEXITCODE -ne 0) { Write-Error "Merge falhou"; exit 1 }

Write-Host "`n[3/3] Concluído!" -ForegroundColor Green
Write-Host "  Mapa:   $MapOut"   -ForegroundColor Green
Write-Host "  Shapes: $ShapesOut" -ForegroundColor Green
