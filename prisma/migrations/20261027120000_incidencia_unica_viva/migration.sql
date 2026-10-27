-- Fase 4 (plan docs/plan-correccion-motor-clases-2026-10-22.md, 3.4).
--
-- El índice único (asignacionId, fecha_desde) abarcaba también las licencias
-- eliminadas (no se podía recargar una licencia con la misma fecha de inicio
-- que una eliminada, bug 8) y a la cadena (una hija no podía empezar el mismo
-- día que su padre: P2002 -> 500). Ahora la unicidad vale solo entre
-- licencias vivas del mismo padre (las raíces comparten el padre 0).
--
-- OJO: Prisma no expresa índices parciales ni por expresión. Este índice no
-- figura en schema.prisma (ahí queda solo el @@index no único). Un
-- `prisma migrate dev` futuro va a generar un DROP INDEX de
-- "Incidencia_unica_viva_key": hay que quitar esa línea de la migración
-- generada. `prisma migrate deploy` y `prisma migrate status` (instalador y
-- tests/checkMigraciones.test.ts) no comparan contra el schema y no se ven
-- afectados. Ver docs/migraciones-sql-manuales.md.
--
-- Rollback (falla si ya hay filas que solo el índice nuevo admite):
--   DROP INDEX "Incidencia_unica_viva_key";
--   CREATE UNIQUE INDEX "Incidencia_asignacionId_fecha_desde_key"
--     ON "Incidencia"("asignacionId", "fecha_desde");

DROP INDEX "Incidencia_asignacionId_fecha_desde_key";

CREATE UNIQUE INDEX "Incidencia_unica_viva_key"
  ON "Incidencia" ("asignacionId", COALESCE("incidenciaPadreId", 0), "fecha_desde")
  WHERE "deletedAt" IS NULL;
