#!/usr/bin/env bash
# Yedekten geri yükleme.
#   ./restore.sh db   backups/db-20260101-030000.dump.gz
#   ./restore.sh media backups/media-20260101-030000.tar.gz
# Onay istemezseniz sonuna --yes ekleyin.
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.production}"
DB_CONTAINER="${DB_CONTAINER:-vh-db}"
API_CONTAINER="${API_CONTAINER:-vh-api}"

KIND="${1:-}"
FILE="${2:-}"
ASSUME_YES="${3:-}"

if [ -z "$KIND" ] || [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Kullanım: $0 <db|media> <yedek-dosyası> [--yes]" >&2
  exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "Ortam dosyası bulunamadı: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
: "${POSTGRES_USER:=vh_app}"
: "${POSTGRES_DB:=varlik_hafizasi}"

if [ "$ASSUME_YES" != "--yes" ]; then
  echo "DİKKAT: Bu işlem mevcut veriyi değiştirecek."
  echo "Hedef: $KIND — $FILE"
  printf 'Devam etmek için "geri-yukle" yazın: '
  read -r answer
  if [ "$answer" != "geri-yukle" ]; then
    echo "İptal edildi."
    exit 1
  fi
fi

if ! docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null | grep -qx true; then
  echo "Veritabanı konteyneri çalışmıyor: $DB_CONTAINER" >&2
  exit 1
fi

API_WAS_RUNNING=0
if docker inspect -f '{{.State.Running}}' "$API_CONTAINER" 2>/dev/null | grep -qx true; then
  API_WAS_RUNNING=1
  echo "→ API durduruluyor (yazma trafiğini kesmek için)..."
  docker stop --time 20 "$API_CONTAINER" >/dev/null
fi

start_api() {
  if [ "$API_WAS_RUNNING" = "1" ]; then
    echo "→ API yeniden başlatılıyor..."
    docker start "$API_CONTAINER" >/dev/null || true
    for _ in $(seq 1 30); do
      state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$API_CONTAINER" 2>/dev/null || echo unknown)"
      if [ "$state" = "healthy" ] || [ "$state" = "running" ]; then
        echo "✓ API durumu: $state"
        return
      fi
      sleep 2
    done
    echo "! API sağlıklı görünmüyor; günlükleri kontrol edin: docker logs $API_CONTAINER" >&2
  fi
}
trap start_api EXIT

case "$KIND" in
  db)
    gzip -t "$FILE"
    echo "→ PostgreSQL geri yükleniyor ($POSTGRES_DB)..."
    gunzip -c "$FILE" | docker exec -i "$DB_CONTAINER" \
      pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      --clean --if-exists --no-owner --no-privileges --single-transaction
    docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'ANALYZE' >/dev/null
    echo "✓ Veritabanı geri yüklendi."
    ;;
  media)
    if [ "$API_WAS_RUNNING" = "1" ]; then
      echo "→ Medya dosyalarına erişmek için API yeniden başlatılıyor..."
      docker start "$API_CONTAINER" >/dev/null
      for _ in $(seq 1 15); do
        if docker inspect -f '{{.State.Running}}' "$API_CONTAINER" 2>/dev/null | grep -qx true; then
          break
        fi
        sleep 1
      done
    fi
    if ! docker inspect -f '{{.State.Running}}' "$API_CONTAINER" 2>/dev/null | grep -qx true; then
      echo "Medya geri yüklemek için API konteyneri çalışmalı." >&2
      exit 1
    fi
    gzip -t "$FILE"
    echo "→ Medya arşivi açılıyor (/app/storage)..."
    docker exec "$API_CONTAINER" sh -c 'rm -rf /app/storage && mkdir -p /app/storage'
    docker exec -i "$API_CONTAINER" tar -xzf - -C /app < "$FILE"
    echo "✓ Medya geri yüklendi."
    ;;
  *)
    echo "Bilinmeyen tür: $KIND (db|media)" >&2
    exit 1
    ;;
esac

echo "Tamamlandı. Doğrulama için: docker logs --tail 50 $API_CONTAINER"
