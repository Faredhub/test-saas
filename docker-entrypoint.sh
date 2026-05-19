#!/bin/sh
set -e

echo "Running Prisma migrations..."
node scripts/migrate-deploy.mjs

echo "Starting Next.js server..."
exec node server.js
