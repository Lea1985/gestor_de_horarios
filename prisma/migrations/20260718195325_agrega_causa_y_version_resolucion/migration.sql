-- CreateEnum
CREATE TYPE "Causa" AS ENUM ('NINGUNA', 'INCIDENCIA', 'CALENDARIO_ESCOLAR', 'PERIODO_OPERATIVO', 'CAMBIO_DISTRIBUCION', 'FIN_ASIGNACION', 'MANUAL');

-- AlterTable
ALTER TABLE "ClaseProgramada" ADD COLUMN     "causa" "Causa" NOT NULL DEFAULT 'NINGUNA',
ADD COLUMN     "versionResolucion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ClaseProgramada_estado_causa_idx" ON "ClaseProgramada"("estado", "causa");
