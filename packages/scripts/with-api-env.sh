#!/usr/bin/env bash
# Load DATABASE_URL / DIRECT_URL from apps/api/.env, then run the given command.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/apps/api/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}. Create it with DATABASE_URL and DIRECT_URL." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" || -z "${DIRECT_URL:-}" ]]; then
  echo "DATABASE_URL and DIRECT_URL must be set in apps/api/.env" >&2
  exit 1
fi

exec "$@"
