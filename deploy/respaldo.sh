#!/usr/bin/env bash
# Copia de seguridad diaria (la programa instalar.sh con cron).
# - Base de datos: todos los días, se guardan 14 días (pesa poco).
# - Fotos y PDF: solo los domingos y se guardan las 2 últimas, para no llenar el disco.
set -euo pipefail
cd "$HOME/tecnihardware"
source .env
f=$(date +%Y-%m-%d)
docker compose exec -T db mysqldump -uroot -p"$DB_ROOT_PASS" --single-transaction tecnihardware | gzip > "respaldos/bd-$f.sql.gz"
find respaldos -name 'bd-*.sql.gz' -mtime +14 -delete
if [ "$(date +%u)" = 7 ]; then
  docker cp "$(docker compose ps -q app)":/var/lib/tecnihardware/archivos - | gzip > "respaldos/archivos-$f.tar.gz"
  ls -1t respaldos/archivos-*.tar.gz | tail -n +3 | xargs -r rm -f
fi
