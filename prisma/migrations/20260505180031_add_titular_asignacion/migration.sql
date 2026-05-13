/*
  Warnings:

  - You are about to drop the column `cursoId` on the `Asignacion` table. All the data in the column will be lost.
  - Made the column `turnoId` on table `Asignacion` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Asignacion" DROP CONSTRAINT "Asignacion_agenteId_fkey";

-- DropForeignKey
ALTER TABLE "Asignacion" DROP CONSTRAINT "Asignacion_cursoId_fkey";

-- DropForeignKey
ALTER TABLE "Asignacion" DROP CONSTRAINT "Asignacion_turnoId_fkey";

-- AlterTable
ALTER TABLE "Asignacion" DROP COLUMN "cursoId",
ALTER COLUMN "agenteId" DROP NOT NULL,
ALTER COLUMN "turnoId" SET NOT NULL;

-- CreateTable
CREATE TABLE "TitularAsignacion" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "agenteId" INTEGER NOT NULL,
    "fecha_desde" TIMESTAMP(3) NOT NULL,
    "fecha_hasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TitularAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TitularAsignacion_institucionId_idx" ON "TitularAsignacion"("institucionId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_asignacionId_idx" ON "TitularAsignacion"("asignacionId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_agenteId_idx" ON "TitularAsignacion"("agenteId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_institucionId_asignacionId_idx" ON "TitularAsignacion"("institucionId", "asignacionId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_institucionId_agenteId_idx" ON "TitularAsignacion"("institucionId", "agenteId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_activo_idx" ON "TitularAsignacion"("activo");

-- CreateIndex
CREATE INDEX "TitularAsignacion_deletedAt_idx" ON "TitularAsignacion"("deletedAt");

-- CreateIndex
CREATE INDEX "TitularAsignacion_asignacionId_fecha_desde_fecha_hasta_idx" ON "TitularAsignacion"("asignacionId", "fecha_desde", "fecha_hasta");

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitularAsignacion" ADD CONSTRAINT "TitularAsignacion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitularAsignacion" ADD CONSTRAINT "TitularAsignacion_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "Asignacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitularAsignacion" ADD CONSTRAINT "TitularAsignacion_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
