/*
  Warnings:

  - You are about to drop the column `activo` on the `PeriodoOperativo` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PeriodoOperativo_institucionId_activo_idx";

-- AlterTable
ALTER TABLE "PeriodoOperativo" DROP COLUMN "activo",
ADD COLUMN     "vigente" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "PeriodoOperativo_institucionId_vigente_idx" ON "PeriodoOperativo"("institucionId", "vigente");
