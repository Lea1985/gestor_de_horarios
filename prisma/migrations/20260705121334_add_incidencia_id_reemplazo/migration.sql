-- AlterTable
ALTER TABLE "Reemplazo" ADD COLUMN     "incidenciaId" INTEGER;

-- AddForeignKey
ALTER TABLE "Reemplazo" ADD CONSTRAINT "Reemplazo_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "Incidencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
