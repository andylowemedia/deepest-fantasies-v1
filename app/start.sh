#!/bin/sh
set -e

echo "Installing dependencies..."
npm install

echo "Syncing database schema..."
./node_modules/.bin/prisma db push

echo "Seeding database..."
./node_modules/.bin/tsx prisma/seed.ts || echo "Seed skipped (already seeded or error ignored)"

echo "Starting Next.js development server..."
exec npm run dev