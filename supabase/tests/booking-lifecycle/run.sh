#!/usr/bin/env bash
# Applies the booking work-window migration to throwaway Postgres.
# Needs Docker only; it does not touch a linked Supabase project.
#
#   ./supabase/tests/booking-lifecycle/run.sh

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
CONTAINER="motiion-website-booking-lifecycle-test"

if ! command -v docker >/dev/null 2>&1; then
  export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
fi

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

echo "==> starting postgres"
docker run -d --rm --name "$CONTAINER" -e POSTGRES_PASSWORD=pg postgres:17-alpine >/dev/null
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

psql_run() { docker exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

echo "==> loading stub schema"
psql_run < "$HERE/00-stub-schema.sql"

echo "==> applying migration"
psql_run < "$REPO_ROOT/migrations/20261022140418_booking_work_dates_passed.sql"

echo "==> installing confirmation trigger"
psql_run -c "drop trigger if exists trg_sync_booking_confirmation_response on public.booking_confirmation_requests;
create trigger trg_sync_booking_confirmation_response
  after update of status on public.booking_confirmation_requests
  for each row
  execute function public.sync_booking_confirmation_response();"

echo "==> seeding"
psql_run < "$HERE/01-seed.sql"

echo "==> asserting behavior"
OUTPUT="$(docker exec -i "$CONTAINER" psql -U postgres -q < "$HERE/03-assert.sql" 2>&1)"
echo "$OUTPUT"

if grep -q "FAIL" <<<"$OUTPUT"; then
  echo
  echo "FAILED: $(grep -c 'FAIL' <<<"$OUTPUT") assertion(s)"
  exit 1
fi

echo
echo "All assertions passed."
