#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  attempt=1
  until node dist/scripts/migrate.js; do
    if [ "$attempt" -ge 30 ]; then
      echo "Veritabanı migration'ı 30 denemede tamamlanamadı." >&2
      exit 1
    fi
    echo "Veritabanı hazır değil, yeniden denenecek ($attempt/30)..." >&2
    attempt=$((attempt + 1))
    sleep 2
  done
fi

exec "$@"
