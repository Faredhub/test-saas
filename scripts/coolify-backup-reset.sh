#!/usr/bin/env bash
# ============================================================================
# TixelERP — Coolify Backup & Reset Script
# ============================================================================
# Backs up the full PostgreSQL database to a timestamped dump file, then
# optionally resets all business data (keeping tenants + superadmin creds).
#
# Works with Coolify, which runs Postgres as a Docker container. The script
# auto-detects the Postgres container and reads its credentials from env.
#
# Usage:
#   ./scripts/coolify-backup-reset.sh            # backup only (safe)
#   ./scripts/coolify-backup-reset.sh --reset    # backup THEN reset data
#
# Environment overrides (optional):
#   PGCONTAINER="postgresql-xxxx"  # force a specific container name
#   PGHOST="127.0.0.1" PGPORT="5432" PGDATABASE="tixelerp" PGUSER="..." PGPASSWORD="..."
# ============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
RESET_SQL="$(cd "$(dirname "$0")" && pwd)/reset-data.sql"

# ---------------------------------------------------------------------------
# 1. Locate the Postgres container (Coolify names it like `postgresql-<uuid>`)
# ---------------------------------------------------------------------------
find_container() {
  if [[ -n "${PGCONTAINER:-}" ]]; then
    echo "$PGCONTAINER"
    return
  fi
  local matches
  matches="$(docker ps --format '{{.Names}} {{.Image}}' | grep -iE 'postgres' || true)"
  if [[ -z "$matches" ]]; then
    echo "ERROR: no running Postgres container found. Set PGCONTAINER manually." >&2
    exit 1
  fi
  local count
  count="$(echo "$matches" | wc -l | tr -d ' ')"
  if [[ "$count" -gt 1 ]]; then
    echo "Multiple Postgres containers found:" >&2
    echo "$matches" >&2
    echo "Set PGCONTAINER to the correct one." >&2
    exit 1
  fi
  echo "$matches" | awk '{print $1}'
}

CONTAINER="$(find_container)"
echo "==> Using Postgres container: $CONTAINER"

# ---------------------------------------------------------------------------
# 2. Read DB credentials from the container environment
# ---------------------------------------------------------------------------
read_env() {
  docker exec "$CONTAINER" printenv "$1" 2>/dev/null || true
}

PGDATABASE="${PGDATABASE:-$(read_env POSTGRES_DB)}"
PGUSER="${PGUSER:-$(read_env POSTGRES_USER)}"
PGPASSWORD="${PGPASSWORD:-$(read_env POSTGRES_PASSWORD)}"
: "${PGDATABASE:?could not determine POSTGRES_DB}"
: "${PGUSER:?could not determine POSTGRES_USER}"

# ---------------------------------------------------------------------------
# 3. Backup
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"
DUMP_FILE="$BACKUP_DIR/tixelerp-backup-$STAMP.sql.gz"

echo "==> Backing up '$PGDATABASE' to $DUMP_FILE"
docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" \
  pg_dump -U "$PGUSER" -d "$PGDATABASE" --no-owner --no-privileges \
  | gzip > "$DUMP_FILE"

SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
echo "==> Backup complete ($SIZE): $DUMP_FILE"

# Sanity check: backup must be non-trivial in size
if [[ ! -s "$DUMP_FILE" ]]; then
  echo "ERROR: backup file is empty — aborting." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Reset data (only with --reset)
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--reset" ]]; then
  if [[ ! -f "$RESET_SQL" ]]; then
    echo "ERROR: reset script not found at $RESET_SQL" >&2
    exit 1
  fi

  echo "==> Resetting business data (keeping tenants + superadmin credentials)..."
  docker exec -i -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" \
    psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$RESET_SQL"

  echo "==> Reset complete."
  echo
  echo "Remaining after reset:"
  docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" \
    psql -U "$PGUSER" -d "$PGDATABASE" -Atc \
    "SELECT 'tenants=' || count(*) FROM tenants UNION ALL SELECT 'users=' || count(*) FROM users UNION ALL SELECT 'roles=' || count(*) FROM roles UNION ALL SELECT 'permissions=' || count(*) FROM permissions;"
else
  echo
  echo "Backup only. Run with --reset to also clear business data."
  echo "  ./scripts/coolify-backup-reset.sh --reset"
fi

echo "==> Done."
