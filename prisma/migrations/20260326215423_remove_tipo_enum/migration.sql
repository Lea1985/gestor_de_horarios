/*
  Warnings:

  - You are about to drop the column `tipo` on the `Incidencia` table. All the data in the column will be lost.
  - Made the column `codigarioItemId` on table `Incidencia` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Incidencia" DROP CONSTRAINT "Incidencia_codigarioItemId_fkey";

-- AlterTable
ALTER TABLE "Incidencia" DROP COLUMN "tipo",
ALTER COLUMN "codigarioItemId" SET NOT NULL;

-- DropEnum
DROP TYPE "TipoIncidencia";

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_codigarioItemId_fkey" FOREIGN KEY ("codigarioItemId") REFERENCES "CodigarioItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
