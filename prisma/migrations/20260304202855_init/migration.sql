-- CreateTable
CREATE TABLE "Institucion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "configuracion" JSONB,
    "domicilio" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "cuit" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "domicilio" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadOrganizativa" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "codigoUnidad" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadOrganizativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asignacion" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "personaId" INTEGER NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "identificadorEstructural" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuloHorario" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_desde" TEXT NOT NULL,
    "hora_hasta" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuloHorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistribucionHoraria" (
    "id" SERIAL NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "fecha_vigencia_desde" TIMESTAMP(3) NOT NULL,
    "fecha_vigencia_hasta" TIMESTAMP(3),
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistribucionHoraria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistribucionModulo" (
    "distribucionHorariaId" INTEGER NOT NULL,
    "moduloHorarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistribucionModulo_pkey" PRIMARY KEY ("distribucionHorariaId","moduloHorarioId")
);

-- CreateTable
CREATE TABLE "Incidencia" (
    "id" SERIAL NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "fecha_desde" TIMESTAMP(3) NOT NULL,
    "fecha_hasta" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "incidenciaPadreId" INTEGER,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incidencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Persona_institucionId_idx" ON "Persona"("institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_institucionId_documento_key" ON "Persona"("institucionId", "documento");

-- CreateIndex
CREATE INDEX "UnidadOrganizativa_institucionId_idx" ON "UnidadOrganizativa"("institucionId");

-- CreateIndex
CREATE INDEX "Asignacion_institucionId_personaId_idx" ON "Asignacion"("institucionId", "personaId");

-- CreateIndex
CREATE UNIQUE INDEX "Asignacion_institucionId_identificadorEstructural_key" ON "Asignacion"("institucionId", "identificadorEstructural");

-- CreateIndex
CREATE INDEX "ModuloHorario_institucionId_idx" ON "ModuloHorario"("institucionId");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_asignacionId_idx" ON "DistribucionHoraria"("asignacionId");

-- CreateIndex
CREATE INDEX "Incidencia_asignacionId_idx" ON "Incidencia"("asignacionId");

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadOrganizativa" ADD CONSTRAINT "UnidadOrganizativa_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadOrganizativa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuloHorario" ADD CONSTRAINT "ModuloHorario_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribucionHoraria" ADD CONSTRAINT "DistribucionHoraria_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "Asignacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribucionModulo" ADD CONSTRAINT "DistribucionModulo_distribucionHorariaId_fkey" FOREIGN KEY ("distribucionHorariaId") REFERENCES "DistribucionHoraria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribucionModulo" ADD CONSTRAINT "DistribucionModulo_moduloHorarioId_fkey" FOREIGN KEY ("moduloHorarioId") REFERENCES "ModuloHorario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "Asignacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_incidenciaPadreId_fkey" FOREIGN KEY ("incidenciaPadreId") REFERENCES "Incidencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
