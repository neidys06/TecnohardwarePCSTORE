-- Cambios de la Reunión 7 (26/11/2026) para una base creada antes con 01_esquema.sql.
-- La descripción de las fotos del proceso pasa a ser opcional.
USE tecnihardware;
ALTER TABLE evidencia DROP CHECK ck_evi_nota;
ALTER TABLE evidencia MODIFY nota VARCHAR(500) NULL COMMENT 'Qué se está haciendo (opcional, Reunión 7)';

-- Reunión 8: la cuenta del Administrador la comparten Gloria y Dichel; nombre neutro
UPDATE usuario SET nombre = 'TecniHardware PC Store' WHERE rol = 'ADMINISTRADOR' AND usuario = 'admin';
