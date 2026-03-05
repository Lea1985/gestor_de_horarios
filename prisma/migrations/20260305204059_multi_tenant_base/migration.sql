/*
  Warnings:

  - A unique constraint covering the columns `[cuit]` on the table `Institucion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[institucionId,codigoUnidad]` on the table `UnidadOrganizativa` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Asignacion" ALTER COLUMN "estado" SET DEFAULT 'ACTIVA';

-- AlterTable
ALTER TABLE "DistribucionHoraria" ALTER COLUMN "estado" SET DEFAULT 'ACTIVA';

-- AlterTable
ALTER TABLE "Institucion" ALTER COLUMN "estado" SET DEFAULT 'ACTIVA';

-- AlterTable
ALTER TABLE "Persona" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "estado" SET DEFAULT 'ACTIVO';

-- AlterTable
ALTER TABLE "UnidadOrganizativa" ALTER COLUMN "estado" SET DEFAULT 'ACTIVA';

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_cuit_key" ON "Institucion"("cuit");

-- CreateIndex
CREATE INDEX "Institucion_estado_idx" ON "Institucion"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadOrganizativa_institucionId_codigoUnidad_key" ON "UnidadOrganizativa"("institucionId", "codigoUnidad");
