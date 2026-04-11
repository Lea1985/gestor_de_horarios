/*
  Warnings:

  - Added the required column `institucionId` to the `Sesion` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Asignacion_agenteId_unidadId_institucionId_key";

-- AlterTable
ALTER TABLE "Asignacion" ADD COLUMN     "comisionId" INTEGER,
ADD COLUMN     "cursoId" INTEGER,
ADD COLUMN     "materiaId" INTEGER,
ADD COLUMN     "turnoId" INTEGER;

-- AlterTable
ALTER TABLE "ClaseProgramada" ADD COLUMN     "comisionId" INTEGER;

-- AlterTable
ALTER TABLE "ModuloHorario" ADD COLUMN     "turnoId" INTEGER;

-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN     "institucionId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Turno" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "horaInicio" INTEGER NOT NULL,
    "horaFin" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comision" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "unidadId" INTEGER,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materia" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Materia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Turno_institucionId_idx" ON "Turno"("institucionId");

-- CreateIndex
CREATE INDEX "Turno_activo_idx" ON "Turno"("activo");

-- CreateIndex
CREATE INDEX "Turno_deletedAt_idx" ON "Turno"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Turno_institucionId_nombre_key" ON "Turno"("institucionId", "nombre");

-- CreateIndex
CREATE INDEX "Curso_institucionId_idx" ON "Curso"("institucionId");

-- CreateIndex
CREATE INDEX "Curso_activo_idx" ON "Curso"("activo");

-- CreateIndex
CREATE INDEX "Curso_deletedAt_idx" ON "Curso"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Curso_institucionId_nombre_key" ON "Curso"("institucionId", "nombre");

-- CreateIndex
CREATE INDEX "Comision_institucionId_idx" ON "Comision"("institucionId");

-- CreateIndex
CREATE INDEX "Comision_cursoId_idx" ON "Comision"("cursoId");

-- CreateIndex
CREATE INDEX "Comision_turnoId_idx" ON "Comision"("turnoId");

-- CreateIndex
CREATE INDEX "Comision_unidadId_idx" ON "Comision"("unidadId");

-- CreateIndex
CREATE INDEX "Comision_activo_idx" ON "Comision"("activo");

-- CreateIndex
CREATE INDEX "Comision_deletedAt_idx" ON "Comision"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Comision_cursoId_nombre_key" ON "Comision"("cursoId", "nombre");

-- CreateIndex
CREATE INDEX "Materia_institucionId_idx" ON "Materia"("institucionId");

-- CreateIndex
CREATE INDEX "Materia_institucionId_activo_idx" ON "Materia"("institucionId", "activo");

-- CreateIndex
CREATE INDEX "Materia_deletedAt_idx" ON "Materia"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Materia_institucionId_nombre_key" ON "Materia"("institucionId", "nombre");

-- CreateIndex
CREATE INDEX "Asignacion_agenteId_comisionId_idx" ON "Asignacion"("agenteId", "comisionId");

-- CreateIndex
CREATE INDEX "Asignacion_agenteId_turnoId_idx" ON "Asignacion"("agenteId", "turnoId");

-- CreateIndex
CREATE INDEX "ClaseProgramada_comisionId_fecha_idx" ON "ClaseProgramada"("comisionId", "fecha");

-- CreateIndex
CREATE INDEX "ModuloHorario_turnoId_idx" ON "ModuloHorario"("turnoId");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_institucionId_idx" ON "Sesion"("usuarioId", "institucionId");

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comision" ADD CONSTRAINT "Comision_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comision" ADD CONSTRAINT "Comision_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comision" ADD CONSTRAINT "Comision_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comision" ADD CONSTRAINT "Comision_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadOrganizativa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "Comision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuloHorario" ADD CONSTRAINT "ModuloHorario_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "Comision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
