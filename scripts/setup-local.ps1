# TixelERP Setup Script for Windows PowerShell
# Run this file after installing PostgreSQL

# Colors for output
$colors = @{
    'Reset'  = "`e[0m"
    'Red'    = "`e[31m"
    'Green'  = "`e[32m"
    'Yellow' = "`e[33m"
    'Blue'   = "`e[34m"
}

function Write-Step {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# Header
Write-Host "`n" + ("=" * 70) -ForegroundColor Blue
Write-Host "          Knnect360 Local Development Setup" -ForegroundColor Blue
Write-Host ("=" * 70) + "`n" -ForegroundColor Blue

# Check if PostgreSQL is installed
Write-Step "Checking PostgreSQL installation..."
try {
    $env:PGPASSWORD = "admin123"
    $result = & psql -U postgres -h localhost -d postgres -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "PostgreSQL is running and accessible"
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Error "PostgreSQL is not running or not installed!"
    Write-Warning "Please install PostgreSQL 16 first: https://www.postgresql.org/download/windows/"
    Write-Host "`nInstallation Steps:" -ForegroundColor Yellow
    Write-Host "1. Download: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host "2. Run installer with password: admin123" -ForegroundColor Gray
    Write-Host "3. Keep port: 5432" -ForegroundColor Gray
    Write-Host "4. Complete installation" -ForegroundColor Gray
    Write-Host "5. Run this script again" -ForegroundColor Gray
    exit 1
}

# Check .env.local
Write-Step "Checking .env.local..."
if (Test-Path ".env.local") {
    Write-Success ".env.local exists"
} else {
    Write-Error ".env.local not found"
    exit 1
}

# Run npm install
Write-Step "Installing dependencies..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed"
    exit 1
}
Write-Success "Dependencies installed"

# Generate Prisma Client
Write-Step "Generating Prisma Client..."
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Error "Prisma generate failed"
    exit 1
}
Write-Success "Prisma Client generated"

# Run migrations
Write-Step "Running database migrations..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Error "Prisma migrate failed"
    exit 1
}
Write-Success "Database migrations completed"

# Seed database
Write-Step "Seeding database with admin user..."
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Error "Database seed failed"
    exit 1
}
Write-Success "Database seeded successfully"

# Success message
Write-Host "`n" + ("=" * 70) -ForegroundColor Green
Write-Host "                    🎉 Setup Complete!" -ForegroundColor Green
Write-Host ("=" * 70) + "`n" -ForegroundColor Green

Write-Host "📋 Admin Login Credentials:" -ForegroundColor Cyan
Write-Host "   Email:    kamkhya@knnect360.com" -ForegroundColor White
Write-Host "   Password: Admin@123" -ForegroundColor White

Write-Host "`n🚀 Start Development Server:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White

Write-Host "`n🌐 Access the application at:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000" -ForegroundColor White

Write-Host "`n📊 Features Available:" -ForegroundColor Cyan
Write-Host "   • 15 Business Modules" -ForegroundColor Gray
Write-Host "   • Multi-tenant Architecture" -ForegroundColor Gray
Write-Host "   • Role-based Access Control (RBAC)" -ForegroundColor Gray
Write-Host "   • Comprehensive Dashboard" -ForegroundColor Gray
Write-Host "   • REST API with Swagger" -ForegroundColor Gray

Write-Host "`n" + ("=" * 70) + "`n" -ForegroundColor Blue
