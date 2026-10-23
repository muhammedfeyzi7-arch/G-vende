#!/usr/bin/env bash
# GÜVENDE Supabase kurulumu (tek komut). Gerekli: SUPABASE_ACCESS_TOKEN ve SUPABASE_DB_PASSWORD ortam değişkenleri.
# Kullanım: PROJECT_REF=mklhmdpwfxhkjnrokqmk bash scripts/supabase-setup.sh
set -euo pipefail
REF="${PROJECT_REF:-mklhmdpwfxhkjnrokqmk}"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN gerekli}"
cd "$(dirname "$0")/.."
node scripts/sync-function-shared.mjs
npx --yes supabase link --project-ref "$REF" ${SUPABASE_DB_PASSWORD:+--password "$SUPABASE_DB_PASSWORD"}
npx --yes supabase db push
npx --yes supabase functions deploy ingest-earthquakes delete-account notify-family verify-identity --project-ref "$REF" --use-api
# Gizli değerler yalnızca ilk kurulumda üretilir; varsa üzerine yazılmaz.
if ! npx --yes supabase secrets list --project-ref "$REF" | grep -q IDENTITY_HASH_PEPPER; then
  gen() { node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; }
  npx --yes supabase secrets set --project-ref "$REF" IDENTITY_HASH_PEPPER="$(gen)" INGEST_SECRET="$(gen)" WEBHOOK_SECRET="$(gen)"
fi
echo "Tamam. Kalan panel adımları: Auth e-posta kodu, Cron (ingest-earthquakes), Database Webhook (notify-family)."
