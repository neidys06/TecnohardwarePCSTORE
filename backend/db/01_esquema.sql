-- =============================================================================
-- TECNIHARDWARE PC STORE · Software de gestión y seguimiento del servicio técnico
-- E2.3 · Script de creación de la base de datos (2 de 3): esquema
-- Motor: MySQL 8.0 o superior · utf8mb4 · Equipo Systanwake · v2.1 · 29/10/2026
-- Trazable a FP-15 v2.0 (RF-01…RF-19, RNF-09, RNF-10) y a las entidades JPA del
-- backend (paquete co.tecnihardware.st.model): mismas tablas, columnas y tipos.
-- -----------------------------------------------------------------------------
-- Uso:  mysql -u root -p < 01_esquema.sql   (o abrirlo y ejecutarlo en MySQL Workbench)
-- El script es idempotente: borra y vuelve a crear las tablas.
-- Las reglas de negocio que dependen del flujo (transiciones del RF-18, una sola
-- orden abierta por equipo, fotos obligatorias) están en la capa de servicio de
-- Spring Boot; aquí quedan las restricciones de integridad de los datos.
-- =============================================================================

SET NAMES utf8mb4;
USE tecnihardware;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS repuesto_utilizado, mantenimiento, evidencia, cambio_estado, autorizacion,
  notificacion, recordatorio_mantenimiento, orden_servicio, equipo, tipo_equipo, cliente,
  lista_precios, configuracion_sistema, usuario;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Usuarios y clientes (RF-01, RF-02, RF-17, RNF-09)
-- -----------------------------------------------------------------------------
CREATE TABLE usuario (
  id_usuario               BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Identificador interno de la cuenta',
  usuario                  VARCHAR(40)  NOT NULL COMMENT 'Nombre de usuario para iniciar sesión, en minúsculas; lo digita el Administrador (RF-01)',
  contrasena_hash          VARCHAR(100) NOT NULL COMMENT 'Resumen BCrypt de la contraseña; nunca se guarda en texto plano (RNF-09)',
  rol                      ENUM('ADMINISTRADOR','CLIENTE') NOT NULL COMMENT 'Define qué información y funciones ve (RF-02)',
  nombre                   VARCHAR(120) NOT NULL COMMENT 'Nombre completo de la persona',
  debe_cambiar_contrasena  BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Verdadero mientras use una contraseña temporal; obliga a cambiarla (RF-17)',
  intentos_fallidos        INT          NOT NULL DEFAULT 0 COMMENT 'Intentos fallidos seguidos de inicio de sesión (RNF-09)',
  bloqueado_hasta          DATETIME(6)  NULL COMMENT 'Fecha y hora hasta la que la cuenta queda bloqueada (5 intentos fallidos = 15 min)',
  foto_perfil              VARCHAR(255) NULL COMMENT 'Ruta de la foto de perfil dentro de la carpeta de archivos',
  activo                   BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Falso para desactivar la cuenta sin borrar su historial',
  creado_en                DATETIME(6)  NOT NULL COMMENT 'Fecha y hora de creación de la cuenta',
  PRIMARY KEY (id_usuario),
  CONSTRAINT uk_usuario_usuario UNIQUE (usuario),
  CONSTRAINT ck_usuario_formato  CHECK (usuario REGEXP '^[a-z0-9._]{4,40}$'),
  CONSTRAINT ck_usuario_hash     CHECK (contrasena_hash LIKE '$2%'),
  CONSTRAINT ck_usuario_intentos CHECK (intentos_fallidos BETWEEN 0 AND 100)
) ENGINE=InnoDB COMMENT='Cuentas de acceso (Administrador y Clientes). RF-01, RF-02, RF-17, RNF-09';

CREATE TABLE cliente (
  id_cliente      BIGINT      NOT NULL AUTO_INCREMENT COMMENT 'Identificador del cliente',
  id_usuario      BIGINT      NOT NULL COMMENT 'Cuenta de acceso al portal del cliente (1 a 1)',
  cedula          VARCHAR(20) NULL COMMENT 'Cédula, solo dígitos (opcional); única si se registra; criterio de búsqueda (RF-12)',
  telefono        VARCHAR(20) NULL COMMENT 'Celular, solo dígitos; para WhatsApp (RF-10, RF-11) y búsqueda (RF-12)',
  fecha_registro  DATE        NOT NULL COMMENT 'Fecha en que se registró el cliente',
  PRIMARY KEY (id_cliente),
  CONSTRAINT uk_cliente_usuario UNIQUE (id_usuario),
  CONSTRAINT uk_cliente_cedula  UNIQUE (cedula),
  CONSTRAINT fk_cliente_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT ck_cliente_cedula   CHECK (cedula   IS NULL OR cedula   REGEXP '^[0-9]{5,15}$'),
  CONSTRAINT ck_cliente_telefono CHECK (telefono IS NULL OR telefono REGEXP '^[0-9]{7,12}$')
) ENGINE=InnoDB COMMENT='Datos del cliente de la tienda. RF-01, RF-12';

-- -----------------------------------------------------------------------------
-- 2. Equipos (RF-03, RF-16)
-- -----------------------------------------------------------------------------
CREATE TABLE tipo_equipo (
  id_tipo  BIGINT      NOT NULL AUTO_INCREMENT COMMENT 'Identificador de la categoría',
  nombre   VARCHAR(40) NOT NULL COMMENT 'Nombre de la categoría (Portátil, Dron, Televisor…)',
  orden    INT         NOT NULL DEFAULT 0 COMMENT 'Orden en que se muestra en el registro de equipos',
  PRIMARY KEY (id_tipo),
  CONSTRAINT uk_tipo_equipo_nombre UNIQUE (nombre)
) ENGINE=InnoDB COMMENT='Categorías de equipo a la vista en el registro (Acta 4). RF-03';

CREATE TABLE equipo (
  id_equipo                    BIGINT        NOT NULL AUTO_INCREMENT COMMENT 'Identificador del equipo',
  id_cliente                   BIGINT        NOT NULL COMMENT 'Cliente dueño del equipo; obligatorio (RNF-10)',
  id_tipo                      BIGINT        NULL COMMENT 'Categoría del equipo; NULL cuando es «Otros»',
  tipo_otro                    VARCHAR(60)   NULL COMMENT 'Tipo escrito por la administradora al elegir «Otros» (Acta 4)',
  marca_modelo                 VARCHAR(120)  NOT NULL COMMENT 'Marca y modelo del equipo',
  `serial`                     VARCHAR(60)   NULL COMMENT 'Número de serie (opcional)',
  observaciones                VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'Notas sobre el estado o uso del equipo',
  periodo_mantenimiento_meses  INT           NULL COMMENT 'Mantenimiento preventivo cada 3, 6 o 12 meses; NULL = sin periodo (RF-16)',
  creado_en                    DATETIME(6)   NOT NULL COMMENT 'Fecha y hora de registro del equipo',
  PRIMARY KEY (id_equipo),
  KEY ix_equipo_cliente (id_cliente),
  CONSTRAINT fk_equipo_cliente FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente) ON DELETE RESTRICT,
  CONSTRAINT fk_equipo_tipo    FOREIGN KEY (id_tipo)    REFERENCES tipo_equipo (id_tipo) ON DELETE RESTRICT,
  -- O una categoría de la lista, o el tipo escrito en «Otros», nunca ambos (Acta 4).
  CONSTRAINT ck_equipo_tipo CHECK ((id_tipo IS NOT NULL AND tipo_otro IS NULL)
                                OR (id_tipo IS NULL AND CHAR_LENGTH(TRIM(tipo_otro)) >= 2)),
  CONSTRAINT ck_equipo_periodo CHECK (periodo_mantenimiento_meses IS NULL OR periodo_mantenimiento_meses IN (3, 6, 12))
) ENGINE=InnoDB COMMENT='Equipos de cada cliente. RF-03, RF-16';

-- -----------------------------------------------------------------------------
-- 3. Órdenes de servicio (RF-04, RF-05, RF-06, RF-18)
--    El código visible OS-0001 se forma con el identificador (no se guarda).
-- -----------------------------------------------------------------------------
CREATE TABLE orden_servicio (
  id_orden         BIGINT         NOT NULL AUTO_INCREMENT COMMENT 'Identificador de la orden; el código visible es OS- y el número con 4 cifras',
  id_equipo        BIGINT         NOT NULL COMMENT 'Equipo que ingresa al servicio',
  fecha_ingreso    DATE           NOT NULL COMMENT 'Fecha de ingreso del equipo (RF-04)',
  falla_reportada  VARCHAR(2400)  NOT NULL COMMENT 'Falla o motivo que reporta el cliente, con los accesorios recibidos (RF-04)',
  diagnostico      VARCHAR(2000)  NULL COMMENT 'Diagnóstico realizado (RF-05)',
  costo_estimado   DECIMAL(12,2)  NULL COMMENT 'Costo estimado de la reparación en pesos (RF-05)',
  estado           ENUM('EN_DIAGNOSTICO','PENDIENTE_AUTORIZACION','AUTORIZADA','EN_ESPERA_AUTORIZACION_ADICIONAL',
                        'FINALIZADA','ENTREGADA','CERRADA_SOLO_DIAGNOSTICO') NOT NULL DEFAULT 'EN_DIAGNOSTICO'
                   COMMENT 'Estado actual según la tabla de estados del RF-18',
  monto_cobrado    DECIMAL(12,2)  NULL COMMENT 'Monto final cobrado; se fija al cerrar o entregar la orden (RF-06)',
  fecha_entrega    DATE           NULL COMMENT 'Fecha de entrega o de cierre de la orden',
  recibido_por     VARCHAR(120)   NULL COMMENT 'Persona que recogió el equipo al entregarlo',
  recibio_equipo   VARCHAR(120)   NULL COMMENT 'Persona de la tienda que recibió el equipo al ingresar (Acta 5)',
  entrego_equipo   VARCHAR(120)   NULL COMMENT 'Persona de la tienda que entregó el equipo al cliente (Acta 5)',
  creado_en        DATETIME(6)    NOT NULL COMMENT 'Fecha y hora de creación del registro',
  PRIMARY KEY (id_orden),
  KEY ix_orden_equipo (id_equipo),
  KEY ix_orden_estado (estado),
  CONSTRAINT fk_orden_equipo FOREIGN KEY (id_equipo) REFERENCES equipo (id_equipo) ON DELETE RESTRICT,
  CONSTRAINT ck_orden_falla  CHECK (CHAR_LENGTH(TRIM(falla_reportada)) >= 3),
  CONSTRAINT ck_orden_costo  CHECK (costo_estimado IS NULL OR costo_estimado >= 0),
  CONSTRAINT ck_orden_monto  CHECK (monto_cobrado  IS NULL OR monto_cobrado  >= 0),
  -- Desde «Pendiente de autorización» la orden tiene diagnóstico y costo (RF-05).
  CONSTRAINT ck_orden_diagnostico CHECK (estado = 'EN_DIAGNOSTICO' OR (diagnostico IS NOT NULL AND costo_estimado IS NOT NULL)),
  -- Una orden entregada tiene fecha de entrega, quién la recogió y quién la entregó (RF-18, Acta 5).
  CONSTRAINT ck_orden_entrega CHECK (estado <> 'ENTREGADA' OR (fecha_entrega IS NOT NULL AND recibido_por IS NOT NULL
                                                               AND entrego_equipo IS NOT NULL)),
  CONSTRAINT ck_orden_fechas  CHECK (fecha_entrega IS NULL OR fecha_entrega >= fecha_ingreso)
) ENGINE=InnoDB COMMENT='Orden de servicio de un equipo. RF-04, RF-05, RF-06, RF-18';

CREATE TABLE autorizacion (
  id_autorizacion  BIGINT        NOT NULL AUTO_INCREMENT COMMENT 'Identificador de la autorización',
  id_orden         BIGINT        NOT NULL COMMENT 'Orden a la que pertenece',
  tipo             ENUM('INICIAL','ADICIONAL') NOT NULL COMMENT 'INICIAL (del diagnóstico) o ADICIONAL (nueva falla) (RF-06)',
  descripcion      VARCHAR(2000) NULL COMMENT 'Nueva falla encontrada; obligatoria en las ADICIONALES',
  costo            DECIMAL(12,2) NOT NULL COMMENT 'Costo que el cliente debe autorizar',
  decision         ENUM('PENDIENTE','AUTORIZA','NO_AUTORIZA') NOT NULL DEFAULT 'PENDIENTE' COMMENT 'Respuesta del cliente',
  fecha_registro   DATETIME(6)   NOT NULL COMMENT 'Fecha y hora en que se pidió la autorización',
  fecha_respuesta  DATETIME(6)   NULL COMMENT 'Fecha y hora de la respuesta del cliente',
  PRIMARY KEY (id_autorizacion),
  KEY ix_autorizacion_orden (id_orden),
  CONSTRAINT fk_autorizacion_orden FOREIGN KEY (id_orden) REFERENCES orden_servicio (id_orden) ON DELETE CASCADE,
  CONSTRAINT ck_aut_costo       CHECK (costo >= 0),
  CONSTRAINT ck_aut_descripcion CHECK (tipo = 'INICIAL' OR CHAR_LENGTH(TRIM(COALESCE(descripcion, ''))) >= 3),
  CONSTRAINT ck_aut_respuesta   CHECK ((decision = 'PENDIENTE') = (fecha_respuesta IS NULL))
) ENGINE=InnoDB COMMENT='Autorización inicial y adicionales del cliente. RF-06';

-- -----------------------------------------------------------------------------
-- 4. Mantenimiento realizado y repuestos (RF-07)
-- -----------------------------------------------------------------------------
CREATE TABLE mantenimiento (
  id_mantenimiento   BIGINT        NOT NULL AUTO_INCREMENT COMMENT 'Identificador del mantenimiento',
  id_orden           BIGINT        NOT NULL COMMENT 'Orden en la que se realizó (una por orden)',
  trabajo_realizado  VARCHAR(4000) NOT NULL COMMENT 'Actividades realizadas (RF-07)',
  responsable        VARCHAR(120)  NOT NULL COMMENT 'Persona que realizó el trabajo (RF-07)',
  fecha              DATE          NOT NULL COMMENT 'Fecha del mantenimiento',
  PRIMARY KEY (id_mantenimiento),
  CONSTRAINT uk_mantenimiento_orden UNIQUE (id_orden),
  CONSTRAINT fk_mantenimiento_orden FOREIGN KEY (id_orden) REFERENCES orden_servicio (id_orden) ON DELETE CASCADE,
  CONSTRAINT ck_mant_trabajo CHECK (CHAR_LENGTH(TRIM(trabajo_realizado)) >= 5)
) ENGINE=InnoDB COMMENT='Mantenimiento realizado en la orden. RF-07';

CREATE TABLE repuesto_utilizado (
  id_repuesto       BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Identificador del registro',
  id_mantenimiento  BIGINT       NOT NULL COMMENT 'Mantenimiento en el que se usó',
  nombre            VARCHAR(120) NOT NULL COMMENT 'Nombre del repuesto',
  cantidad          INT          NOT NULL DEFAULT 1 COMMENT 'Cantidad utilizada (1 a 999)',
  PRIMARY KEY (id_repuesto),
  KEY ix_repuesto_mantenimiento (id_mantenimiento),
  CONSTRAINT fk_repuesto_mantenimiento FOREIGN KEY (id_mantenimiento) REFERENCES mantenimiento (id_mantenimiento) ON DELETE CASCADE,
  CONSTRAINT ck_rep_cantidad CHECK (cantidad BETWEEN 1 AND 999)
) ENGINE=InnoDB COMMENT='Repuestos usados en un mantenimiento. RF-07';

-- -----------------------------------------------------------------------------
-- 5. Evidencias fotográficas (RF-08)
-- -----------------------------------------------------------------------------
CREATE TABLE evidencia (
  id_evidencia  BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Identificador de la fotografía',
  id_orden      BIGINT       NOT NULL COMMENT 'Orden a la que pertenece',
  momento       ENUM('INGRESO','PROCESO','SALIDA') NOT NULL COMMENT 'Momento de la fotografía (RF-08)',
  ruta_archivo  VARCHAR(255) NOT NULL COMMENT 'Ruta del archivo dentro de la carpeta de archivos (nombre aleatorio)',
  tipo_mime     VARCHAR(20)  NOT NULL COMMENT 'image/jpeg o image/png, verificado por el contenido del archivo',
  tamano_bytes  BIGINT       NOT NULL COMMENT 'Tamaño del archivo; máximo 5 MB',
  nota          VARCHAR(500) NULL COMMENT 'Qué se está haciendo; obligatoria en PROCESO (Acta 4)',
  fecha_carga   DATETIME(6)  NOT NULL COMMENT 'Fecha y hora en que se adjuntó',
  PRIMARY KEY (id_evidencia),
  CONSTRAINT uk_evidencia_ruta UNIQUE (ruta_archivo),
  KEY ix_evidencia_orden (id_orden, momento),
  CONSTRAINT fk_evidencia_orden FOREIGN KEY (id_orden) REFERENCES orden_servicio (id_orden) ON DELETE CASCADE,
  CONSTRAINT ck_evi_mime   CHECK (tipo_mime IN ('image/jpeg', 'image/png')),
  CONSTRAINT ck_evi_tamano CHECK (tamano_bytes BETWEEN 1 AND 5242880),
  CONSTRAINT ck_evi_nota   CHECK (momento <> 'PROCESO' OR CHAR_LENGTH(TRIM(COALESCE(nota, ''))) >= 5)
) ENGINE=InnoDB COMMENT='Fotografías de ingreso, proceso y salida. RF-08';

-- -----------------------------------------------------------------------------
-- 6. Historial de estados (RF-18): lo escribe la capa de servicio en cada cambio
-- -----------------------------------------------------------------------------
CREATE TABLE cambio_estado (
  id_cambio        BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Identificador del registro del historial',
  id_orden         BIGINT       NOT NULL COMMENT 'Orden cuyo estado cambió',
  estado_anterior  ENUM('EN_DIAGNOSTICO','PENDIENTE_AUTORIZACION','AUTORIZADA','EN_ESPERA_AUTORIZACION_ADICIONAL',
                        'FINALIZADA','ENTREGADA','CERRADA_SOLO_DIAGNOSTICO') NULL COMMENT 'Estado previo; NULL al crear la orden',
  estado_nuevo     ENUM('EN_DIAGNOSTICO','PENDIENTE_AUTORIZACION','AUTORIZADA','EN_ESPERA_AUTORIZACION_ADICIONAL',
                        'FINALIZADA','ENTREGADA','CERRADA_SOLO_DIAGNOSTICO') NOT NULL COMMENT 'Estado resultante (igual al anterior en las anotaciones)',
  observacion      VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'Descripción del cambio o anotación',
  id_usuario       BIGINT       NULL COMMENT 'Usuario que hizo el cambio (RF-18)',
  fecha_hora       DATETIME(6)  NOT NULL COMMENT 'Fecha y hora del cambio',
  PRIMARY KEY (id_cambio),
  KEY ix_cambio_orden (id_orden, fecha_hora),
  CONSTRAINT fk_cambio_orden   FOREIGN KEY (id_orden)   REFERENCES orden_servicio (id_orden) ON DELETE CASCADE,
  CONSTRAINT fk_cambio_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Historial de estados de la orden. RF-18';

-- -----------------------------------------------------------------------------
-- 7. Notificaciones y recordatorios (RF-10)
-- -----------------------------------------------------------------------------
CREATE TABLE notificacion (
  id_notificacion  BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Identificador del aviso',
  id_usuario       BIGINT       NOT NULL COMMENT 'Destinatario del aviso',
  clave            VARCHAR(80)  NOT NULL COMMENT 'Evita duplicar el mismo aviso para el mismo usuario: al repetirse se renueva',
  titulo           VARCHAR(160) NOT NULL COMMENT 'Título del aviso',
  detalle          VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Detalle del aviso',
  enlace           VARCHAR(120) NOT NULL DEFAULT '' COMMENT 'Pantalla a la que lleva el aviso',
  id_equipo        BIGINT       NULL COMMENT 'Equipo relacionado (avisos de mantenimiento)',
  leida            BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'Si el usuario ya lo leyó',
  creada_en        DATETIME(6)  NOT NULL COMMENT 'Fecha y hora del aviso',
  PRIMARY KEY (id_notificacion),
  CONSTRAINT uk_notificacion_usuario_clave UNIQUE (id_usuario, clave),
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_notificacion_equipo  FOREIGN KEY (id_equipo)  REFERENCES equipo (id_equipo) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Avisos para el Administrador y para el portal del Cliente. RF-10';

CREATE TABLE recordatorio_mantenimiento (
  id_recordatorio    BIGINT        NOT NULL AUTO_INCREMENT COMMENT 'Identificador del recordatorio',
  id_equipo          BIGINT        NOT NULL COMMENT 'Equipo al que se refiere',
  id_usuario         BIGINT        NULL COMMENT 'Usuario que lo envió',
  fecha_generacion   DATETIME(6)   NOT NULL COMMENT 'Fecha y hora en que se generó (RF-10)',
  fecha_vencimiento  DATE          NOT NULL COMMENT 'Fecha estimada del mantenimiento recordado',
  mensaje            VARCHAR(1200) NOT NULL COMMENT 'Mensaje enviado por WhatsApp',
  PRIMARY KEY (id_recordatorio),
  KEY ix_recordatorio_equipo (id_equipo),
  CONSTRAINT fk_recordatorio_equipo  FOREIGN KEY (id_equipo)  REFERENCES equipo (id_equipo) ON DELETE CASCADE,
  CONSTRAINT fk_recordatorio_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Recordatorios de mantenimiento enviados por WhatsApp. RF-10';

-- -----------------------------------------------------------------------------
-- 8. Lista de precios del mes en PDF (RF-13, RF-14)
-- -----------------------------------------------------------------------------
CREATE TABLE lista_precios (
  id_lista        BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Identificador de la lista',
  mes             DATE         NOT NULL COMMENT 'Mes al que corresponde (primer día del mes)',
  nombre_archivo  VARCHAR(160) NOT NULL COMMENT 'Nombre original del PDF',
  ruta_archivo    VARCHAR(255) NOT NULL COMMENT 'Ruta del PDF dentro de la carpeta de archivos',
  tamano_bytes    BIGINT       NOT NULL COMMENT 'Tamaño del PDF; máximo 3 MB (RF-13)',
  vigente         BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'La lista publicada en el portal; al subir una nueva, la anterior queda en el histórico',
  id_usuario      BIGINT       NULL COMMENT 'Usuario que la subió',
  subida_en       DATETIME(6)  NOT NULL COMMENT 'Fecha y hora de publicación',
  PRIMARY KEY (id_lista),
  CONSTRAINT uk_lista_ruta UNIQUE (ruta_archivo),
  CONSTRAINT fk_lista_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT ck_lista_mes    CHECK (DAY(mes) = 1),
  CONSTRAINT ck_lista_tamano CHECK (tamano_bytes BETWEEN 1 AND 3145728)
) ENGINE=InnoDB COMMENT='Lista de precios del mes en PDF. RF-13, RF-14';

-- -----------------------------------------------------------------------------
-- 9. Configuración del sistema (una sola fila)
-- -----------------------------------------------------------------------------
CREATE TABLE configuracion_sistema (
  id                      BIGINT        NOT NULL DEFAULT 1 COMMENT 'Siempre 1 (fila única)',
  valor_diagnostico       DECIMAL(12,2) NOT NULL COMMENT 'Valor del diagnóstico general; se cobra si el cliente no autoriza (RF-06, RF-13)',
  umbral_proximo_dias     INT           NOT NULL DEFAULT 30 COMMENT 'Días antes del vencimiento para marcar un mantenimiento como próximo (RF-15)',
  plantilla_recordatorio  VARCHAR(1000) NOT NULL COMMENT 'Plantilla del mensaje de WhatsApp con {nombre}, {equipo}, {estado} y {fecha} (RF-10)',
  whatsapp_empresa        VARCHAR(20)   NOT NULL COMMENT 'WhatsApp de la tienda que ve el cliente',
  direccion_local         VARCHAR(120)  NOT NULL COMMENT 'Dirección del local',
  color_sistema           VARCHAR(7)    NOT NULL DEFAULT '#e6007e' COMMENT 'Color del sistema elegido en la paleta (Acta 4, RNF-04)',
  actualizado_en          DATETIME(6)   NOT NULL COMMENT 'Última modificación',
  PRIMARY KEY (id),
  CONSTRAINT ck_config_unica  CHECK (id = 1),
  CONSTRAINT ck_config_diag   CHECK (valor_diagnostico >= 1000),
  CONSTRAINT ck_config_umbral CHECK (umbral_proximo_dias BETWEEN 1 AND 90),
  CONSTRAINT ck_config_color  CHECK (color_sistema REGEXP '^#[0-9a-f]{6}$')
) ENGINE=InnoDB COMMENT='Parámetros del sistema (fila única)';
