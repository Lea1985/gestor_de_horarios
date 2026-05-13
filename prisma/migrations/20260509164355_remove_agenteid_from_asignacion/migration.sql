/*
  Warnings:

  - You are about to drop the column `agenteId` on the `Asignacion` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Asignacion" DROP CONSTRAINT "Asignacion_agenteId_fkey";

-- DropIndex
DROP INDEX "Asignacion_agenteId_comisionId_idx";

-- DropIndex
DROP INDEX "Asignacion_agenteId_turnoId_idx";

-- DropIndex
DROP INDEX "Asignacion_institucionId_agenteId_idx";

-- AlterTable
ALTER TABLE "Asignacion" DROP COLUMN "agenteId";

-- CreateIndex
CREATE INDEX "Asignacion_institucionId_idx" ON "Asignacion"("institucionId");

-- CreateIndex
CREATE INDEX "Asignacion_comisionId_idx" ON "Asignacion"("comisionId");

-- CreateIndex
CREATE INDEX "Asignacion_turnoId_idx" ON "Asignacion"("turnoId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_asignacionId_activo_fecha_hasta_idx" ON "TitularAsignacion"("asignacionId", "activo", "fecha_hasta");
