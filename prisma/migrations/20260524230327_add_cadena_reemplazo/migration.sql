/*
  Warnings:

  - Made the column `periodoOperativoId` on table `CalendarioEscolar` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CalendarioEscolar" DROP CONSTRAINT "CalendarioEscolar_periodoOperativoId_fkey";

-- DropIndex
DROP INDEX "Reemplazo_claseId_agenteSuplenteId_key";

-- AlterTable
ALTER TABLE "CalendarioEscolar" ALTER COLUMN "periodoOperativoId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Reemplazo" ADD COLUMN     "reemplazoPadreId" INTEGER;

-- CreateIndex
CREATE INDEX "CalendarioEscolar_periodoOperativoId_idx" ON "CalendarioEscolar"("periodoOperativoId");

-- CreateIndex
CREATE INDEX "Reemplazo_reemplazoPadreId_idx" ON "Reemplazo"("reemplazoPadreId");

-- AddForeignKey
ALTER TABLE "Reemplazo" ADD CONSTRAINT "Reemplazo_reemplazoPadreId_fkey" FOREIGN KEY ("reemplazoPadreId") REFERENCES "Reemplazo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioEscolar" ADD CONSTRAINT "CalendarioEscolar_periodoOperativoId_fkey" FOREIGN KEY ("periodoOperativoId") REFERENCES "PeriodoOperativo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
