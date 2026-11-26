# Despliegue en Oracle Cloud (nivel gratuito)

Arquitectura recomendada por el docente: máquina virtual propia + Docker + GitHub Actions + registro de imágenes.

```
push a main → CI (pruebas) → CD: compila, construye la imagen y la sube a ghcr.io
                                   └─ entra por SSH a la máquina → docker compose pull + up
Máquina Oracle:  Caddy (HTTPS 443) → app Spring Boot (8080) → MySQL 8.4
```

## 1. Crear la máquina (consola de Oracle)

1. Menú → **Compute → Instances → Create instance**.
2. Nombre: `tecnihardware`.
3. **Image:** Canonical Ubuntu 24.04. **Shape:** Ampere `VM.Standard.A1.Flex` con 2 OCPU y 12 GB de memoria (todo dentro de *Always Free*). Si sale *Out of capacity*, prueba con otro *availability domain* o vuelve a intentar más tarde.
4. **Networking:** deja que cree la VCN y la subred pública, con **Assign a public IPv4 address**.
5. **Add SSH keys:** elige *Generate a key pair* y **descarga la llave privada** (`.key`). Sin ella no se puede entrar.
6. Create. Anota la **IP pública**.
7. Abre los puertos: en la instancia → la subred → **Security List** → *Add Ingress Rules*: origen `0.0.0.0/0`, TCP, puertos de destino `80,443`.

## 2. Preparar la máquina (una sola vez)

```bash
ssh -i llave.key ubuntu@IP_PUBLICA
# copia instalar.sh a la máquina (o pégalo con nano) y ejecútalo:
bash instalar.sh
exit                      # vuelve a entrar para usar docker sin sudo
ssh -i llave.key ubuntu@IP_PUBLICA
cd ~/tecnihardware
nano .env                 # pega env.ejemplo y cambia los valores
openssl rand -hex 32      # úsalo como JWT_SECRETO
```

`DOMINIO`: con la IP `129.151.10.20` se usa `129-151-10-20.sslip.io` (gratis, sin comprar dominio). Caddy saca el certificado HTTPS solo.

## 3. Conectar GitHub con la máquina

En el repositorio → **Settings → Secrets and variables → Actions**:

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `VM_HOST` | IP pública de la máquina |
| Variable | `VM_USER` | `ubuntu` |
| Secret | `VM_SSH_KEY` | contenido completo del archivo `.key` |

Luego **Actions → CD · Despliegue en Oracle Cloud → Run workflow**. Desde ahí, cada push a `main` que pase el CI se despliega solo.

## 4. Verificar

- `https://<DOMINIO>` abre el sistema; primer ingreso `admin` + `ADMIN_CLAVE` → pide cambiarla.
- En la máquina: `docker compose ps` y `docker compose logs -f app`.
- Copias de seguridad: cada noche en `~/tecnihardware/respaldos` (base de datos y fotos, 14 días). Conviene bajarlas a otro lugar de vez en cuando.
