#!/usr/bin/env bash
set -euo pipefail
umask 077

backup_file="$(mktemp "${TMPDIR:-/tmp}/atlas-backup-XXXXXX.dump")"
restore_db="atlas_restore_test_${RANDOM}_${RANDOM}"
restore_db_created=0
has_difference=0

cleanup() {
  local exit_code=$?
  trap - EXIT
  if [[ "$restore_db_created" -eq 1 ]]; then
    if ! docker compose exec -T db dropdb --if-exists -U atlas "$restore_db" >/dev/null; then
      echo "ERROR: no fue posible eliminar la base temporal $restore_db." >&2
      exit_code=1
    fi
  fi
  rm -f "$backup_file"
  exit "$exit_code"
}
trap cleanup EXIT

if ! docker compose exec -T db pg_dump -Fc -U atlas -d atlas >"$backup_file"; then
  echo "ERROR: pg_dump no pudo crear el respaldo." >&2
  exit 1
fi

if ! docker compose exec -T db createdb -U atlas "$restore_db"; then
  echo "ERROR: no fue posible crear la base de restauración temporal." >&2
  exit 1
fi
restore_db_created=1

if ! docker compose exec -T db pg_restore -U atlas --no-owner --no-acl -d "$restore_db" <"$backup_file"; then
  echo "ERROR: pg_restore no pudo restaurar el respaldo." >&2
  exit 1
fi

tables="$(docker compose exec -T db psql -U atlas -d atlas -qAtX -c \
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename" | tr -d '\r')"
if [[ -z "$tables" ]]; then
  echo "ERROR: no se encontraron tablas para comparar." >&2
  exit 1
fi

for table in $tables; do
  original_count="$(docker compose exec -T db psql -U atlas -d atlas -qAtX -c \
    "SELECT COUNT(*) FROM public.\"$table\"" | tr -d '\r')"
  restored_count="$(docker compose exec -T db psql -U atlas -d "$restore_db" -qAtX -c \
    "SELECT COUNT(*) FROM public.\"$table\"" | tr -d '\r')"
  if [[ "$original_count" == "$restored_count" ]]; then
    echo "OK tabla $table: $original_count registros"
  else
    echo "DIFERENCIA tabla $table: origen=$original_count restaurado=$restored_count"
    has_difference=1
  fi
done

users_hash() {
  docker compose exec -T db psql -U atlas -d "$1" -qAtX -c \
    "SELECT COALESCE(string_agg(row_to_json(users)::text, E'\n' ORDER BY id), '') FROM users" |
    tr -d '\r' |
    sha256sum |
    awk '{print $1}'
}

original_users_hash="$(users_hash atlas)"
restored_users_hash="$(users_hash "$restore_db")"
if [[ "$original_users_hash" == "$restored_users_hash" ]]; then
  echo "OK hash de users: $original_users_hash"
else
  echo "DIFERENCIA hash de users: origen=$original_users_hash restaurado=$restored_users_hash"
  has_difference=1
fi

if [[ "$has_difference" -ne 0 ]]; then
  echo "DIFERENCIA: la restauración no coincide con la base original."
  exit 1
fi

echo "OK: respaldo y restauración verificados."
