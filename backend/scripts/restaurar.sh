#!/bin/sh
# Restaura un respaldo (RNF-06). Detener la aplicación antes de restaurar.
#   ./restaurar.sh /var/backups/tecnihardware/bd_2026-10-27_2330.sql.gz [archivos_2026-10-27_2330.tar.gz]
set -eu
[ $# -ge 1 ] || { echo "Uso: $0 bd_FECHA.sql.gz [archivos_FECHA.tar.gz]"; exit 1; }
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-tecnihardware}"
CARPETA_ARCHIVOS="${CARPETA_ARCHIVOS:-/var/lib/tecnihardware/archivos}"

gunzip -c "$1" | MYSQL_PWD="${DB_PASS:-}" mysql -h "$DB_HOST" -u "$DB_USER" --default-character-set=utf8mb4 "$DB_NAME"
if [ $# -ge 2 ]; then
  mkdir -p "$CARPETA_ARCHIVOS"
  tar -xzf "$2" -C "$CARPETA_ARCHIVOS"
fi
echo "Restauración terminada en la base $DB_NAME."
