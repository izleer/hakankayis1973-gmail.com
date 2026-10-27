#!/usr/bin/env bash
# PostgreSQL + yerel medya yedeği. Docker Compose ve Terraform kurulumlarında
# aynı konteyner adlarını (vh-db, vh-api) kullanır.
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-vh-db}"
API_CONTAINER="${API_CONTAINER:-vh-api}"

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
: "${STORAGE_DRIVER:=local}"

for container in "$DB_CONTAINER" "$API_CONTAINER"; do
  if ! docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null | grep -qx true; then
    echo "Konteyner çalışmıyor: $container" >&2
    exit 1
  fi
done

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

STAMP="$(date -u +%Y%m%d-%H%M%S)"
DB_FILE="$BACKUP_DIR/db-$STAMP.dump.gz"
DB_PARTIAL="$DB_FILE.partial"
MEDIA_FILE="$BACKUP_DIR/media-$STAMP.tar.gz"
MEDIA_PARTIAL="$MEDIA_FILE.partial"

cleanup() {
  rm -f "$DB_PARTIAL" "$MEDIA_PARTIAL"
}
trap cleanup EXIT

echo "→ PostgreSQL dökümü alınıyor ($POSTGRES_DB)..."
docker exec "$DB_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom --no-owner --no-privileges \
  | gzip -9 > "$DB_PARTIAL"
mv "$DB_PARTIAL" "$DB_FILE"

if [ "$STORAGE_DRIVER" = "local" ]; then
  echo "→ Yerel medya arşivleniyor (/app/storage)..."
  docker exec "$API_CONTAINER" tar -czf - -C /app storage > "$MEDIA_PARTIAL"
  mv "$MEDIA_PARTIAL" "$MEDIA_FILE"
else
  echo "· STORAGE_DRIVER=$STORAGE_DRIVER: medya S3 tarafında; ayrıca bucket yedeği alın."
fi

checksum() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" > "$1.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" > "$1.sha256"
  fi
}
checksum "$DB_FILE"
[ -f "$MEDIA_FILE" ] && checksum "$MEDIA_FILE"

find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete

echo "✓ Yedek tamam:"
if [ -f "$MEDIA_FILE" ]; then
  ls -lh "$DB_FILE" "$MEDIA_FILE"
else
  ls -lh "$DB_FILE"
fi
echo "  Saklama süresi: $KEEP_DAYS gün — $BACKUP_DIR"
