/*
  Migración corregida a mano — separa el ADD COLUMN del DROP COLUMN para
  poder hacer el backfill de vigente -> estado en el medio, y agrega los
  índices únicos parciales que Prisma no puede generar desde el schema.
*/

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('BORRADOR', 'ACTIVO', 'CERRADO');

-- DropIndex
DROP INDEX "PeriodoOperativo_institucionId_vigente_idx";

-- 1. Agregar la columna nueva PRIMERO, sin tocar vigente todavía
ALTER TABLE "PeriodoOperativo" ADD COLUMN "estado" "EstadoPeriodo" NOT NULL DEFAULT 'BORRADOR';

-- 2. Backfill: acá todavía existe `vigente`, rescatamos el dato real
UPDATE "PeriodoOperativo" SET "estado" = 'ACTIVO' WHERE "vigente" = true;

-- 3. Recién ahora borrar la columna vieja
ALTER TABLE "PeriodoOperativo" DROP COLUMN "vigente";

-- CreateIndex (generado por Prisma)
CREATE UNIQUE INDEX "ClaseProgramada_asignacionId_moduloId_fecha_key" ON "ClaseProgramada"("asignacionId", "moduloId", "fecha");

-- CreateIndex (generado por Prisma)
CREATE INDEX "PeriodoOperativo_institucionId_estado_idx" ON "PeriodoOperativo"("institucionId", "estado");

-- 4. Índice único parcial: garantiza no-duplicación en modo "turno"
--    (moduloId null). El @@unique de arriba NO cubre este caso porque
--    Postgres nunca considera dos NULL como iguales.
CREATE UNIQUE INDEX "clase_unica_sin_modulo"
ON "ClaseProgramada" ("asignacionId", "fecha")
WHERE "moduloId" IS NULL;

-- 5. Índice único parcial: solo un período ACTIVO por institución.
--    Esta es la garantía real (a nivel de base, no de código) de que
--    nunca puede haber dos períodos activos al mismo tiempo, ni siquiera
--    por una condición de carrera entre dos requests simultáneos.
CREATE UNIQUE INDEX "un_solo_periodo_activo_por_institucion"
ON "PeriodoOperativo" ("institucionId")
WHERE "estado" = 'ACTIVO';
