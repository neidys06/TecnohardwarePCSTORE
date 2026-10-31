-- =============================================================================
-- TECNIHARDWARE PC STORE · Software de gestión y seguimiento del servicio técnico
-- E2.3 · Script de creación de la base de datos (1 de 3): base y usuario
-- Motor: MySQL 8.0 o superior · utf8mb4 · Equipo Systanwake · v2.1 · 29/10/2026
-- -----------------------------------------------------------------------------
-- Ejecutar como root (o un usuario con permiso para crear bases y usuarios):
--   mysql -u root -p < 00_crear_base.sql
-- Antes de ejecutarlo, cambia la contraseña de th_app por una propia.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS tecnihardware
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci;

-- Usuario de la aplicación con mínimo privilegio (RNF-09): solo lee y escribe datos.
-- No puede borrar ni crear tablas. Con este usuario la aplicación se ejecuta con
-- DDL_AUTO=none (el esquema lo crea este script, no Hibernate).
CREATE USER IF NOT EXISTS 'th_app'@'%' IDENTIFIED BY 'CambiarEstaClave2026';
GRANT SELECT, INSERT, UPDATE, DELETE ON tecnihardware.* TO 'th_app'@'%';
FLUSH PRIVILEGES;
