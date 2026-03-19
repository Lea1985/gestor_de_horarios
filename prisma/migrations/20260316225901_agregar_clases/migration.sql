/*
  Warnings:

  - A unique constraint covering the columns `[institucionId,dia_semana,hora_desde,hora_hasta]` on the table `ModuloHorario` will be added. If there are existing duplicate values, this will fail.
  - Made the column `documento` on table `Agente` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `institucionId` to the `DistribucionHoraria` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `dia_semana` on the `ModuloHorario` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hora_desde` on the `ModuloHorario` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hora_hasta` on the `ModuloHorario` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Dias" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "EstadoClase" AS ENUM ('PROGRAMADA', 'DICTADA', 'SUSPENDIDA', 'REEMPLAZADA');

-- AlterTable
ALTER TABLE "Agente" ALTER COLUMN "documento" SET NOT NULL;

-- AlterTable
ALTER TABLE "DistribucionHoraria" ADD COLUMN     "institucionId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ModuloHorario" DROP COLUMN "dia_semana",
ADD COLUMN     "dia_semana" "Dias" NOT NULL,
DROP COLUMN "hora_desde",
ADD COLUMN     "hora_desde" INTEGER NOT NULL,
DROP COLUMN "hora_hasta",
ADD COLUMN     "hora_hasta" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "HorarioAsignado" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "agenteId" INTEGER NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "distribucionHorariaId" INTEGER NOT NULL,
    "moduloHorarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorarioAsignado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaseProgramada" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "moduloId" INTEGER NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoClase" NOT NULL DEFAULT 'PROGRAMADA',
    "incidenciaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaseProgramada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reemplazo" (
    "id" SERIAL NOT NULL,
    "claseId" INTEGER NOT NULL,
    "asignacionTitularId" INTEGER NOT NULL,
    "asignacionSuplenteId" INTEGER NOT NULL,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reemplazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarioEscolar" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "esFeriado" BOOLEAN NOT NULL DEFAULT false,
    "suspendeClases" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarioEscolar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HorarioAsignado_institucionId_agenteId_idx" ON "HorarioAsignado"("institucionId", "agenteId");

-- CreateIndex
CREATE INDEX "HorarioAsignado_institucionId_moduloHorarioId_idx" ON "HorarioAsignado"("institucionId", "moduloHorarioId");

-- CreateIndex
CREATE INDEX "HorarioAsignado_institucionId_asignacionId_idx" ON "HorarioAsignado"("institucionId", "asignacionId");

-- CreateIndex
CREATE INDEX "HorarioAsignado_institucionId_distribucionHorariaId_idx" ON "HorarioAsignado"("institucionId", "distribucionHorariaId");

-- CreateIndex
CREATE INDEX "HorarioAsignado_institucionId_agenteId_moduloHorarioId_idx" ON "HorarioAsignado"("institucionId", "agenteId", "moduloHorarioId");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioAsignado_distribucionHorariaId_moduloHorarioId_key" ON "HorarioAsignado"("distribucionHorariaId", "moduloHorarioId");

-- CreateIndex
CREATE INDEX "ClaseProgramada_fecha_idx" ON "ClaseProgramada"("fecha");

-- CreateIndex
CREATE INDEX "ClaseProgramada_institucionId_fecha_idx" ON "ClaseProgramada"("institucionId", "fecha");

-- CreateIndex
CREATE INDEX "ClaseProgramada_asignacionId_idx" ON "ClaseProgramada"("asignacionId");

-- CreateIndex
CREATE INDEX "ClaseProgramada_moduloId_idx" ON "ClaseProgramada"("moduloId");

-- CreateIndex
CREATE INDEX "Reemplazo_claseId_idx" ON "Reemplazo"("claseId");

-- CreateIndex
CREATE INDEX "Reemplazo_asignacionTitularId_idx" ON "Reemplazo"("asignacionTitularId");

-- CreateIndex
CREATE INDEX "Reemplazo_asignacionSuplenteId_idx" ON "Reemplazo"("asignacionSuplenteId");

-- CreateIndex
CREATE INDEX "CalendarioEscolar_institucionId_fecha_idx" ON "CalendarioEscolar"("institucionId", "fecha");

-- CreateIndex
CREATE INDEX "Agente_deletedAt_idx" ON "Agente"("deletedAt");

-- CreateIndex
CREATE INDEX "Asignacion_deletedAt_idx" ON "Asignacion"("deletedAt");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_institucionId_idx" ON "DistribucionHoraria"("institucionId");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_deletedAt_idx" ON "DistribucionHoraria"("deletedAt");

-- CreateIndex
CREATE INDEX "Incidencia_deletedAt_idx" ON "Incidencia"("deletedAt");

-- CreateIndex
CREATE INDEX "Institucion_deletedAt_idx" ON "Institucion"("deletedAt");

-- CreateIndex
CREATE INDEX "ModuloHorario_dia_semana_hora_desde_hora_hasta_idx" ON "ModuloHorario"("dia_semana", "hora_desde", "hora_hasta");

-- CreateIndex
CREATE INDEX "ModuloHorario_institucionId_dia_semana_idx" ON "ModuloHorario"("institucionId", "dia_semana");

-- CreateIndex
CREATE UNIQUE INDEX "ModuloHorario_institucionId_dia_semana_hora_desde_hora_hast_key" ON "ModuloHorario"("institucionId", "dia_semana", "hora_desde", "hora_hasta");

-- CreateIndex
CREATE INDEX "UnidadOrganizativa_deletedAt_idx" ON "UnidadOrganizativa"("deletedAt");

-- AddForeignKey
ALTER TABLE "DistribucionHoraria" ADD CONSTRAINT "DistribucionHoraria_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioAsignado" ADD CONSTRAINT "HorarioAsignado_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioAsignado" ADD CONSTRAINT "HorarioAsignado_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioAsignado" ADD CONSTRAINT "HorarioAsignado_distribucionHorariaId_fkey" FOREIGN KEY ("distribucionHorariaId") REFERENCES "DistribucionHoraria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioAsignado" ADD CONSTRAINT "HorarioAsignado_moduloHorarioId_fkey" FOREIGN KEY ("moduloHorarioId") REFERENCES "ModuloHorario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioAsignado" ADD CONSTRAINT "HorarioAsignado_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "Asignacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "Asignacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "ModuloHorario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadOrganizativa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "Incidencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reemplazo" ADD CONSTRAINT "Reemplazo_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "ClaseProgramada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reemplazo" ADD CONSTRAINT "Reemplazo_asignacionTitularId_fkey" FOREIGN KEY ("asignacionTitularId") REFERENCES "Asignacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reemplazo" ADD CONSTRAINT "Reemplazo_asignacionSuplenteId_fkey" FOREIGN KEY ("asignacionSuplenteId") REFERENCES "Asignacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioEscolar" ADD CONSTRAINT "CalendarioEscolar_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
