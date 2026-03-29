/*
  Warnings:

  - A unique constraint covering the columns `[dominio]` on the table `Institucion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Institucion" ADD COLUMN     "dominio" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_dominio_key" ON "Institucion"("dominio");
