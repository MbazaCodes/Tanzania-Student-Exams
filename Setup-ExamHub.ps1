# ExamHub Tanzania — Setup Script
# Run from repo root: .\Setup-ExamHub.ps1

param([string]$ProjectPath = "C:\Users\DELL\Tanzania-Student-Exams")

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ExamHub Tanzania — Vite + Supabase"   -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Clone or pull
if (Test-Path $ProjectPath) {
    Write-Host "Updating repo..." -ForegroundColor Yellow
    Set-Location $ProjectPath
    git stash; git pull; git stash drop
} else {
    Write-Host "Cloning repo..." -ForegroundColor Yellow
    git clone https://github.com/MbazaCodes/Tanzania-Student-Exams.git $ProjectPath
    Set-Location $ProjectPath
}

# Write .env
Write-Host "Writing .env..." -ForegroundColor Yellow
@"
VITE_SUPABASE_URL=https://pdyjpkgjiakvlqqcicjj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWpwa2dqaWFrdmxxcWNpY2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjIyODMsImV4cCI6MjA5OTEzODI4M30.yu1EqrKFAClBh2opHqE1ZIRFdHB5jVL1NauMkSI4CBc
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWpwa2dqaWFrdmxxcWNpY2pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU2MjI4MywiZXhwIjoyMDk5MTM4MjgzfQ.xpqggJdI4uDbglVzv6HdsiIrztIWDVLfGAvuGlfdsOM
VITE_SUPABASE_PUBLISHABLE=sb_publishable_xIXam1XdYWwxqS_wiXMvsA_ZMQzVEDv
"@ | Out-File -Encoding UTF8 .env

# Install & run
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DONE — Run: npm run dev"               -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Run SQL in Supabase first!" -ForegroundColor Red
Write-Host "  supabase/001_schema.sql"
Write-Host "  supabase/002_storage.sql"
Write-Host "  supabase/003_functions.sql"
Write-Host "  supabase/004_features.sql"
