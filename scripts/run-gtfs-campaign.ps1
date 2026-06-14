param(
  [Parameter(Mandatory = $true)]
  [string]$GtfsPath,

  [string]$Date = "",
  [string]$PythonExe = "python",
  [int]$Repetitions = 30,
  [int]$Duration = 300,
  [double]$Dt = 0.2,
  [int]$Grid = 6,
  [int]$SeedBase = 20260301,
  [double]$SimSecondsPerHour = 30,
  [double]$AmbulanceWeight = 0.05
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendRoot = Join-Path $ProjectRoot "Backend"
$FrontendRoot = Join-Path $ProjectRoot "Frontend"
$SummaryOut = Join-Path $BackendRoot "experiments/results/gtfs_summary_latest.json"
$ProfileOut = Join-Path $FrontendRoot "experiments/results/gtfs_traffic_profile_latest.json"

Write-Host "[gtfs] 1/3 Validar e resumir feed GTFS..."
Push-Location $BackendRoot
try {
  $pythonArgs = @(
    "experiments/gtfs_validate_and_summarize.py",
    "--gtfs", $GtfsPath,
    "--out", $SummaryOut
  )

  if ($Date -ne "") {
    $pythonArgs += @("--date", $Date)
  }

  & $PythonExe @pythonArgs
}
finally {
  Pop-Location
}

Write-Host "[gtfs] 2/3 Construir perfil de tráfego para o simulador..."
Push-Location $FrontendRoot
try {
  node ./scripts/build-gtfs-traffic-profile.cjs `
    --summary $SummaryOut `
    --out $ProfileOut `
    --sim-seconds-per-hour $SimSecondsPerHour `
    --ambulance-weight $AmbulanceWeight
}
finally {
  Pop-Location
}

Write-Host "[gtfs] 3/3 Executar campanha experimental com perfil GTFS..."
Push-Location $FrontendRoot
try {
  node ./scripts/run-experiments.cjs `
    --repetitions $Repetitions `
    --duration $Duration `
    --dt $Dt `
    --grid $Grid `
    --seed-base $SeedBase `
    --gtfs-profile $ProfileOut
}
finally {
  Pop-Location
}

Write-Host "[gtfs] Concluído com sucesso."
Write-Host "[gtfs] Summary: $SummaryOut"
Write-Host "[gtfs] Profile: $ProfileOut"
Write-Host "[gtfs] Results: $FrontendRoot/experiments/results/latest.csv"
