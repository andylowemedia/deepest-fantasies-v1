#!/usr/bin/env bash
#
# One-shot environment setup: build + start the stack, then prepare the database.
# Safe to re-run (the seed skips if the DB is already populated).
# Run from anywhere: ./setup.sh
#
set -euo pipefail

# Always operate from the repo root (where docker-compose.yml lives).
cd "$(dirname "$0")"

echo "==> Building images (no cache) and starting containers"
docker compose build --no-cache
docker compose up -d

echo "==> Waiting for the database to be ready"
until docker compose exec -T db pg_isready -U postgres -d deepestfantasies >/dev/null 2>&1; do
  sleep 1
done

echo "==> Installing dependencies"
docker compose exec -T app npm install

echo "==> Generating Prisma client and pushing schema"
docker compose exec -T app npx prisma generate
docker compose exec -T app npx prisma db push --skip-generate

echo "==> Seeding database"
docker compose exec -T app npm run db:seed

cat <<'DONE'

Setup complete.

The dev container is up but does not auto-start the server. To run it:

  docker compose exec app npm run dev

Then open http://localhost:3000
DONE