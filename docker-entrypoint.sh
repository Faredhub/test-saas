#!/bin/sh
set -e

echo "Running Prisma migrations..."
node scripts/migrate-deploy.mjs

echo "Starting Next.js server..."
exec node --max-http-header-size=65536 server.js
