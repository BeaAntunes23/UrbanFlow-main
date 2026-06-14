param(
  [string]$FeedsDir = "Backend\experiments\results\feeds"
)

$root = $PSScriptRoot | Split-Path -Parent
$feedsPath = Join-Path $root $FeedsDir

Write-Host "`n=== Cleanup Old Transit Feeds (Rail/Metro) ===" -ForegroundColor Cyan
Write-Host "Target directory: $feedsPath`n"

$oldFeeds = @(
  "gtfs_cp.zip",
  "gtfs_metro_lisboa.zip",
  "gtfs_metro_porto.zip",
  "gtfs_mts.zip"
)

foreach ($feed in $oldFeeds) {
  $feedPath = Join-Path $feedsPath $feed
  if (Test-Path $feedPath) {
    Remove-Item -Path $feedPath -Force
    Write-Host "[deleted] $feed" -ForegroundColor Green
  } else {
    Write-Host "[skip] $feed not found" -ForegroundColor DarkGray
  }
}

Write-Host "`n[Done] Old feeds removed. Only bus-based GTFS feeds remain.`n" -ForegroundColor Green
