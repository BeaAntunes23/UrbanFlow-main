param(
  [string]$FeedsDir = "Backend\experiments\results\feeds",
  [int]$TimeoutSec  = 60,
  [switch]$IncludeExperimental,
  [string]$RegistryPath = "scripts\gtfs-feed-registry.json"
)

$ErrorActionPreference = "Continue"
$root = $PSScriptRoot | Split-Path -Parent

New-Item -ItemType Directory -Force -Path (Join-Path $root $FeedsDir) | Out-Null

# Copy already-downloaded feeds into feeds/ folder
$existing = @(
  @{ Name = "gtfs_tub_braga.zip"; Src = "Backend\experiments\results\gtfs_tub_braga.zip" }
)
foreach ($e in $existing) {
  $src  = Join-Path -Path $root -ChildPath $e.Src
  $dest = Join-Path -Path (Join-Path -Path $root -ChildPath $FeedsDir) -ChildPath $e.Name
  if ((Test-Path $src) -and -not (Test-Path $dest)) {
    Copy-Item -Path $src -Destination $dest
    Write-Host "[copy] $($e.Name)" -ForegroundColor Cyan
  } elseif (Test-Path $dest) {
    Write-Host "[skip] $($e.Name) already present" -ForegroundColor DarkGray
  } else {
    Write-Host "[warn] $($e.Name) not found in results/" -ForegroundColor Yellow
  }
}

$registryAbs = Join-Path -Path $root -ChildPath $RegistryPath
if (-not (Test-Path $registryAbs)) {
  throw "Feed registry not found: $registryAbs"
}

$registry = Get-Content $registryAbs -Raw | ConvertFrom-Json

$feeds = @()
foreach ($f in $registry.feeds) {
  if ($f.status -eq "local") { continue }
  if ([string]::IsNullOrWhiteSpace($f.url)) { continue }

  if ($IncludeExperimental) {
    if ($f.status -in @("verified", "pending")) {
      $feeds += @{ Name = $f.name; Url = $f.url; Note = $f.note }
    }
  } else {
    if ($f.status -eq "verified") {
      $feeds += @{ Name = $f.name; Url = $f.url; Note = $f.note }
    }
  }
}

if ($IncludeExperimental) {
  Write-Host "[info] Including pending feeds from registry when URL is present." -ForegroundColor Yellow
} else {
  Write-Host "[info] Using verified feeds from registry only." -ForegroundColor DarkGray
}

$pendingWithoutUrl = @($registry.feeds | Where-Object { $_.status -eq "pending" -and [string]::IsNullOrWhiteSpace($_.url) })
if ($pendingWithoutUrl.Count -gt 0) {
  Write-Host "[info] Pending districts without official URL: $($pendingWithoutUrl.Count)" -ForegroundColor DarkGray
}

$ok = 0
$nok = 0
foreach ($feed in $feeds) {
  $dest = Join-Path -Path (Join-Path -Path $root -ChildPath $FeedsDir) -ChildPath $feed.Name
  if (Test-Path $dest) {
    $sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 2)
    Write-Host "[skip] $($feed.Name) already exists ($sizeMB MB)" -ForegroundColor DarkGray
    $ok++
    continue
  }

  Write-Host "[down] $($feed.Note)" -ForegroundColor White
  Write-Host "       $($feed.Url)"  -ForegroundColor DarkGray

  try {
    curl.exe -L --silent --show-error --max-time $TimeoutSec -o $dest $feed.Url 2>&1 | Out-Null

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dest)) {
      throw "curl failed with code $LASTEXITCODE"
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($dest)
    $entryCount = $zip.Entries.Count
    $zip.Dispose()

    if ($entryCount -lt 3) { throw "Invalid zip ($entryCount entries)" }

    $sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 2)
    Write-Host "[ok]   $($feed.Name) - $sizeMB MB, $entryCount files" -ForegroundColor Green
    $ok++
  } catch {
    Write-Host "[fail] $($feed.Name): $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $dest) { Remove-Item $dest -Force }
    $nok++
  }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Feeds available in: $FeedsDir"
Get-ChildItem -Path (Join-Path $root $FeedsDir) -Filter "*.zip" | ForEach-Object {
  $mb = [math]::Round($_.Length / 1MB, 2)
  Write-Host "  OK $($_.Name) ($mb MB)" -ForegroundColor Green
}
Write-Host "===========================================" -ForegroundColor Cyan
