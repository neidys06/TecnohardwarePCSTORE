# Backend · TecniHardware PC Store

API REST y aplicación web del software de gestión y seguimiento del servicio técnico: **Java 17 + Spring Boot 3.2 + Spring Data JPA/Hibernate + MySQL 8 + Spring Security**, con pruebas JUnit 5/Mockito. La interfaz (React) ya va compilada dentro de `src/main/resources/static`, así que la aplicación completa se ejecuta solo con IntelliJ.

# Guía de ejecución en Windows (IntelliJ IDEA)

> **No hace falta escribir comandos en PowerShell.** `mvn` y `npm` no están instalados en el PATH de Windows y no se necesitan: IntelliJ trae Maven, y la interfaz ya está compilada. Las instrucciones SQL (`CREATE DATABASE…`) se ejecutan en **MySQL Workbench**, nunca en PowerShell.

## 1. Lo que se necesita

| Programa | Para qué | Dónde |
| --- | --- | --- |
| IntelliJ IDEA (Community o Ultimate) | Abrir, ejecutar y probar el proyecto | jetbrains.com/idea |
| JDK 17 o superior (sirve el JDK 21 que ya tienes) | Compilar y ejecutar Java | Lo instala IntelliJ: *File → Project Structure → SDK → Download JDK* |
| MySQL Community Server 8 + MySQL Workbench | Base de datos real (opción B) | dev.mysql.com/downloads/installer → «MySQL Installer for Windows» |

## 2. Abrir el proyecto

1. IntelliJ → **File → Open…** → seleccionar el archivo `tecnihardware-st\backend\pom.xml` → **Open as Project** → **Trust Project**.
2. Esperar a que termine la barra de abajo («Resolving dependencies…»). La primera vez descarga las librerías (necesita internet).
3. A la derecha aparece el panel **Maven** (ícono **m**) con `servicio-tecnico`. Si no aparece: clic derecho sobre `pom.xml` → **Add as Maven Project**.
4. Menú **Build → Rebuild Project**.

## 3. Opción A · Probar rápido, sin instalar MySQL (H2)

1. Abrir `src/main/java/co/tecnihardware/st/ServicioTecnicoApplication.java` → clic en el ▶ verde junto a `public class` → **Run**.
2. Detener (■) → desplegable de arriba → **Edit Configurations…** → en **Active profiles** escribir `h2,demo` → **Apply → Run**.
3. Esperar en la consola el mensaje `Started ServicioTecnicoApplication` y abrir **http://localhost:8080**.

Cuentas de ejemplo (perfil `demo`): **admin / Tecni2026**, **cmendoza / Carlos2026** y **nuevo / Temporal1** (primer ingreso). Los datos quedan en la carpeta `backend\datos-h2`; para empezar de cero, detener la aplicación y borrar esa carpeta.

## 4. Opción B · Con la base de datos MySQL

### 4.1 Instalar MySQL (una sola vez)
1. Descargar **MySQL Installer for Windows** y elegir **Server only + Workbench** (o *Full*).
2. En la configuración del servidor: puerto **3306**, autenticación recomendada y una **contraseña para root** (anotarla).
3. Dejar marcado «Start the MySQL Server at System Startup».

### 4.2 Crear la base con los scripts (una sola vez)
1. Abrir **MySQL Workbench** → clic en **Local instance MySQL80** → escribir la contraseña de root.
2. **File → Open SQL Script…** → `backend\db\00_crear_base.sql` → botón del rayo ⚡ (*Execute*). Crea la base `tecnihardware` y el usuario `th_app`.
3. Repetir con `backend\db\01_esquema.sql` (las 14 tablas con sus restricciones) y `backend\db\02_datos_iniciales.sql` (categorías de equipo, configuración y la cuenta **admin** con contraseña temporal **Temporal2026**).
4. Comprobar: en el panel izquierdo **Schemas** → botón de recargar → `tecnihardware` → **Tables**.

### 4.3 Configurar IntelliJ para MySQL
1. **Edit Configurations…** → seleccionar `ServicioTecnicoApplication`.
2. **Active profiles:** `dev` (o `dev,demo` si se quieren cargar los datos de ejemplo la primera vez).
3. **Modify options → Environment variables** y pegar (con tu contraseña de root):
   ```
   DB_USER=root;DB_PASS=tu_contraseña_de_root
   ```
4. **Apply → Run**. En la consola debe salir `Started ServicioTecnicoApplication`.
5. Abrir **http://localhost:8080** e ingresar con **admin / Temporal2026**: el sistema pide crear una contraseña nueva. Con `dev,demo` la cuenta queda **admin / Tecni2026**.

### 4.4 Ver los datos guardados
En Workbench: `tecnihardware` → **Tables** → clic derecho sobre una tabla (por ejemplo `orden_servicio`) → **Select Rows**.

### 4.5 Copia de seguridad (RNF-06)
Workbench → **Server → Data Export** → marcar `tecnihardware` → **Export to Self-Contained File** → **Start Export**. Para restaurar: **Server → Data Import**. Las fotos y los PDF están en la carpeta `backend\archivos`: copiarla junto con el respaldo.

## 5. Probar desde el celular (misma red Wi-Fi)

1. En PowerShell escribir `ipconfig` y copiar la **Dirección IPv4** del Wi-Fi (por ejemplo `192.168.1.45`).
2. En el celular abrir `http://192.168.1.45:8080` (con `http://` y `:8080`).
3. Si no conecta: en Windows, marcar la red Wi-Fi como **Privada** y permitir **Java** en *Firewall → Permitir una aplicación*.

## 6. Problemas frecuentes

| Mensaje | Causa y solución |
| --- | --- |
| `mvn` / `npm` «no se reconoce como nombre de un cmdlet» | No están instalados en Windows y no hacen falta. Ejecutar desde IntelliJ (▶ o panel Maven). |
| `CREATE` «no se reconoce…» en PowerShell | Es SQL: se ejecuta en MySQL Workbench (paso 4.2). |
| `DB_USER=root …` «no se reconoce» | Es la forma de Linux. En IntelliJ va en *Environment variables* (paso 4.3). |
| `Communications link failure` | MySQL no está encendido: Windows → **Servicios** → `MySQL80` → **Iniciar**. O el perfil es `dev` sin MySQL: usar `h2,demo`. |
| `Access denied for user 'root'` | Contraseña de root errada en `DB_PASS`. |
| `Unknown database 'tecnihardware'` | Falta ejecutar `00_crear_base.sql` (paso 4.2). |
| `Could not find or load main class` / `ClassNotFoundException` | Clic derecho en `pom.xml` → **Maven → Reload project**, luego **Build → Rebuild Project**. |
| `Port 8080 was already in use` | La aplicación ya está abierta: detener la otra ejecución (■). |
| La página sale en blanco o con el diseño viejo | Recargar con **Ctrl + F5**. |
| Tildes raras en la consola | Cosmético: *Settings → Editor → General → Console → Default Encoding = UTF-8*. |

## Pruebas

En IntelliJ: panel **Maven** (ícono **m** a la derecha) → `servicio-tecnico` → **Lifecycle** → doble clic en **test**. Las pruebas usan una base H2 en memoria: no tocan MySQL ni los datos reales.

- **test**: pruebas unitarias, de persistencia y de integración. Debe terminar en `BUILD SUCCESS`.
- **verify**: además exige 70 % de cobertura de líneas (JaCoCo).
- Informe de cobertura: abrir desde el Explorador de Windows `backend\target\site\jacoco\index.html`.

| Tipo (pirámide de pruebas) | Clase | Qué verifica |
| --- | --- | --- |
| Unitaria | `EstadoOrdenTest` | Las 7 transiciones del RF-18 y que no haya otras |
| Unitaria | `OrdenServicioTest` | Historial de estados, monto según autorizaciones (RF-06), código OS-0001 |
| Unitaria | `UsuarioTest` | Bloqueo tras 5 intentos durante 15 minutos (RNF-09) |
| Unitaria | `CalculadoraMantenimientoTest` | Semáforo vencido / próximo / vigente (RF-10, RF-15) |
| Unitaria | `FormatoTest` | Pesos, cédula, teléfono, plantilla y enlace de WhatsApp |
| Unitaria + Mockito | `AuthServiceTest`, `OrdenServiceTest` | Reglas de inicio de sesión, contraseña y flujo de la orden con dependencias simuladas |
| Persistencia | `RepositoriosTest` (`@DataJpaTest`) | Consultas, cascadas y que un usuario no marque avisos ajenos |
| Integración | `FlujoCompletoIntegracionTest` | Orden de principio a fin, CSRF, 401/403, IDOR entre clientes, bloqueo, validaciones |

Pruebas de la API con Postman: importar `postman/TecniHardware.postman_collection.json` y `postman/local.postman_environment.json`, con la aplicación corriendo en el perfil `h2,demo`, y pulsar **Run collection**.

## Arquitectura (E2.2)

```
src/main/java/co/tecnihardware/st/
├── ServicioTecnicoApplication.java   Punto de entrada (@SpringBootApplication)
├── config/        Seguridad, propiedades, reloj, tareas, OpenAPI, frontend, datos iniciales y demo
├── controller/    @RestController: reciben la petición, validan (@Valid) y delegan al servicio
├── service/       @Service: reglas de negocio del FP-15, transacciones, mapeo a DTO
├── repository/    JpaRepository (patrón DAO): consultas derivadas y JPQL con parámetros
├── model/         @Entity y enumeraciones (EstadoOrden tiene la tabla de transiciones del RF-18)
├── dto/           Objetos de entrada (con Bean Validation) y de salida; nunca se exponen entidades
├── security/      JWT en cookie HttpOnly, UserDetailsService, filtros, respuestas 401/403, CSP
├── exception/     Excepciones de negocio y @RestControllerAdvice (ApiError)
└── util/          Formatos (fechas, pesos, teléfono, WhatsApp)
```

### Seguridad

- **Autenticación:** `POST /api/auth/login` verifica con `AuthenticationManager` → `DaoAuthenticationProvider` → `UsuarioDetailsService` + BCrypt. La sesión es un JWT firmado (HS256) en la cookie `th_sesion` (HttpOnly, SameSite=Lax, Secure en producción).
- **Bloqueo (RNF-09):** 5 intentos fallidos bloquean la cuenta 15 minutos (`app.seguridad.*`).
- **Contraseña temporal (RF-17):** con ella el usuario solo tiene `ROLE_TEMPORAL` y únicamente puede crear su contraseña.
- **Autorización:** por URL en `SecurityConfig` y por método con `@PreAuthorize`. El portal valida en el servicio que cada equipo, orden y foto sea del cliente que pregunta (IDOR, RNF-10).
- **CSRF:** activo. El servidor deja el token en la cookie `XSRF-TOKEN` y el frontend lo devuelve en la cabecera `X-XSRF-TOKEN`.
- **Archivos:** el tipo se reconoce por el contenido (JPG/PNG/PDF), con nombre aleatorio y sin salir de la carpeta de archivos.

### Endpoints

Documentación interactiva en **`/swagger-ui.html`** (deshabilitada en producción). «Admin» = rol ADMINISTRADOR; «Cliente» = solo el cliente y solo lo suyo.

| Método y ruta | Acceso | RF |
| --- | --- | --- |
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/sesion` | Público | RF-02 |
| `POST /api/auth/cambiar-contrasena` | Sesión (también temporal) | RF-17 |
| `POST /api/auth/solicitar-restablecimiento` | Público | RF-01 |
| `GET /api/estado` | Sesión: datos filtrados por rol | RF-19, RNF-10 |
| `GET/POST /api/clientes` (usuario y contraseña temporal automáticos) · `GET/PUT /api/clientes/{id}` (`?q=` nombre, cédula o teléfono) | Admin | RF-01, RF-12 |
| `POST /api/clientes/{id}/restablecer-contrasena` · `GET /api/clientes/{id}/whatsapp` | Admin | RF-01, RF-11 |
| `GET /api/equipos/tipos` · `POST /api/equipos` · `PUT /api/equipos/{id}` | Admin | RF-03 |
| `PUT /api/equipos/{id}/periodo` · `GET /api/equipos/{id}/historial` · `POST /api/equipos/{id}/recordatorio` | Admin | RF-16, RF-09, RF-10 |
| `GET/POST /api/ordenes` (`recibio`: quién recibe en la tienda; fotos de ingreso opcionales) · `GET /api/ordenes/{codigo}` | Admin | RF-04 |
| `POST /api/ordenes/{codigo}/diagnostico` | Admin | RF-05 |
| `POST /api/ordenes/{codigo}/autorizacion` · `…/adicionales` · `…/adicionales/respuesta` | Admin | RF-06 |
| `POST /api/ordenes/{codigo}/evidencias` (multipart) | Admin | RF-08 |
| `POST /api/ordenes/{codigo}/mantenimiento` (multipart) | Admin | RF-07 |
| `POST /api/ordenes/{codigo}/entrega` (`recibidoPor`, `entregadoPor`) · `…/notas` | Admin | RF-18 |
| `GET /api/mantenimientos` (`?estado=VENCIDO\|PROXIMO\|VIGENTE\|SIN_PERIODO`) | Admin | RF-15 |
| `GET/PUT /api/configuracion` | Sesión / Admin | RF-13, RNF-04 |
| `GET /api/lista-precios/vigente` · `…/vigente/archivo` · `POST /api/lista-precios` | Sesión / Admin | RF-13, RF-14 |
| `GET /api/evidencias/{id}/archivo` | Admin o dueño del equipo | RF-08, RNF-10 |
| `GET /api/notificaciones` · `POST /api/notificaciones/leer` | Sesión | RF-10 |
| `PUT /api/cuenta/foto` · `GET /api/cuenta/foto/{id}` | Sesión | — |
| `GET /api/portal/equipos` · `…/equipos/{id}` · `…/ordenes/{codigo}` | Cliente | RF-19 |
| `GET /actuator/health` · `GET /api/salud` | Público | RNF-06 |

Errores: todas las respuestas de error tienen la forma `{ status, error, mensaje, timestamp, path, campos }`; `mensaje` está redactado para mostrarse al usuario.

## Configuración

| Variable | Para qué | Valor por defecto |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `dev`, `h2`, `prod` (y `demo` para datos de ejemplo) | `h2,demo` |
| `DB_URL`, `DB_USER`, `DB_PASS` | Conexión a MySQL (o PostgreSQL en `prod`) | `localhost:3306/tecnihardware`, `root`, vacío |
| `JWT_SECRETO` | Clave para firmar las sesiones (mínimo 32 caracteres) | solo para desarrollo; **obligatoria en `prod`** |
| `ADMIN_CLAVE` | Contraseña temporal de la cuenta admin al crearla | `Temporal2026` |
| `app.tienda.personal` | Personal que recibe y entrega los equipos | Gloria Rojas Rivera, Dichel Susana Rojas Rivera |
| `CARPETA_ARCHIVOS` | Dónde se guardan fotos y PDF (`prod`) | `/var/lib/tecnihardware/archivos` |

La tarea diaria de alertas de mantenimiento (RF-10) corre al iniciar y todos los días a las 6:00 a. m., hora de Colombia.
