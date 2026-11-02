#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
CONTAINER="motiion-industry-applications-test-$$"
trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true' EXIT
# No published port, mounted credentials, or hosted database connection.
docker run -d --rm --name "$CONTAINER" -e POSTGRES_PASSWORD=local-test-only postgres:17-alpine >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
for sql in "$HERE/fixture.sql" "$REPO/supabase/migrations/20261029164725_industry_professional_applications.sql" "$REPO/supabase/migrations/20261029232113_industry_application_optional_work_url.sql" "$HERE/assertions.sql"; do
  docker exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q < "$sql"
done
