$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot 'Frontend'
$backendDir = Join-Path $repoRoot 'Backend'
$backendExpDir = Join-Path $backendDir 'experiments'
$venvCandidates = @(
    (Join-Path $repoRoot '.venv\Scripts\python.exe'),
    (Join-Path (Split-Path -Parent $repoRoot) '.venv\Scripts\python.exe')
)
$pythonCmd = 'python'
foreach ($candidate in $venvCandidates) {
    if (Test-Path $candidate) {
        $pythonCmd = $candidate
        break
    }
}

Write-Host '[reproduce] Starting excellence pipeline...'

Push-Location $repoRoot
$gitCommit = 'unknown'
try {
    $gitCommit = (git rev-parse --short HEAD).Trim()
} catch {
    Write-Host '[reproduce] git hash unavailable; continuing.'
}
Pop-Location

$stamp = Get-Date -Format 'yyyy-MM-ddTHH-mm-ss'
$manifestPath = Join-Path $backendExpDir "results\repro_manifest_$stamp.json"

Push-Location $frontendDir
npm run experiment:run
npm run rl:train
npm run rl:evaluate
npm run experiment:ablation
npm run experiment:sensitivity
Pop-Location

Push-Location $backendDir
& $pythonCmd 'experiments\run_full_pipeline.py' '--sync-frontend-figures'
Pop-Location

$manifest = @{
    generated_at = (Get-Date).ToString('o')
    git_commit = $gitCommit
    commands = @(
        'npm run experiment:run',
        'npm run rl:train',
        'npm run rl:evaluate',
        'npm run experiment:ablation',
        'npm run experiment:sensitivity',
        "$pythonCmd experiments/run_full_pipeline.py --sync-frontend-figures"
    )
    artifacts = @(
        'Frontend/experiments/results/latest.csv',
        'Frontend/experiments/results/latest.json',
        'Frontend/experiments/results/rl_evaluation_latest.csv',
        'Frontend/experiments/results/rl_evaluation_summary_latest.json',
        'Frontend/experiments/results/ablation_summary_latest.json',
        'Frontend/experiments/results/sensitivity_summary_latest.json',
        'Backend/experiments/results/summary_by_mode.csv',
        'Backend/experiments/results/comparison_ai_vs_traditional.csv',
        'Backend/experiments/results/analise_experimental.md',
        'Backend/experiments/results/capitulo_resultados.md'
    )
}

$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestPath -Encoding UTF8

Write-Host "[reproduce] Completed. Manifest: $manifestPath"
