/*
  Warnings:

  - You are about to drop the column `personaId` on the `Asignacion` table. All the data in the column will be lost.
  - The `estado` column on the `Asignacion` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `estado` column on the `DistribucionHoraria` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `estado` column on the `Institucion` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tipo` column on the `UnidadOrganizativa` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `estado` column on the `UnidadOrganizativa` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Persona` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[agenteId,unidadId,institucionId]` on the table `Asignacion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[asignacionId,version]` on the table `DistribucionHoraria` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `agenteId` to the `Asignacion` table without a default value. This is not possible if the table is not empty.
  - Made the column `identificadorEstructural` on table `Asignacion` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `tipo` on the `Incidencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Estado" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "TipoUnidad" AS ENUM ('AULA', 'LABORATORIO', 'ADMIN', 'OTRA');

-- CreateEnum
CREATE TYPE "TipoIncidencia" AS ENUM ('LICENCIA', 'SUSPENSION', 'OTRO');

-- DropForeignKey
ALTER TABLE "Asignacion" DROP CONSTRAINT "Asignacion_personaId_fkey";

-- DropForeignKey
ALTER TABLE "Persona" DROP CONSTRAINT "Persona_institucionId_fkey";

-- DropIndex
DROP INDEX "Asignacion_institucionId_personaId_idx";

-- AlterTable
ALTER TABLE "Asignacion" DROP COLUMN "personaId",
ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "agenteId" INTEGER NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "estado",
ADD COLUMN     "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
ALTER COLUMN "identificadorEstructural" SET NOT NULL;

-- AlterTable
ALTER TABLE "DistribucionHoraria" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "estado",
ADD COLUMN     "estado" "Estado" NOT NULL DEFAULT 'ACTIVO';

-- AlterTable
ALTER TABLE "Incidencia" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoIncidencia" NOT NULL;

-- AlterTable
ALTER TABLE "Institucion" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "estado",
ADD COLUMN     "estado" "Estado" NOT NULL DEFAULT 'ACTIVO';

-- AlterTable
ALTER TABLE "ModuloHorario" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UnidadOrganizativa" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoUnidad",
DROP COLUMN "estado",
ADD COLUMN     "estado" "Estado" NOT NULL DEFAULT 'ACTIVO';

-- DropTable
DROP TABLE "Persona";

-- CreateTable
CREATE TABLE "Agente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "domicilio" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgenteInstitucion" (
    "agenteId" INTEGER NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "documento" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgenteInstitucion_pkey" PRIMARY KEY ("agenteId","institucionId")
);

-- CreateIndex
CREATE INDEX "Agente_documento_idx" ON "Agente"("documento");

-- CreateIndex
CREATE INDEX "Agente_activo_idx" ON "Agente"("activo");

-- CreateIndex
CREATE INDEX "AgenteInstitucion_institucionId_idx" ON "AgenteInstitucion"("institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgenteInstitucion_institucionId_documento_key" ON "AgenteInstitucion"("institucionId", "documento");

-- CreateIndex
CREATE INDEX "Asignacion_institucionId_agenteId_idx" ON "Asignacion"("institucionId", "agenteId");

-- CreateIndex
CREATE INDEX "Asignacion_institucionId_unidadId_fecha_inicio_fecha_fin_idx" ON "Asignacion"("institucionId", "unidadId", "fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "Asignacion_activo_idx" ON "Asignacion"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Asignacion_agenteId_unidadId_institucionId_key" ON "Asignacion"("agenteId", "unidadId", "institucionId");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_estado_fecha_vigencia_desde_fecha_vigen_idx" ON "DistribucionHoraria"("estado", "fecha_vigencia_desde", "fecha_vigencia_hasta");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_activo_idx" ON "DistribucionHoraria"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "DistribucionHoraria_asignacionId_version_key" ON "DistribucionHoraria"("asignacionId", "version");

-- CreateIndex
CREATE INDEX "DistribucionModulo_moduloHorarioId_idx" ON "DistribucionModulo"("moduloHorarioId");

-- CreateIndex
CREATE INDEX "Incidencia_tipo_fecha_desde_idx" ON "Incidencia"("tipo", "fecha_desde");

-- CreateIndex
CREATE INDEX "Incidencia_fecha_desde_fecha_hasta_idx" ON "Incidencia"("fecha_desde", "fecha_hasta");

-- CreateIndex
CREATE INDEX "Incidencia_tipo_asignacionId_fecha_desde_idx" ON "Incidencia"("tipo", "asignacionId", "fecha_desde");

-- CreateIndex
CREATE INDEX "Incidencia_activo_idx" ON "Incidencia"("activo");

-- CreateIndex
CREATE INDEX "Institucion_estado_idx" ON "Institucion"("estado");

-- CreateIndex
CREATE INDEX "Institucion_activo_idx" ON "Institucion"("activo");

-- CreateIndex
CREATE INDEX "Institucion_cuit_idx" ON "Institucion"("cuit");

-- CreateIndex
CREATE INDEX "ModuloHorario_dia_semana_hora_desde_hora_hasta_idx" ON "ModuloHorario"("dia_semana", "hora_desde", "hora_hasta");

-- CreateIndex
CREATE INDEX "ModuloHorario_activo_idx" ON "ModuloHorario"("activo");

-- CreateIndex
CREATE INDEX "UnidadOrganizativa_activo_idx" ON "UnidadOrganizativa"("activo");

-- AddForeignKey
ALTER TABLE "AgenteInstitucion" ADD CONSTRAINT "AgenteInstitucion_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgenteInstitucion" ADD CONSTRAINT "AgenteInstitucion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
