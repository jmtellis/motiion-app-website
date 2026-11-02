#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DOCKER="${DOCKER_BIN:-/Applications/Docker.app/Contents/Resources/bin/docker}"
CONTAINER="motiion-launch-test-$$"
trap '"$DOCKER" rm -f "$CONTAINER" >/dev/null 2>&1 || true' EXIT
"$DOCKER" run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=local-only postgres:17-alpine >/dev/null
for i in $(seq 1 30); do
  if "$DOCKER" exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
"$DOCKER" exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 < "$ROOT/supabase/tests/admin-launch/stubs.sql"
"$DOCKER" exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 < "$ROOT/supabase/migrations/20261031142716_admin_launch_dashboard.sql"
"$DOCKER" exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 < "$ROOT/supabase/tests/admin-launch/assert.sql"
