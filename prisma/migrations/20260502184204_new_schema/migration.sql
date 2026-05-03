/*
  Warnings:

  - You are about to drop the column `cargoId` on the `Asignacion` table. All the data in the column will be lost.
  - You are about to drop the `Cargo` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cursoId,nombre]` on the table `Materia` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Asignacion" DROP CONSTRAINT "Asignacion_cargoId_fkey";

-- DropIndex
DROP INDEX "Materia_deletedAt_idx";

-- DropIndex
DROP INDEX "Materia_institucionId_activo_idx";

-- DropIndex
DROP INDEX "Materia_institucionId_nombre_key";

-- AlterTable
ALTER TABLE "Asignacion" DROP COLUMN "cargoId";

-- AlterTable
ALTER TABLE "Materia" ADD COLUMN     "cursoId" INTEGER;

-- DropTable
DROP TABLE "Cargo";

-- CreateIndex
CREATE INDEX "Materia_cursoId_idx" ON "Materia"("cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "Materia_cursoId_nombre_key" ON "Materia"("cursoId", "nombre");

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE SET NULL ON UPDATE CASCADE;
