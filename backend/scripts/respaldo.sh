#!/bin/sh
# Copia de seguridad diaria (RNF-06): base de datos MySQL + carpeta de archivos.
# Programar con cron, por ejemplo a las 11:30 p. m.:
#   30 23 * * * /opt/tecnihardware/scripts/respaldo.sh
# Variables: DB_HOST, DB_USER, DB_PASS, DB_NAME, CARPETA_ARCHIVOS, CARPETA_RESPALDOS, DIAS (30 por defecto)
set -eu
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-tecnihardware}"
CARPETA_ARCHIVOS="${CARPETA_ARCHIVOS:-/var/lib/tecnihardware/archivos}"
CARPETA_RESPALDOS="${CARPETA_RESPALDOS:-/var/backups/tecnihardware}"
DIAS="${DIAS:-30}"
FECHA=$(date +%Y-%m-%d_%H%M)
mkdir -p "$CARPETA_RESPALDOS"

# --single-transaction: copia consistente sin bloquear la aplicación (InnoDB).
MYSQL_PWD="${DB_PASS:-}" mysqldump -h "$DB_HOST" -u "$DB_USER" --single-transaction --routines \
  --default-character-set=utf8mb4 "$DB_NAME" | gzip > "$CARPETA_RESPALDOS/bd_$FECHA.sql.gz"

if [ -d "$CARPETA_ARCHIVOS" ]; then
  tar -czf "$CARPETA_RESPALDOS/archivos_$FECHA.tar.gz" -C "$CARPETA_ARCHIVOS" .
fi

# Se conservan los respaldos de los últimos $DIAS días.
find "$CARPETA_RESPALDOS" -name 'bd_*.sql.gz' -mtime +"$DIAS" -delete
find "$CARPETA_RESPALDOS" -name 'archivos_*.tar.gz' -mtime +"$DIAS" -delete
echo "Respaldo listo: $CARPETA_RESPALDOS/bd_$FECHA.sql.gz"
