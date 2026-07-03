# PowerShell script to sync and restructure Memo_API repository
$Source = "C:\Users\sunny\Desktop\Memo_api"
$Dest = "C:\Users\sunny\Desktop\Memo_api\Memo_API"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Syncing and Restructuring Memo_API Repository" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Clean up and sync Frontend
Write-Host "Syncing Frontend folder..." -ForegroundColor Green
$DestFrontend = Join-Path $Dest "Frontend"
if (Test-Path $DestFrontend) {
    # Remove files but avoid deleting the directory itself to prevent locking issues
    Remove-Item -Path "$DestFrontend\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $DestFrontend -Force | Out-Null
}
Copy-Item -Path (Join-Path $Source "Frontend\*") -Destination $DestFrontend -Recurse -Force

# 2. Sync Backend files
Write-Host "Syncing Backend folder..." -ForegroundColor Green
$DestBackend = Join-Path $Dest "Backend"
if (-not (Test-Path $DestBackend)) {
    New-Item -ItemType Directory -Path $DestBackend -Force | Out-Null
}
Copy-Item -Path (Join-Path $Source "Backend\*") -Destination $DestBackend -Recurse -Force

# Copy datasets into Backend so memo_api.py can load them when run locally
Copy-Item -Path "$Source\Data\*" -Destination $DestBackend -Force

# 3. Sync Data folder (for Vercel serverless function API)
Write-Host "Syncing Data folder..." -ForegroundColor Green
$DestData = Join-Path $Dest "Data"
if (-not (Test-Path $DestData)) {
    New-Item -ItemType Directory -Path $DestData -Force | Out-Null
}
Copy-Item -Path (Join-Path $Source "Data\*") -Destination $DestData -Recurse -Force

# 4. Sync Vercel Serverless Functions api folder
Write-Host "Syncing Vercel 'api' folder..." -ForegroundColor Green
$DestApi = Join-Path $Dest "api"
if (-not (Test-Path $DestApi)) {
    New-Item -ItemType Directory -Path $DestApi -Force | Out-Null
}
Copy-Item -Path (Join-Path $Source "api\*") -Destination $DestApi -Recurse -Force

# 5. Sync Configuration and Root Documents
Write-Host "Syncing configurations and documentation..." -ForegroundColor Green
$FilesToCopy = @(
    "vercel.json",
    "env.example",
    "API_DOCUMENTATION.md",
    "RUNBOOK.md",
    "C YUVA TEJA_MEMO_GENERATION_PORTFOLIO.md",
    "C YUVA TEJA_WEEK1-8_JOURNEY.md",
    "C YUVA TEJA_MEMO_GENERATION_PORTFOLIO.docx",
    "C YUVA TEJA_WEEK1-8_JOURNEY.docx",
    "Alignment_Check.txt",
    "Boundary_Test.txt",
    "Edge_Case_Validation.txt",
    "Latency_Comparison.txt",
    "Memo_Baseline.txt",
    "Memo_Dry_Run_Validation.txt",
    "Memo_Enhancements.txt",
    "Memo_Impact_Tracking.txt",
    "Memo_Load_Test_Report.txt",
    "Memo_Monitoring_Plan.md",
    "Memo_Production_Ready.txt",
    "Memo_Quality_Metrics.txt",
    "Memo_Quality_Score.txt",
    "Memo_Recommendation_Validation.txt",
    "Memo_SLA.txt",
    "Readme.txt",
    "Template_Validation.txt"
)

foreach ($File in $FilesToCopy) {
    $SrcFile = Join-Path $Source $File
    if (Test-Path $SrcFile) {
        Copy-Item -Path $SrcFile -Destination $Dest -Force
    }
}

Write-Host "`nSync complete! Checking Git status..." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Please run the following commands in your terminal to review, commit, and push:" -ForegroundColor Yellow
Write-Host "cd C:\Users\sunny\Desktop\Memo_api\Memo_API" -ForegroundColor White
Write-Host "git status" -ForegroundColor White
Write-Host "git add ." -ForegroundColor White
Write-Host "git commit -m 'Sync and restructure repository files'" -ForegroundColor White
Write-Host "git push" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Cyan
