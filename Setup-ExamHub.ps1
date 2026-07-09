# ExamHub Tanzania — Setup Script
# Run from your project root: .\Setup-ExamHub.ps1

param(
  [string]$ProjectPath = "C:\Users\DELL\Documents\EXAMS HUB\Tanzania-Student-Exams"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ExamHub Tanzania — Vite + Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Clone or pull
if (Test-Path $ProjectPath) {
  Write-Host "Updating existing repo..." -ForegroundColor Yellow
  Set-Location $ProjectPath
  git fetch origin
  git reset --hard origin/main
} else {
  Write-Host "Cloning repo..." -ForegroundColor Yellow
  git clone https://github.com/MbazaCodes/Tanzania-Student-Exams.git $ProjectPath
  Set-Location $ProjectPath
}

# 2. Write .env
Write-Host "Writing .env..." -ForegroundColor Yellow
$env_content = @"
VITE_SUPABASE_URL=https://pdyjpkgjiakvlqqcicjj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWpwa2dqaWFrdmxxcWNpY2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjIyODMsImV4cCI6MjA5OTEzODI4M30.yu1EqrKFAClBh2opHqE1ZIRFdHB5jVL1NauMkSI4CBc
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWpwa2dqaWFrdmxxcWNpY2pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU2MjI4MywiZXhwIjoyMDk5MTM4MjgzfQ.xpqggJdI4uDbglVzv6HdsiIrztIWDVLfGAvuGlfdsOM
VITE_SUPABASE_PUBLISHABLE=sb_publishable_xIXam1XdYWwxqS_wiXMvsA_ZMQzVEDv
"@
[System.IO.File]::WriteAllText("$ProjectPath\.env", $env_content, [System.Text.UTF8Encoding]::new($false))

# 3. Install deps
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# 4. Done
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Run Supabase schema first!" -ForegroundColor Red
Write-Host "  1. Open Supabase Dashboard for project pdyjpkgjiakvlqqcicjj" -ForegroundColor Yellow
Write-Host "  2. Go to SQL Editor -> New Query" -ForegroundColor Yellow
Write-Host "  3. Paste contents of supabase\001_schema.sql and Run" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then start the dev server:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or build for production:" -ForegroundColor Cyan
Write-Host "  npm run build" -ForegroundColor White
