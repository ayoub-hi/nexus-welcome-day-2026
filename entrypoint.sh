#!/bin/sh
set -e

echo "==> Applying database migrations..."
npx prisma migrate deploy

echo "==> Seeding questions (skipped if already present)..."
node prisma/seed.js

echo "==> Starting the server..."
exec npm run start
