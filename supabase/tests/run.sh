#!/usr/bin/env bash
# Yerel Postgres (16+) ile şema + RLS testlerini çalıştırır. Gerçek Supabase'e bağlanmaz.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
work="$(mktemp -d)"
trap '"$PGBIN/pg_ctl" -D "$work/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
run_pg() { if [ "$(id -u)" = 0 ]; then chown -R postgres "$work"; su postgres -c "$*"; else bash -c "$*"; fi; }
mkdir -p "$work/data"
run_pg "'$PGBIN/initdb' -D '$work/data' -A trust -U postgres >/dev/null"
run_pg "'$PGBIN/pg_ctl' -D '$work/data' -o '-p 54329 -k $work -c listen_addresses=' -l '$work/log' start -w >/dev/null"
psql_() { psql -h "$work" -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q -At -o /dev/null "$@"; }
psql_ -f "$here/00_supabase_stub.sql"
for f in "$here"/../migrations/*.sql; do psql_ -f "$f"; done
psql_ -f "$here/rls.test.sql"
