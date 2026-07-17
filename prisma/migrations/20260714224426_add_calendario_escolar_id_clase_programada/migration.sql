-- AlterTable
ALTER TABLE "ClaseProgramada" ADD COLUMN     "calendarioEscolarId" INTEGER;

-- CreateIndex
CREATE INDEX "ClaseProgramada_calendarioEscolarId_idx" ON "ClaseProgramada"("calendarioEscolarId");

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_calendarioEscolarId_fkey" FOREIGN KEY ("calendarioEscolarId") REFERENCES "CalendarioEscolar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
