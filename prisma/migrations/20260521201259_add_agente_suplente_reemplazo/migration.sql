-- DropForeignKey
ALTER TABLE "Reemplazo" DROP CONSTRAINT "Reemplazo_asignacionSuplenteId_fkey";

-- AlterTable
ALTER TABLE "Reemplazo" ADD COLUMN     "agenteSuplenteId" INTEGER,
ALTER COLUMN "asignacionSuplenteId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Reemplazo_agenteSuplenteId_idx" ON "Reemplazo"("agenteSuplenteId");

-- AddForeignKey
ALTER TABLE "Reemplazo" ADD CONSTRAINT "Reemplazo_asignacionSuplenteId_fkey" FOREIGN KEY ("asignacionSuplenteId") REFERENCES "Asignacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reemplazo" ADD CONSTRAINT "Reemplazo_agenteSuplenteId_fkey" FOREIGN KEY ("agenteSuplenteId") REFERENCES "Agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
