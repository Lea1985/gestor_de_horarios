-- CreateEnum
CREATE TYPE "Estado" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "TipoUnidad" AS ENUM ('AULA', 'LABORATORIO', 'ADMIN', 'OTRA');

-- CreateEnum
CREATE TYPE "Dias" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "EstadoClase" AS ENUM ('PROGRAMADA', 'DICTADA', 'SUSPENDIDA', 'REEMPLAZADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT,
    "esSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioRol" (
    "usuarioId" INTEGER NOT NULL,
    "rolId" INTEGER NOT NULL,
    "institucionId" INTEGER NOT NULL,

    CONSTRAINT "UsuarioRol_pkey" PRIMARY KEY ("usuarioId","rolId","institucionId")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institucion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "dominio" TEXT,
    "configuracion" JSONB,
    "domicilio" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "cuit" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agente" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
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
CREATE TABLE "UnidadOrganizativa" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "codigoUnidad" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoUnidad",
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadOrganizativa_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "Asignacion" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "identificadorEstructural" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "materiaId" INTEGER,
    "comisionId" INTEGER,
    "turnoId" INTEGER NOT NULL,

    CONSTRAINT "Asignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TitularAsignacion" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "agenteId" INTEGER NOT NULL,
    "fecha_desde" TIMESTAMP(3) NOT NULL,
    "fecha_hasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TitularAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuloHorario" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "dia_semana" "Dias" NOT NULL,
    "hora_desde" INTEGER NOT NULL,
    "hora_hasta" INTEGER NOT NULL,
    "turnoId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuloHorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistribucionHoraria" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "fecha_vigencia_desde" TIMESTAMP(3) NOT NULL,
    "fecha_vigencia_hasta" TIMESTAMP(3),
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
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
    "codigarioItemId" INTEGER NOT NULL,
    "observacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "incidenciaPadreId" INTEGER,

    CONSTRAINT "Incidencia_pkey" PRIMARY KEY ("id")
);

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
    "moduloId" INTEGER,
    "unidadId" INTEGER NOT NULL,
    "comisionId" INTEGER,
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
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
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
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarioEscolar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Codigario" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Codigario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigarioItem" (
    "id" SERIAL NOT NULL,
    "codigarioId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodigarioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materia" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "cursoId" INTEGER,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Materia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "UsuarioRol_usuarioId_idx" ON "UsuarioRol"("usuarioId");

-- CreateIndex
CREATE INDEX "UsuarioRol_institucionId_idx" ON "UsuarioRol"("institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_token_key" ON "Sesion"("token");

-- CreateIndex
CREATE INDEX "Sesion_expiresAt_idx" ON "Sesion"("expiresAt");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_institucionId_idx" ON "Sesion"("usuarioId", "institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_dominio_key" ON "Institucion"("dominio");

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_cuit_key" ON "Institucion"("cuit");

-- CreateIndex
CREATE INDEX "Institucion_estado_idx" ON "Institucion"("estado");

-- CreateIndex
CREATE INDEX "Institucion_activo_idx" ON "Institucion"("activo");

-- CreateIndex
CREATE INDEX "Institucion_cuit_idx" ON "Institucion"("cuit");

-- CreateIndex
CREATE INDEX "Institucion_deletedAt_idx" ON "Institucion"("deletedAt");

-- CreateIndex
CREATE INDEX "Agente_institucionId_idx" ON "Agente"("institucionId");

-- CreateIndex
CREATE INDEX "Agente_activo_idx" ON "Agente"("activo");

-- CreateIndex
CREATE INDEX "Agente_deletedAt_idx" ON "Agente"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Agente_institucionId_documento_key" ON "Agente"("institucionId", "documento");

-- CreateIndex
CREATE INDEX "UnidadOrganizativa_institucionId_idx" ON "UnidadOrganizativa"("institucionId");

-- CreateIndex
CREATE INDEX "UnidadOrganizativa_activo_idx" ON "UnidadOrganizativa"("activo");

-- CreateIndex
CREATE INDEX "UnidadOrganizativa_deletedAt_idx" ON "UnidadOrganizativa"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadOrganizativa_institucionId_codigoUnidad_key" ON "UnidadOrganizativa"("institucionId", "codigoUnidad");

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
CREATE INDEX "Asignacion_institucionId_idx" ON "Asignacion"("institucionId");

-- CreateIndex
CREATE INDEX "Asignacion_institucionId_unidadId_fecha_inicio_fecha_fin_idx" ON "Asignacion"("institucionId", "unidadId", "fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "Asignacion_comisionId_idx" ON "Asignacion"("comisionId");

-- CreateIndex
CREATE INDEX "Asignacion_turnoId_idx" ON "Asignacion"("turnoId");

-- CreateIndex
CREATE INDEX "Asignacion_activo_idx" ON "Asignacion"("activo");

-- CreateIndex
CREATE INDEX "Asignacion_deletedAt_idx" ON "Asignacion"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Asignacion_institucionId_identificadorEstructural_key" ON "Asignacion"("institucionId", "identificadorEstructural");

-- CreateIndex
CREATE INDEX "TitularAsignacion_institucionId_idx" ON "TitularAsignacion"("institucionId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_asignacionId_idx" ON "TitularAsignacion"("asignacionId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_agenteId_idx" ON "TitularAsignacion"("agenteId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_institucionId_asignacionId_idx" ON "TitularAsignacion"("institucionId", "asignacionId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_institucionId_agenteId_idx" ON "TitularAsignacion"("institucionId", "agenteId");

-- CreateIndex
CREATE INDEX "TitularAsignacion_activo_idx" ON "TitularAsignacion"("activo");

-- CreateIndex
CREATE INDEX "TitularAsignacion_deletedAt_idx" ON "TitularAsignacion"("deletedAt");

-- CreateIndex
CREATE INDEX "TitularAsignacion_asignacionId_fecha_desde_fecha_hasta_idx" ON "TitularAsignacion"("asignacionId", "fecha_desde", "fecha_hasta");

-- CreateIndex
CREATE INDEX "TitularAsignacion_asignacionId_activo_fecha_hasta_idx" ON "TitularAsignacion"("asignacionId", "activo", "fecha_hasta");

-- CreateIndex
CREATE INDEX "ModuloHorario_institucionId_idx" ON "ModuloHorario"("institucionId");

-- CreateIndex
CREATE INDEX "ModuloHorario_dia_semana_hora_desde_hora_hasta_idx" ON "ModuloHorario"("dia_semana", "hora_desde", "hora_hasta");

-- CreateIndex
CREATE INDEX "ModuloHorario_turnoId_idx" ON "ModuloHorario"("turnoId");

-- CreateIndex
CREATE INDEX "ModuloHorario_activo_idx" ON "ModuloHorario"("activo");

-- CreateIndex
CREATE INDEX "ModuloHorario_institucionId_dia_semana_idx" ON "ModuloHorario"("institucionId", "dia_semana");

-- CreateIndex
CREATE UNIQUE INDEX "ModuloHorario_institucionId_dia_semana_hora_desde_hora_hast_key" ON "ModuloHorario"("institucionId", "dia_semana", "hora_desde", "hora_hasta");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_asignacionId_idx" ON "DistribucionHoraria"("asignacionId");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_institucionId_idx" ON "DistribucionHoraria"("institucionId");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_estado_fecha_vigencia_desde_fecha_vigen_idx" ON "DistribucionHoraria"("estado", "fecha_vigencia_desde", "fecha_vigencia_hasta");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_activo_idx" ON "DistribucionHoraria"("activo");

-- CreateIndex
CREATE INDEX "DistribucionHoraria_deletedAt_idx" ON "DistribucionHoraria"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DistribucionHoraria_asignacionId_version_key" ON "DistribucionHoraria"("asignacionId", "version");

-- CreateIndex
CREATE INDEX "DistribucionModulo_moduloHorarioId_idx" ON "DistribucionModulo"("moduloHorarioId");

-- CreateIndex
CREATE INDEX "Incidencia_asignacionId_idx" ON "Incidencia"("asignacionId");

-- CreateIndex
CREATE INDEX "Incidencia_codigarioItemId_fecha_desde_idx" ON "Incidencia"("codigarioItemId", "fecha_desde");

-- CreateIndex
CREATE INDEX "Incidencia_fecha_desde_fecha_hasta_idx" ON "Incidencia"("fecha_desde", "fecha_hasta");

-- CreateIndex
CREATE INDEX "Incidencia_asignacionId_fecha_desde_idx" ON "Incidencia"("asignacionId", "fecha_desde");

-- CreateIndex
CREATE INDEX "Incidencia_activo_idx" ON "Incidencia"("activo");

-- CreateIndex
CREATE INDEX "Incidencia_deletedAt_idx" ON "Incidencia"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Incidencia_asignacionId_fecha_desde_key" ON "Incidencia"("asignacionId", "fecha_desde");

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
CREATE INDEX "ClaseProgramada_comisionId_fecha_idx" ON "ClaseProgramada"("comisionId", "fecha");

-- CreateIndex
CREATE INDEX "Reemplazo_claseId_idx" ON "Reemplazo"("claseId");

-- CreateIndex
CREATE INDEX "Reemplazo_asignacionTitularId_idx" ON "Reemplazo"("asignacionTitularId");

-- CreateIndex
CREATE INDEX "Reemplazo_asignacionSuplenteId_idx" ON "Reemplazo"("asignacionSuplenteId");

-- CreateIndex
CREATE INDEX "Reemplazo_activo_idx" ON "Reemplazo"("activo");

-- CreateIndex
CREATE INDEX "Reemplazo_deletedAt_idx" ON "Reemplazo"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reemplazo_claseId_asignacionSuplenteId_key" ON "Reemplazo"("claseId", "asignacionSuplenteId");

-- CreateIndex
CREATE INDEX "CalendarioEscolar_institucionId_fecha_idx" ON "CalendarioEscolar"("institucionId", "fecha");

-- CreateIndex
CREATE INDEX "CalendarioEscolar_activo_idx" ON "CalendarioEscolar"("activo");

-- CreateIndex
CREATE INDEX "CalendarioEscolar_deletedAt_idx" ON "CalendarioEscolar"("deletedAt");

-- CreateIndex
CREATE INDEX "Codigario_institucionId_idx" ON "Codigario"("institucionId");

-- CreateIndex
CREATE INDEX "Codigario_institucionId_activo_idx" ON "Codigario"("institucionId", "activo");

-- CreateIndex
CREATE INDEX "Codigario_deletedAt_idx" ON "Codigario"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Codigario_institucionId_nombre_key" ON "Codigario"("institucionId", "nombre");

-- CreateIndex
CREATE INDEX "CodigarioItem_codigarioId_idx" ON "CodigarioItem"("codigarioId");

-- CreateIndex
CREATE INDEX "CodigarioItem_activo_idx" ON "CodigarioItem"("activo");

-- CreateIndex
CREATE INDEX "CodigarioItem_deletedAt_idx" ON "CodigarioItem"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CodigarioItem_codigarioId_codigo_key" ON "CodigarioItem"("codigarioId", "codigo");

-- CreateIndex
CREATE INDEX "Materia_institucionId_idx" ON "Materia"("institucionId");

-- CreateIndex
CREATE INDEX "Materia_cursoId_idx" ON "Materia"("cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "Materia_cursoId_nombre_key" ON "Materia"("cursoId", "nombre");

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agente" ADD CONSTRAINT "Agente_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadOrganizativa" ADD CONSTRAINT "UnidadOrganizativa_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadOrganizativa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "Comision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitularAsignacion" ADD CONSTRAINT "TitularAsignacion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitularAsignacion" ADD CONSTRAINT "TitularAsignacion_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "Asignacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitularAsignacion" ADD CONSTRAINT "TitularAsignacion_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuloHorario" ADD CONSTRAINT "ModuloHorario_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuloHorario" ADD CONSTRAINT "ModuloHorario_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribucionHoraria" ADD CONSTRAINT "DistribucionHoraria_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "Asignacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribucionHoraria" ADD CONSTRAINT "DistribucionHoraria_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribucionModulo" ADD CONSTRAINT "DistribucionModulo_distribucionHorariaId_fkey" FOREIGN KEY ("distribucionHorariaId") REFERENCES "DistribucionHoraria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribucionModulo" ADD CONSTRAINT "DistribucionModulo_moduloHorarioId_fkey" FOREIGN KEY ("moduloHorarioId") REFERENCES "ModuloHorario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_incidenciaPadreId_fkey" FOREIGN KEY ("incidenciaPadreId") REFERENCES "Incidencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "Asignacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_codigarioItemId_fkey" FOREIGN KEY ("codigarioItemId") REFERENCES "CodigarioItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "ModuloHorario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadOrganizativa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaseProgramada" ADD CONSTRAINT "ClaseProgramada_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "Comision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Codigario" ADD CONSTRAINT "Codigario_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigarioItem" ADD CONSTRAINT "CodigarioItem_codigarioId_fkey" FOREIGN KEY ("codigarioId") REFERENCES "Codigario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE SET NULL ON UPDATE CASCADE;
