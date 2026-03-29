-- AlterTable
ALTER TABLE "Reemplazo" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Reemplazo_activo_idx" ON "Reemplazo"("activo");

-- CreateIndex
CREATE INDEX "Reemplazo_deletedAt_idx" ON "Reemplazo"("deletedAt");
