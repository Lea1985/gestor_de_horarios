/*
  Warnings:

  - You are about to drop the column `ultimaResolucionClases` on the `Asignacion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Asignacion" DROP COLUMN "ultimaResolucionClases";

-- AlterTable
ALTER TABLE "Institucion" ADD COLUMN     "ultimaResolucionClases" TIMESTAMP(3);
