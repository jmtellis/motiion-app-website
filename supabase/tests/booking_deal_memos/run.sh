#!/usr/bin/env bash
# Runs the MOT-94 migration against a throwaway local Postgres with Supabase auth stubs.
# Never point this at a Supabase project: it creates stub auth/profiles/projects tables.
set -euo pipefail
DB="${BOOKING_TEST_DB:-mot94_booking_test}"
HERE="$(cd "$(dirname "$0")" && pwd)"
MIGRATION="$HERE/../../migrations/20260929120000_booking_deal_memos.sql"
dropdb --if-exists "$DB"
createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/00_local_stubs.sql" -f "$MIGRATION" >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$MIGRATION" >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/10_migration_checks.sql" | grep -q 'ALL TESTS PASSED'
echo "booking deal memo migration checks passed"
dropdb "$DB"
