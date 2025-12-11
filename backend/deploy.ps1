# Vercel Deployment Script for Windows
# Run this to deploy to Vercel

Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Green
Write-Host ""

# Check if vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found" -ForegroundColor Red
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Check if we're in the backend directory
if (-not (Test-Path "server.js")) {
    Write-Host "❌ Error: Must run from backend directory" -ForegroundColor Red
    Write-Host "Run: cd backend; .\deploy.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Vercel CLI found" -ForegroundColor Green
Write-Host ""

# Ask for deployment type
Write-Host "Select deployment type:" -ForegroundColor Cyan
Write-Host "1) Preview (test deployment)"
Write-Host "2) Production"
$choice = Read-Host "Enter choice (1 or 2)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔍 Deploying preview..." -ForegroundColor Yellow
        vercel
    }
    "2" {
        Write-Host ""
        Write-Host "🚀 Deploying to production..." -ForegroundColor Green
        vercel --prod
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the deployment URL"
Write-Host "2. Update frontend API URL"
Write-Host "3. Monitor logs in Vercel dashboard"
