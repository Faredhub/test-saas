#!/usr/bin/env node
/**
 * TixelERP Local Setup Script
 * Run this after PostgreSQL is installed and running
 * Command: npm run setup:local
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function runCommand(command, description) {
  try {
    info(`Running: ${description}`);
    execSync(command, { stdio: "inherit", shell: true });
    success(`Completed: ${description}`);
  } catch (err) {
    error(`Failed: ${description}\n${err.message}`);
  }
}

async function main() {
  log("\n" + "=".repeat(60), colors.blue);
  log("   Knnect360 Local Setup Script", colors.blue);
  log("=".repeat(60) + "\n", colors.blue);

  // Step 1: Check if .env.local exists
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    error(".env.local not found. Please ensure it's in the project root.");
  }
  success("✓ .env.local found");

  // Step 2: Check database connection
  info("Checking PostgreSQL connection...");
  try {
    execSync(
      `$env:PGPASSWORD='admin123'; psql -U postgres -h localhost -d postgres -c 'SELECT 1;' 2>$null`,
      { stdio: "pipe", shell: "powershell" }
    );
    success("✓ PostgreSQL is running");
  } catch {
    error(
      "PostgreSQL is not running or not installed. Please install PostgreSQL 16 first."
    );
  }

  // Step 3: Run Prisma migrations
  await runCommand(
    "npx prisma migrate deploy",
    "Running Prisma migrations"
  );

  // Step 4: Seed database
  await runCommand("npx prisma db seed", "Seeding database with admin user");

  // Step 5: Success message
  log("\n" + "=".repeat(60), colors.green);
  log("   🎉 Setup Complete!", colors.green);
  log("=".repeat(60) + "\n", colors.green);

  log("📋 Admin Login Credentials:", colors.blue);
  log("   Emails: kamkhya@knnect360.com", colors.blue);
  log("           subham@gmail.com", colors.blue);
  log("   Password: Admin@123", colors.blue);

  log("\n🚀 To start the dev server:", colors.yellow);
  log("   npm run dev", colors.yellow);

  log("\n📖 Project will be running at:", colors.yellow);
  log("   http://localhost:3000", colors.yellow);

  log("\n");
}

main().catch((err) => {
  error(`Unexpected error: ${err.message}`);
});
