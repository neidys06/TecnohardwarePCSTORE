# TecniHardware PC Store · Servicio técnico

Aplicación web para gestionar el servicio técnico del Local 208: clientes, equipos, órdenes de servicio con evidencia fotográfica, mantenimientos preventivos, lista de precios y un portal para que cada cliente consulte sus equipos.

El repositorio tiene dos partes:

- **Frontend** (esta carpeta): React + TypeScript. Funciona en dos modos:
  - **Prototipo** (`npm run dev`, `npm run build:demo`): sin servidor, con datos de ejemplo en el navegador. Es la versión validada con la cliente.
  - **API** (`npm run dev:api`, `npm run build:api`): usa el servidor real de `backend/` y su base de datos.
- **Backend** (`backend/`): API REST en **Java 17 + Spring Boot 3.2 + JPA/Hibernate + MySQL**, con Spring Security, pruebas JUnit/Mockito y despliegue con Docker. Ver `backend/README.md`.

## Tecnologías

| Herramienta               | Uso                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vite 8**                | Servidor de desarrollo y compilación                                                                                                          |
| **React 19 + TypeScript** | Interfaz y tipado estricto                                                                                                                    |
| **React Router 8**        | Rutas, rutas protegidas por rol y página 404                                                                                                  |
| **Tailwind CSS 4**        | Estilos con tokens de diseño (`src/index.css`)                                                                                                |
| **shadcn/ui (Radix)**     | Componentes accesibles en `src/components/ui`                                                                                                 |
| **ESLint + Prettier**     | Calidad y formato del código (con orden de clases de Tailwind)                                                                                |
| **Color del sistema**     | La administradora elige el color del sistema en una paleta de 16 colores o uno personalizado. Solo modo claro, como pidió la empresa (Acta 4) |

## Cómo ejecutarlo

**Sistema completo (lo que se entrega):** abrir `backend/pom.xml` en IntelliJ y ejecutar `ServicioTecnicoApplication`. La interfaz ya está compilada dentro del backend, así que no hace falta Node.js. La guía paso a paso para Windows, con H2 o con MySQL y Workbench, está en **[backend/README.md](backend/README.md)**.

**Solo para quien modifica la interfaz** (requiere Node.js 22):

```bash
npm install
npm run dev          # prototipo sin servidor, http://localhost:5173
npm run build:api    # vuelve a compilar la interfaz dentro de backend/src/main/resources/static
```

Para trabajar en la interfaz con recarga automática, deja la API corriendo y en la raíz ejecuta `npm run dev:api` (abre `http://localhost:5173` y envía `/api` al puerto 8080).

## Cómo empezar

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script                            | Qué hace                                                |
| --------------------------------- | ------------------------------------------------------- |
| `npm run dev`                     | Servidor de desarrollo                                  |
| `npm run build`                   | Revisa tipos y compila en `dist/`                       |
| `npm run build:demo`              | Genera la demo en un solo HTML (`dist-demo/index.html`) |
| `npm run dev:api`                 | Desarrollo conectado a la API local (puerto 8080)       |
| `npm run build:api`               | Compila en `backend/src/main/resources/static`          |
| `npm run preview`                 | Sirve la compilación de `dist/`                         |
| `npm run lint`                    | ESLint                                                  |
| `npm run format` / `format:check` | Prettier                                                |
| `npm run typecheck`               | TypeScript sin compilar                                 |

### Usuarios de prueba (prototipo y datos de prueba de la API)

| Rol                                  | Usuario    | Contraseña   |
| ------------------------------------ | ---------- | ------------ |
| Administradora                       | `admin`    | `Tecni2026`  |
| Cliente                              | `cmendoza` | `Carlos2026` |
| Primer ingreso (contraseña temporal) | `nuevo`    | `Temporal1`  |

En el modo prototipo la pantalla de inicio tiene botones que llenan estos datos. Con la API, el perfil `demo` crea las mismas cuentas (y `Cliente2026` para los demás clientes).

> En modo prototipo los datos viven en el navegador (`localStorage`) y la fecha de referencia es el 18/10/2026. En modo API las pantallas llaman a `src/lib/acciones.ts`, que envía cada cambio al servidor; la autenticación, los permisos y las reglas de negocio se validan en el servidor (Spring Boot).

## Estructura

```
src/
├── assets/            Logo, foto del local y fuentes (solo subconjuntos latinos)
├── components/
│   ├── ui/            Componentes shadcn (button, dialog, select, table…)
│   ├── app/           Piezas del dominio: marca, tarjetas de equipo, órdenes, fotos
│   ├── layout/        Diseños de administración, portal e inicio de sesión + guardas de rol
├── dialogs/           Todos los diálogos; se abren con openDialog(tipo, parámetros)
├── lib/
│   ├── types.ts       Modelo de datos
│   ├── domain.ts      Reglas: estados, semáforo de mantenimiento, evidencias obligatorias
│   ├── seed.ts        Datos de ejemplo
│   ├── store.tsx      Estado global, sesión y carga desde la API
│   ├── acciones.ts    Capa de datos: cada acción en modo prototipo o contra la API
│   ├── api.ts         Cliente HTTP de la API
│   └── dates.ts       Fechas, moneda y normalización de texto
├── pages/             Una pantalla por ruta
└── router.tsx         Definición de rutas
```

## Rutas

| Ruta                                                                                                 | Pantalla                                                                     |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/login`, `/recuperar`, `/primer-ingreso`                                                            | Acceso                                                                       |
| `/admin/clientes` (`?q=`)                                                                            | Búsqueda por nombre o cédula con respuesta directa de la última intervención |
| `/admin/clientes/:id`, `/admin/equipos/:id`                                                          | Ficha del cliente e historial por equipo                                     |
| `/admin/ordenes` (`?vista=lista&estado=`)                                                            | Tablero de órdenes en curso o lista completa con filtro de estado            |
| `/admin/ordenes/nueva`, `/admin/ordenes/:id`, `/admin/ordenes/:id/mantenimiento`                     | Flujo de la orden                                                            |
| `/admin/mantenimientos`, `/admin/precios`, `/admin/cuenta`, `/admin/mas`                             | Gestión                                                                      |
| `/portal/equipos`, `/portal/equipos/:id`, `/portal/ordenes/:id`, `/portal/precios`, `/portal/cuenta` | Portal del cliente                                                           |

Un cliente que intenta abrir `/admin/*` es enviado a `/portal/acceso-denegado`; sin sesión, todo vuelve a `/login`.

## Cambios de la reunión de validación (Acta 4)

- Tipos de equipo: drones, parlantes, cargadores, videobeam y televisores, más «Otros» para escribir el tipo.
- Lista de precios: solo el PDF del mes, que la administradora sube y el cliente abre o descarga desde su portal. El valor del diagnóstico general se configura en la misma pantalla.
- «Nueva orden» queda solo en Órdenes.
- La autorización adicional es una opción discreta dentro de la orden, porque ocurre muy rara vez.
- Registro de equipo con las categorías a la vista, incluida «Otros» con un campo para escribir el tipo.
- Paleta de colores para elegir el color del sistema (16 colores y uno personalizado); cualquier color se ajusta para mantener contraste 4,5:1. Se quitó el modo oscuro.
- Al buscar un cliente aparece el cuadro de mantenimiento de sus equipos, igual al de «Próximos mantenimientos».

## Reglas del negocio

- **Estados de la orden:** En diagnóstico → Pendiente de autorización → Autorizada (o En espera de autorización adicional) → Finalizada → Entregada. Si el cliente no autoriza, se cierra cobrando solo el diagnóstico general.
- **Tablero:** muestra solo órdenes en curso; las entregadas y cerradas se consultan en «Todas las órdenes».
- **Evidencias:** fotos de **ingreso** y **salida** obligatorias (sin ellas no se pide autorización ni se entrega); fotos **durante el servicio** opcionales y con una nota.
- **Semáforo de mantenimiento:** Vencido, Próximo (por defecto 30 días o menos, configurable), Vigente o Sin periodo. El color siempre va acompañado de texto.
- **Mensajes:** los de WhatsApp y los recordatorios se pueden editar antes de enviarlos; la plantilla de recordatorio es editable y admite `{nombre}`, `{equipo}`, `{estado}` y `{fecha}`.

## Diseño responsivo

- Escritorio (≥ 1024 px): menú lateral y barra superior con búsqueda global.
- Tablet (≥ 768 px): navegación superior.
- Móvil: barra superior y pestañas inferiores; los diálogos se abren como hoja inferior.

## Accesibilidad

Contraste AA en todos los colores de la paleta, objetivos táctiles de 40–44 px, etiquetas en todos los campos, errores asociados con `aria-describedby`, foco visible, diálogos que se cierran con Esc y estados que nunca dependen solo del color.
