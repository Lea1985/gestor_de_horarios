/*
  Warnings:

  - Added the required column `updatedAt` to the `Codigario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CodigarioItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Codigario" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CodigarioItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Codigario_institucionId_activo_idx" ON "Codigario"("institucionId", "activo");

-- CreateIndex
CREATE INDEX "Codigario_deletedAt_idx" ON "Codigario"("deletedAt");

-- CreateIndex
CREATE INDEX "CodigarioItem_codigarioId_idx" ON "CodigarioItem"("codigarioId");

-- CreateIndex
CREATE INDEX "CodigarioItem_activo_idx" ON "CodigarioItem"("activo");

-- CreateIndex
CREATE INDEX "CodigarioItem_deletedAt_idx" ON "CodigarioItem"("deletedAt");
