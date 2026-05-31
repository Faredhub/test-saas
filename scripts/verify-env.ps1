#!/usr/bin/env powershell
# Environment verification script for TixelERP

Write-Host "`n" -ForegroundColor Blue
Write-Host "=" * 70 -ForegroundColor Blue
Write-Host "  Knnect360 Environment Verification" -ForegroundColor Blue
Write-Host "=" * 70 -ForegroundColor Blue
Write-Host ""

$errors = @()
$warnings = @()
$success_count = 0

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Cyan
try {
    $node_version = & node --version 2>&1
    Write-Host "  ✓ Node.js: $node_version" -ForegroundColor Green
    $success_count++
} catch {
    $errors += "Node.js is not installed"
    Write-Host "  ✗ Node.js not found" -ForegroundColor Red
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Cyan
try {
    $npm_version = & npm --version 2>&1
    Write-Host "  ✓ npm: $npm_version" -ForegroundColor Green
    $success_count++
} catch {
    $errors += "npm is not installed"
    Write-Host "  ✗ npm not found" -ForegroundColor Red
}

# Check .env.local
Write-Host "Checking .env.local..." -ForegroundColor Cyan
if (Test-Path ".env.local") {
    Write-Host "  ✓ .env.local exists" -ForegroundColor Green
    $success_count++
} else {
    $errors += ".env.local not found"
    Write-Host "  ✗ .env.local not found" -ForegroundColor Red
}

# Check node_modules
Write-Host "Checking dependencies..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    $module_count = @(Get-ChildItem "node_modules" -Directory).Count
    Write-Host "  ✓ Dependencies installed ($module_count modules)" -ForegroundColor Green
    $success_count++
} else {
    $warnings += "node_modules not found - run 'npm install'"
    Write-Host "  ⚠ Dependencies not installed" -ForegroundColor Yellow
}

# Check Prisma client
Write-Host "Checking Prisma..." -ForegroundColor Cyan
if (Test-Path "src/generated/prisma") {
    Write-Host "  ✓ Prisma client generated" -ForegroundColor Green
    $success_count++
} else {
    $warnings += "Prisma client not generated - run 'npx prisma generate'"
    Write-Host "  ⚠ Prisma client not generated" -ForegroundColor Yellow
}

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Cyan
try {
    $env:PGPASSWORD = "admin123"
    $result = & psql -U postgres -h localhost -d postgres -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pg_version = & psql -U postgres -h localhost -d postgres -c "SELECT version();" 2>&1 | Select-Object -First 1
        Write-Host "  ✓ PostgreSQL is running" -ForegroundColor Green
        Write-Host "    $pg_version" -ForegroundColor Gray
        $success_count++
    } else {
        $errors += "PostgreSQL is not accessible"
        Write-Host "  ✗ PostgreSQL connection failed" -ForegroundColor Red
    }
} catch {
    $errors += "PostgreSQL client not found"
    Write-Host "  ✗ PostgreSQL not found: $_" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "=" * 70 -ForegroundColor Blue
Write-Host "  Summary" -ForegroundColor Blue
Write-Host "=" * 70 -ForegroundColor Blue

Write-Host ""
Write-Host "Checks Passed: $success_count/6" -ForegroundColor Green

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Errors:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   • $error" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Warnings:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   • $warning" -ForegroundColor Yellow
    }
}

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host ""
    Write-Host "🎉 Everything looks good!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run:" -ForegroundColor Cyan
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
}

Write-Host "=" * 70 -ForegroundColor Blue
Write-Host ""
