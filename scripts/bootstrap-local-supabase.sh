#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_CONTAINER="supabase_db_torneo-web"
SNAPSHOT_FILE="supabase/seeds/999_local_snapshot.sql"

PRE_SEED_SCHEMA_FILES=(
  "supabase/core_public_schema.sql"
  "supabase/operational_settings_schema.sql"
  "supabase/auxiliary_public_schema.sql"
  "supabase/utilities.sql"
  "supabase/scoring_schema.sql"
  "supabase/elimination_schema.sql"
  "supabase/pwa_operativa_schema.sql"
  "supabase/security_enhancements.sql"
  "supabase/staff_auth_hardening.sql"
)

POST_SEED_FILES=(
  "supabase/allowed_sports.sql"
)

run_sql_file() {
  local sql_file="$1"
  echo "Applying ${sql_file}..."
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "$sql_file"
}

echo "Ensuring local Supabase stack is running..."
npm run db:local:start >/dev/null

echo "Recreating public schema..."
docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
drop schema if exists public cascade;
create schema public;
comment on schema public is 'standard public schema';

grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;

alter default privileges in schema public
grant all on tables to postgres, service_role;

alter default privileges in schema public
grant all on sequences to postgres, service_role;

alter default privileges in schema public
grant all on routines to postgres, service_role;
SQL

for sql_file in "${PRE_SEED_SCHEMA_FILES[@]}"; do
  run_sql_file "$sql_file"
done

if [[ -f "$SNAPSHOT_FILE" ]]; then
  run_sql_file "$SNAPSHOT_FILE"
else
  echo "Snapshot file not found, skipping data seed: ${SNAPSHOT_FILE}"
fi

for sql_file in "${POST_SEED_FILES[@]}"; do
  run_sql_file "$sql_file"
done

echo "Local Supabase bootstrap completed."
