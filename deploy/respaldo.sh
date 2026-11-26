#!/usr/bin/env bash
# Copia de seguridad de la base de datos y de las fotos/PDF. La programa instalar.sh (cron diario).
set -euo pipefail
cd "$HOME/tecnihardware"
source .env
f=$(date +%Y-%m-%d)
docker compose exec -T db mysqldump -uroot -p"$DB_ROOT_PASS" --single-transaction tecnihardware | gzip > "respaldos/bd-$f.sql.gz"
docker cp "$(docker compose ps -q app)":/var/lib/tecnihardware/archivos - | gzip > "respaldos/archivos-$f.tar.gz"
find respaldos -type f -mtime +14 -delete
