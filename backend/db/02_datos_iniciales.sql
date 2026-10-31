-- =============================================================================
-- TECNIHARDWARE PC STORE · E2.3 · Datos iniciales (3 de 3)
-- Categorías de equipo, configuración y la cuenta preconfigurada del Administrador (RF-02).
--   mysql -u root -p tecnihardware < 02_datos_iniciales.sql
-- La contraseña del Administrador es TEMPORAL («Temporal2026»): el sistema obliga a
-- cambiarla en el primer ingreso (RF-17). Se guarda solo su resumen BCrypt (RNF-09).
-- Si la aplicación arranca con la base vacía, crea estos mismos datos por sí sola
-- (clase DatosIniciales); este script sirve para preparar la base sin la aplicación.
-- =============================================================================
SET NAMES utf8mb4;
USE tecnihardware;

-- Categorías a la vista en el registro de equipos (Acta 4). «Otros» no es una fila:
-- se representa con id_tipo NULL y el texto en equipo.tipo_otro.
INSERT IGNORE INTO tipo_equipo (nombre, orden) VALUES
  ('Portátil', 1), ('PC de escritorio', 2), ('Todo en uno', 3), ('Impresora', 4),
  ('Dron', 5), ('Parlante', 6), ('Cargador', 7), ('Videobeam', 8), ('Televisor', 9);

INSERT IGNORE INTO configuracion_sistema
  (id, valor_diagnostico, umbral_proximo_dias, plantilla_recordatorio, whatsapp_empresa, direccion_local, color_sistema, actualizado_en)
VALUES
  (1, 32000, 30,
   'Hola {nombre}, te recordamos de TecniHardware PC Store que el mantenimiento preventivo de tu {equipo} {estado} el {fecha}. Escríbenos por este medio para agendarlo. Estamos en el Local 208.',
   '3187860122', 'Local 208', '#e6007e', NOW(6));

-- Cuenta del Administrador (no se autorregistra desde la aplicación).
INSERT INTO usuario (usuario, contrasena_hash, rol, nombre, debe_cambiar_contrasena, creado_en)
SELECT 'admin', '$2b$12$ihfoeUrdg1eqg/bnUQlVuOqr4ZQBQZikwQOrmu9RmUftFDUIx26fS', 'ADMINISTRADOR', 'Gloria Rojas', TRUE, NOW(6)
 WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE rol = 'ADMINISTRADOR' AND activo);
