#!/bin/sh
set -e

echo "======================================"
echo "  AECE Checkpoint — Starting up"
echo "======================================"

# ── Wait for PostgreSQL to accept connections ──────────────────────────────────
echo "[1/3] Waiting for database..."
until node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect(err => { c.end(); process.exit(err ? 1 : 0); });
" 2>/dev/null; do
  echo "      Database not ready yet, retrying in 2s..."
  sleep 2
done
echo "      Database is ready!"

# ── Push schema (creates/updates all tables) ──────────────────────────────────
echo "[2/3] Applying database schema..."
npx drizzle-kit push --force
echo "      Schema applied!"

# ── Start the server ──────────────────────────────────────────────────────────
echo "[3/3] Starting server on port ${PORT:-5000}..."
exec node dist/index.cjs
