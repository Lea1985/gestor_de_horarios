/*
  Warnings:

  - You are about to drop the column `asignacionSuplenteId` on the `Reemplazo` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[claseId,agenteSuplenteId]` on the table `Reemplazo` will be added. If there are existing duplicate values, this will fail.
  - Made the column `agenteSuplenteId` on table `Reemplazo` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Reemplazo" DROP CONSTRAINT "Reemplazo_agenteSuplenteId_fkey";

-- DropForeignKey
ALTER TABLE "Reemplazo" DROP CONSTRAINT "Reemplazo_asignacionSuplenteId_fkey";

-- DropIndex
DROP INDEX "Reemplazo_asignacionSuplenteId_idx";

-- DropIndex
DROP INDEX "Reemplazo_claseId_asignacionSuplenteId_key";

-- AlterTable
ALTER TABLE "CalendarioEscolar" ADD COLUMN     "periodoOperativoId" INTEGER;

-- AlterTable
ALTER TABLE "Reemplazo" DROP COLUMN "asignacionSuplenteId",
ALTER COLUMN "agenteSuplenteId" SET NOT NULL;

-- CreateTable
CREATE TABLE "PeriodoOperativo" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_desde" TIMESTAMP(3) NOT NULL,
    "fecha_hasta" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodoOperativo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeriodoOperativo_institucionId_idx" ON "PeriodoOperativo"("institucionId");

-- CreateIndex
CREATE INDEX "PeriodoOperativo_institucionId_activo_idx" ON "PeriodoOperativo"("institucionId", "activo");

-- CreateIndex
CREATE INDEX "PeriodoOperativo_fecha_desde_fecha_hasta_idx" ON "PeriodoOperativo"("fecha_desde", "fecha_hasta");

-- CreateIndex
CREATE INDEX "PeriodoOperativo_deletedAt_idx" ON "PeriodoOperativo"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodoOperativo_institucionId_nombre_key" ON "PeriodoOperativo"("institucionId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Reemplazo_claseId_agenteSuplenteId_key" ON "Reemplazo"("claseId", "agenteSuplenteId");

-- AddForeignKey
ALTER TABLE "Reemplazo" ADD CONSTRAINT "Reemplazo_agenteSuplenteId_fkey" FOREIGN KEY ("agenteSuplenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioEscolar" ADD CONSTRAINT "CalendarioEscolar_periodoOperativoId_fkey" FOREIGN KEY ("periodoOperativoId") REFERENCES "PeriodoOperativo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoOperativo" ADD CONSTRAINT "PeriodoOperativo_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
