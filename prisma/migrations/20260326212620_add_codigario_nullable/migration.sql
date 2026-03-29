-- DropIndex
DROP INDEX "Incidencia_tipo_asignacionId_fecha_desde_idx";

-- DropIndex
DROP INDEX "Incidencia_tipo_fecha_desde_idx";

-- CreateIndex
CREATE INDEX "Incidencia_codigarioItemId_fecha_desde_idx" ON "Incidencia"("codigarioItemId", "fecha_desde");

-- CreateIndex
CREATE INDEX "Incidencia_asignacionId_fecha_desde_idx" ON "Incidencia"("asignacionId", "fecha_desde");
