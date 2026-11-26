#!/usr/bin/env bash
# Preparación de la máquina (Ubuntu en Oracle Cloud). Se ejecuta una sola vez:  bash instalar.sh
set -euo pipefail
sudo apt-get update
sudo apt-get install -y ca-certificates curl iptables-persistent
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
# Las imágenes de Ubuntu de Oracle bloquean todo con iptables salvo SSH: se abren 80 y 443.
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
mkdir -p ~/tecnihardware/respaldos
# Copia de seguridad diaria de la base de datos a las 11:30 p. m. (se guardan 14 días)
( crontab -l 2>/dev/null | grep -v respaldo.sh ; echo "30 23 * * * bash $HOME/tecnihardware/respaldo.sh" ) | crontab -
echo "Listo. Cierra la sesión SSH y vuelve a entrar para usar docker sin sudo."
