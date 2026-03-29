#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

PGUSER="${PGUSER:-harness_docs}"
PGDATABASE="${PGDATABASE:-harness_docs}"
export HARNESS_DOCS_API_DATA_SOURCE="${HARNESS_DOCS_API_DATA_SOURCE:-postgres}"

PIDS=()

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM

  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
  done

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

echo "[dev:all] starting local postgres"
docker compose up -d db

echo "[dev:all] waiting for postgres"
until docker compose exec -T db pg_isready -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
  sleep 1
done

echo "[dev:all] applying migrations"
pnpm db:migrate

echo "[dev:all] ensuring demo workspace"
pnpm db:seed:ensure

echo "[dev:all] starting api"
(
  export HARNESS_DOCS_API_DATA_SOURCE
  pnpm dev:api
) &
PIDS+=("$!")

echo "[dev:all] starting docs"
pnpm docs:dev &
PIDS+=("$!")

echo "[dev:all] starting tauri desktop"
pnpm --filter @harness-docs/desktop run dev:tauri
