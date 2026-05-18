#!/bin/sh
set -e

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy --config prisma.config.js 2>&1 || echo "Migration failed or already applied"

echo "Starting Next.js server..."
exec node server.js
