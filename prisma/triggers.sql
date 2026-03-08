-- =====================================================
-- 1️⃣ Constraints de fechas
-- =====================================================
ALTER TABLE "Asignacion"
ADD CONSTRAINT chk_asignacion_fechas
CHECK (fecha_fin IS NULL OR fecha_inicio < fecha_fin);

ALTER TABLE "DistribucionHoraria"
ADD CONSTRAINT chk_distribucion_fechas
CHECK (fecha_vigencia_hasta IS NULL OR fecha_vigencia_desde < fecha_vigencia_hasta);

ALTER TABLE "Incidencia"
ADD CONSTRAINT chk_incidencia_fechas
CHECK (fecha_desde <= fecha_hasta);

-- =====================================================
-- 2️⃣ Trigger: prevenir solapamiento de asignaciones
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_asignacion_solapamiento()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Asignacion"
    WHERE agenteId = NEW.agenteId
      AND unidadId = NEW.unidadId
      AND estado = 'ACTIVO'
      AND id <> NEW.id
      AND (fecha_fin IS NULL OR fecha_fin > NEW.fecha_inicio)
      AND fecha_inicio < COALESCE(NEW.fecha_fin, 'infinity'::timestamp)
  ) THEN
    RAISE EXCEPTION 'Asignacion solapada detectada para agente % en unidad %', NEW.agenteId, NEW.unidadId;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asignacion_solapamiento
BEFORE INSERT OR UPDATE ON "Asignacion"
FOR EACH ROW EXECUTE FUNCTION prevent_asignacion_solapamiento();

-- =====================================================
-- 3️⃣ Trigger: prevenir solapamiento de módulos
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_modulo_solapamiento()
RETURNS TRIGGER AS $$
DECLARE
  overlapping INT;
BEGIN
  SELECT COUNT(*) INTO overlapping
  FROM "DistribucionModulo" dm
  JOIN "ModuloHorario" mh ON mh.id = dm.moduloHorarioId
  WHERE dm.distribucionHorariaId = NEW.distribucionHorariaId
    AND mh.dia_semana = (SELECT dia_semana FROM "ModuloHorario" WHERE id = NEW.moduloHorarioId)
    AND mh.hora_desde < (SELECT hora_hasta FROM "ModuloHorario" WHERE id = NEW.moduloHorarioId)
    AND mh.hora_hasta > (SELECT hora_desde FROM "ModuloHorario" WHERE id = NEW.moduloHorarioId)
    AND NOT (dm.moduloHorarioId = NEW.moduloHorarioId);

  IF overlapping > 0 THEN
    RAISE EXCEPTION 'Modulo solapado en distribucionHoraria %', NEW.distribucionHorariaId;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_modulo_solapamiento
BEFORE INSERT OR UPDATE ON "DistribucionModulo"
FOR EACH ROW EXECUTE FUNCTION prevent_modulo_solapamiento();

-- =====================================================
-- 4️⃣ Trigger: asegurar solo una versión activa por rango en DistribucionHoraria
-- =====================================================
CREATE OR REPLACE FUNCTION enforce_version_activa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activo THEN
    IF EXISTS (
      SELECT 1
      FROM "DistribucionHoraria"
      WHERE asignacionId = NEW.asignacionId
        AND id <> NEW.id
        AND activo = TRUE
        AND (fecha_vigencia_hasta IS NULL OR fecha_vigencia_hasta > NEW.fecha_vigencia_desde)
        AND fecha_vigencia_desde < COALESCE(NEW.fecha_vigencia_hasta, 'infinity'::timestamp)
    ) THEN
      RAISE EXCEPTION 'Ya existe una versión activa solapada para asignacion %', NEW.asignacionId;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_version_activa
BEFORE INSERT OR UPDATE ON "DistribucionHoraria"
FOR EACH ROW EXECUTE FUNCTION enforce_version_activa();