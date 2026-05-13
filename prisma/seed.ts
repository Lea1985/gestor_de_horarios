/**
 * seed.ts
 *
 * Cubre dos escenarios reales para validar la genericidad del modelo:
 *   - Institución 1: Escuela Primaria N°12 (contexto escolar completo)
 *   - Institución 2: Sanatorio del Sur (contexto sanitario, sin materias ni cursos escolares)
 *
 * Ejecución:
 *   npx prisma db seed
 *
 * package.json:
 *   "prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
 */

import { PrismaClient, Estado, TipoUnidad, Dias, EstadoClase } from "@prisma/client";
import bcrypt from "bcrypt"

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // -----------------------------------------------------------------------
  // ROLES GLOBALES
  // -----------------------------------------------------------------------
  const rolAdmin = await prisma.rol.upsert({
    where: { id: 1 },
    update: {},
    create: { nombre: "ADMIN", descripcion: "Administrador de institución" },
  });

  const rolDirectivo = await prisma.rol.upsert({
    where: { id: 2 },
    update: {},
    create: { nombre: "DIRECTIVO", descripcion: "Director o vicedirector" },
  });

  const rolDocente = await prisma.rol.upsert({
    where: { id: 3 },
    update: {},
    create: { nombre: "DOCENTE", descripcion: "Profesor / docente" },
  });

  const rolViewer = await prisma.rol.upsert({
    where: { id: 4 },
    update: {},
    create: { nombre: "VIEWER", descripcion: "Solo lectura" },
  });

  console.log("✅ Roles creados");

  // -----------------------------------------------------------------------
  // USUARIOS GLOBALES
  // -----------------------------------------------------------------------
  const hash = await bcrypt.hash("password123", 10);

  const usuarioSuperAdmin = await prisma.usuario.upsert({
    where: { email: "superadmin@plataforma.com" },
    update: {},
    create: {
      email:        "superadmin@plataforma.com",
      passwordHash: hash,
      nombre:       "Super Admin",
      estado:       Estado.ACTIVO,
      esSuperAdmin: true,
    },
  });

  const usuarioAdminEscuela = await prisma.usuario.upsert({
    where: { email: "admin@escuela12.edu.ar" },
    update: {},
    create: {
      email:        "admin@escuela12.edu.ar",
      passwordHash: hash,
      nombre:       "Admin Escuela",
      estado:       Estado.ACTIVO,
      esSuperAdmin: false,
    },
  });

  const usuarioAdminSanatorio = await prisma.usuario.upsert({
    where: { email: "admin@sanatoriosur.com.ar" },
    update: {},
    create: {
      email:        "admin@sanatoriosur.com.ar",
      passwordHash: hash,
      nombre:       "Admin Sanatorio",
      estado:       Estado.ACTIVO,
      esSuperAdmin: false,
    },
  });

  const usuarioDocente1 = await prisma.usuario.upsert({
    where: { email: "garcia.maria@escuela12.edu.ar" },
    update: {},
    create: {
      email:        "garcia.maria@escuela12.edu.ar",
      passwordHash: hash,
      nombre:       "María García",
      estado:       Estado.ACTIVO,
      esSuperAdmin: false,
    },
  });

  console.log("✅ Usuarios creados");

  // -----------------------------------------------------------------------
  // INSTITUCIÓN 1: ESCUELA
  // -----------------------------------------------------------------------
  const escuela = await prisma.institucion.upsert({
    where: { cuit: "30-12345678-9" },
    update: {},
    create: {
      nombre: "Escuela Primaria N°12",
      dominio: "escuela12.edu.ar",
      cuit: "30-12345678-9",
      domicilio: "Av. San Martín 450, Rosario",
      telefono: "0341-4100100",
      email: "info@escuela12.edu.ar",
      estado: Estado.ACTIVO,
      configuracion: {
        usaMaterias: true,
        usaCursos: true,
        modulosDuracionMinutos: 40,
      },
    },
  });

  // -----------------------------------------------------------------------
  // INSTITUCIÓN 2: SANATORIO
  // -----------------------------------------------------------------------
  const sanatorio = await prisma.institucion.upsert({
    where: { cuit: "30-98765432-1" },
    update: {},
    create: {
      nombre: "Sanatorio del Sur",
      dominio: "sanatoriosur.com.ar",
      cuit: "30-98765432-1",
      domicilio: "Córdoba 1200, Rosario",
      telefono: "0341-4200200",
      email: "info@sanatoriosur.com.ar",
      estado: Estado.ACTIVO,
      configuracion: {
        usaMaterias: false,
        usaCursos: false,
        modulosDuracionMinutos: 60,
      },
    },
  });

  console.log("✅ Instituciones creadas");

  // -----------------------------------------------------------------------
  // ROLES DE USUARIO POR INSTITUCIÓN
  // -----------------------------------------------------------------------
  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId_institucionId: { usuarioId: usuarioSuperAdmin.id, rolId: rolAdmin.id, institucionId: escuela.id } },
    update: {},
    create: { usuarioId: usuarioSuperAdmin.id, rolId: rolAdmin.id, institucionId: escuela.id },
  });

  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId_institucionId: { usuarioId: usuarioSuperAdmin.id, rolId: rolAdmin.id, institucionId: sanatorio.id } },
    update: {},
    create: { usuarioId: usuarioSuperAdmin.id, rolId: rolAdmin.id, institucionId: sanatorio.id },
  });

  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId_institucionId: { usuarioId: usuarioAdminEscuela.id, rolId: rolAdmin.id, institucionId: escuela.id } },
    update: {},
    create: { usuarioId: usuarioAdminEscuela.id, rolId: rolAdmin.id, institucionId: escuela.id },
  });

  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId_institucionId: { usuarioId: usuarioAdminSanatorio.id, rolId: rolAdmin.id, institucionId: sanatorio.id } },
    update: {},
    create: { usuarioId: usuarioAdminSanatorio.id, rolId: rolAdmin.id, institucionId: sanatorio.id },
  });

  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId_institucionId: { usuarioId: usuarioDocente1.id, rolId: rolDocente.id, institucionId: escuela.id } },
    update: {},
    create: { usuarioId: usuarioDocente1.id, rolId: rolDocente.id, institucionId: escuela.id },
  });

  console.log("✅ Roles de usuario asignados");

  // -----------------------------------------------------------------------
  // SESIONES DE EJEMPLO
  // -----------------------------------------------------------------------
  await prisma.sesion.createMany({
    skipDuplicates: true,
    data: [
      {
        usuarioId: usuarioAdminEscuela.id,
        institucionId: escuela.id,
        token: "token-admin-escuela-seed-001",
        ip: "192.168.1.10",
        userAgent: "Mozilla/5.0",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8),
      },
      {
        usuarioId: usuarioAdminSanatorio.id,
        institucionId: sanatorio.id,
        token: "token-admin-sanatorio-seed-001",
        ip: "192.168.1.20",
        userAgent: "Mozilla/5.0",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8),
      },
    ],
  });

  console.log("✅ Sesiones creadas");

  // -----------------------------------------------------------------------
  // TURNOS — ESCUELA
  // -----------------------------------------------------------------------
  const turnoMananaEscuela = await prisma.turno.upsert({
    where: { institucionId_nombre: { institucionId: escuela.id, nombre: "Mañana" } },
    update: {},
    create: { institucionId: escuela.id, nombre: "Mañana", horaInicio: 420, horaFin: 720 },
  });

  const turnoTardeEscuela = await prisma.turno.upsert({
    where: { institucionId_nombre: { institucionId: escuela.id, nombre: "Tarde" } },
    update: {},
    create: { institucionId: escuela.id, nombre: "Tarde", horaInicio: 780, horaFin: 1020 },
  });

  // TURNOS — SANATORIO
  const turnoManaSanatorio = await prisma.turno.upsert({
    where: { institucionId_nombre: { institucionId: sanatorio.id, nombre: "Mañana" } },
    update: {},
    create: { institucionId: sanatorio.id, nombre: "Mañana", horaInicio: 420, horaFin: 840 },
  });

  const turnoTardeSanatorio = await prisma.turno.upsert({
    where: { institucionId_nombre: { institucionId: sanatorio.id, nombre: "Tarde" } },
    update: {},
    create: { institucionId: sanatorio.id, nombre: "Tarde", horaInicio: 840, horaFin: 1260 },
  });

  const turnoNocheSanatorio = await prisma.turno.upsert({
    where: { institucionId_nombre: { institucionId: sanatorio.id, nombre: "Noche" } },
    update: {},
    create: { institucionId: sanatorio.id, nombre: "Noche", horaInicio: 1260, horaFin: 420 },
  });

  console.log("✅ Turnos creados");

  // -----------------------------------------------------------------------
  // UNIDADES ORGANIZATIVAS — ESCUELA
  // -----------------------------------------------------------------------
  const aulaA = await prisma.unidadOrganizativa.upsert({
    where: { institucionId_codigoUnidad: { institucionId: escuela.id, codigoUnidad: 1 } },
    update: {},
    create: { institucionId: escuela.id, codigoUnidad: 1, nombre: "Aula 1°A", tipo: TipoUnidad.AULA },
  });

  const aulaB = await prisma.unidadOrganizativa.upsert({
    where: { institucionId_codigoUnidad: { institucionId: escuela.id, codigoUnidad: 2 } },
    update: {},
    create: { institucionId: escuela.id, codigoUnidad: 2, nombre: "Aula 2°A", tipo: TipoUnidad.AULA },
  });

  const direccion = await prisma.unidadOrganizativa.upsert({
    where: { institucionId_codigoUnidad: { institucionId: escuela.id, codigoUnidad: 99 } },
    update: {},
    create: { institucionId: escuela.id, codigoUnidad: 99, nombre: "Dirección", tipo: TipoUnidad.ADMIN },
  });

  const laboratorio = await prisma.unidadOrganizativa.upsert({
    where: { institucionId_codigoUnidad: { institucionId: escuela.id, codigoUnidad: 10 } },
    update: {},
    create: { institucionId: escuela.id, codigoUnidad: 10, nombre: "Laboratorio de Ciencias", tipo: TipoUnidad.LABORATORIO },
  });

  // UNIDADES ORGANIZATIVAS — SANATORIO
  const utiSanatorio = await prisma.unidadOrganizativa.upsert({
    where: { institucionId_codigoUnidad: { institucionId: sanatorio.id, codigoUnidad: 1 } },
    update: {},
    create: { institucionId: sanatorio.id, codigoUnidad: 1, nombre: "UTI", tipo: TipoUnidad.OTRA },
  });

  const guardiaSanatorio = await prisma.unidadOrganizativa.upsert({
    where: { institucionId_codigoUnidad: { institucionId: sanatorio.id, codigoUnidad: 2 } },
    update: {},
    create: { institucionId: sanatorio.id, codigoUnidad: 2, nombre: "Guardia Central", tipo: TipoUnidad.OTRA },
  });

  console.log("✅ Unidades organizativas creadas");

  // -----------------------------------------------------------------------
  // CURSOS — ESCUELA
  // -----------------------------------------------------------------------
  const curso1 = await prisma.curso.upsert({
    where: { institucionId_nombre: { institucionId: escuela.id, nombre: "1° Año" } },
    update: {},
    create: { institucionId: escuela.id, nombre: "1° Año", descripcion: "Primer año primaria" },
  });

  const curso2 = await prisma.curso.upsert({
    where: { institucionId_nombre: { institucionId: escuela.id, nombre: "2° Año" } },
    update: {},
    create: { institucionId: escuela.id, nombre: "2° Año", descripcion: "Segundo año primaria" },
  });

  // CURSOS — SANATORIO (sectores)
  const sectorUTI = await prisma.curso.upsert({
    where: { institucionId_nombre: { institucionId: sanatorio.id, nombre: "Sector UTI" } },
    update: {},
    create: { institucionId: sanatorio.id, nombre: "Sector UTI", descripcion: "Unidad de Terapia Intensiva" },
  });

  const sectorGuardia = await prisma.curso.upsert({
    where: { institucionId_nombre: { institucionId: sanatorio.id, nombre: "Sector Guardia" } },
    update: {},
    create: { institucionId: sanatorio.id, nombre: "Sector Guardia", descripcion: "Guardia Central" },
  });

  console.log("✅ Cursos / Sectores creados");

  // -----------------------------------------------------------------------
  // COMISIONES — ESCUELA
  // -----------------------------------------------------------------------
  const comision1A = await prisma.comision.upsert({
    where: { cursoId_nombre: { cursoId: curso1.id, nombre: "1°A" } },
    update: {},
    create: {
      institucionId: escuela.id,
      cursoId: curso1.id,
      turnoId: turnoMananaEscuela.id,
      unidadId: aulaA.id,
      nombre: "1°A",
      descripcion: "Primera división turno mañana",
    },
  });

  const comision2A = await prisma.comision.upsert({
    where: { cursoId_nombre: { cursoId: curso2.id, nombre: "2°A" } },
    update: {},
    create: {
      institucionId: escuela.id,
      cursoId: curso2.id,
      turnoId: turnoTardeEscuela.id,
      unidadId: aulaB.id,
      nombre: "2°A",
      descripcion: "Segunda división turno tarde",
    },
  });

  // COMISIONES — SANATORIO
  const guardiaMananaUTI = await prisma.comision.upsert({
    where: { cursoId_nombre: { cursoId: sectorUTI.id, nombre: "Guardia Mañana UTI" } },
    update: {},
    create: {
      institucionId: sanatorio.id,
      cursoId: sectorUTI.id,
      turnoId: turnoManaSanatorio.id,
      unidadId: utiSanatorio.id,
      nombre: "Guardia Mañana UTI",
    },
  });

  const guardiaNocheGuardia = await prisma.comision.upsert({
    where: { cursoId_nombre: { cursoId: sectorGuardia.id, nombre: "Guardia Noche Central" } },
    update: {},
    create: {
      institucionId: sanatorio.id,
      cursoId: sectorGuardia.id,
      turnoId: turnoNocheSanatorio.id,
      unidadId: null,
      nombre: "Guardia Noche Central",
    },
  });

  console.log("✅ Comisiones creadas");

  // -----------------------------------------------------------------------
  // MATERIAS — ESCUELA
  //
  // El unique ahora es [cursoId, nombre], no [institucionId, nombre].
  // Las materias sin cursoId (transversales) no pueden usar upsert por
  // ese unique ya que cursoId sería null; se usan findFirst + create.
  // -----------------------------------------------------------------------
  const matLengua = await prisma.materia.upsert({
    where: { cursoId_nombre: { cursoId: curso1.id, nombre: "Lengua" } },
    update: {},
    create: { institucionId: escuela.id, cursoId: curso1.id, nombre: "Lengua" },
  });

  const matMatematica = await prisma.materia.upsert({
    where: { cursoId_nombre: { cursoId: curso2.id, nombre: "Matemática" } },
    update: {},
    create: { institucionId: escuela.id, cursoId: curso2.id, nombre: "Matemática" },
  });

  // Ciencias Naturales se dicta en 1° Año en el laboratorio
  const matCiencias = await prisma.materia.upsert({
    where: { cursoId_nombre: { cursoId: curso1.id, nombre: "Ciencias Naturales" } },
    update: {},
    create: { institucionId: escuela.id, cursoId: curso1.id, nombre: "Ciencias Naturales" },
  });

  console.log("✅ Materias creadas");

  // -----------------------------------------------------------------------
  // CODIGARIOS — ESCUELA
  // -----------------------------------------------------------------------
  const codigarioAusentismoEscuela = await prisma.codigario.upsert({
    where: { institucionId_nombre: { institucionId: escuela.id, nombre: "Ausentismo Docente" } },
    update: {},
    create: {
      institucionId: escuela.id,
      nombre: "Ausentismo Docente",
      descripcion: "Códigos de ausencia para docentes",
    },
  });

  const itemEnfermedad = await prisma.codigarioItem.upsert({
    where: { codigarioId_codigo: { codigarioId: codigarioAusentismoEscuela.id, codigo: "ENF" } },
    update: {},
    create: {
      codigarioId: codigarioAusentismoEscuela.id,
      codigo: "ENF",
      nombre: "Enfermedad",
      descripcion: "Ausencia por enfermedad con certificado médico",
    },
  });

  const itemLicencia = await prisma.codigarioItem.upsert({
    where: { codigarioId_codigo: { codigarioId: codigarioAusentismoEscuela.id, codigo: "LIC" } },
    update: {},
    create: {
      codigarioId: codigarioAusentismoEscuela.id,
      codigo: "LIC",
      nombre: "Licencia",
      descripcion: "Licencia ordinaria",
    },
  });

  // CODIGARIOS — SANATORIO
  const codigarioAusentismoSanatorio = await prisma.codigario.upsert({
    where: { institucionId_nombre: { institucionId: sanatorio.id, nombre: "Ausentismo Personal" } },
    update: {},
    create: {
      institucionId: sanatorio.id,
      nombre: "Ausentismo Personal",
      descripcion: "Códigos de ausencia para personal de salud",
    },
  });

  const itemArtSanatorio = await prisma.codigarioItem.upsert({
    where: { codigarioId_codigo: { codigarioId: codigarioAusentismoSanatorio.id, codigo: "ART" } },
    update: {},
    create: {
      codigarioId: codigarioAusentismoSanatorio.id,
      codigo: "ART",
      nombre: "Accidente de trabajo",
      descripcion: "Ausencia por ART",
    },
  });

  console.log("✅ Codigarios creados");

 // -----------------------------------------------------------------------
// AGENTES
// -----------------------------------------------------------------------
const agenteGarcia = await prisma.agente.upsert({
  where: { institucionId_documento: { institucionId: escuela.id, documento: "25111222" } },
  update: {},
  create: {
    institucionId: escuela.id,
    nombre: "María",
    apellido: "García",
    documento: "25111222",
    email: "garcia.maria@escuela12.edu.ar",
    telefono: "0341-155001001",
    domicilio: "Pellegrini 800, Rosario",
    estado: Estado.ACTIVO,
  },
})

const agenteLopez = await prisma.agente.upsert({
  where: { institucionId_documento: { institucionId: escuela.id, documento: "30222333" } },
  update: {},
  create: {
    institucionId: escuela.id,
    nombre: "Juan",
    apellido: "López",
    documento: "30222333",
    email: "lopez.juan@escuela12.edu.ar",
    estado: Estado.ACTIVO,
  },
})

const agenteMedico = await prisma.agente.upsert({
  where: { institucionId_documento: { institucionId: sanatorio.id, documento: "28333444" } },
  update: {},
  create: {
    institucionId: sanatorio.id,
    nombre: "Carlos",
    apellido: "Fernández",
    documento: "28333444",
    email: "fernandez@sanatoriosur.com.ar",
    estado: Estado.ACTIVO,
  },
})

const agenteMulti = await prisma.agente.upsert({
  where: { institucionId_documento: { institucionId: sanatorio.id, documento: "32444555" } },
  update: {},
  create: {
    institucionId: sanatorio.id,
    nombre: "Laura",
    apellido: "Rodríguez",
    documento: "32444555",
    email: "rodriguez.laura@gmail.com",
    estado: Estado.ACTIVO,
  },
})

 
  // -----------------------------------------------------------------------
  // ASIGNACIONES
  //
  // agenteId ya no existe en Asignacion. El titular se crea en
  // TitularAsignacion después de cada upsert de asignación.
  //
  // cursoId tampoco existe en Asignacion (vive en Comision/Materia).
  //
  // turnoId es obligatorio: asigGarciaDir (cargo directivo) necesita uno.
  // -----------------------------------------------------------------------

  // — Escuela: García, Lengua en 1°A —
  const asigGarciaLengua = await prisma.asignacion.upsert({
    where: { institucionId_identificadorEstructural: { institucionId: escuela.id, identificadorEstructural: "DOC-1A-LENGUA" } },
    update: {},
    create: {
      institucionId:            escuela.id,
      unidadId:                 aulaA.id,
      identificadorEstructural: "DOC-1A-LENGUA",
      fecha_inicio:             new Date("2025-03-01"),
      estado:                   Estado.ACTIVO,
      materiaId:                matLengua.id,
      comisionId:               comision1A.id,
      turnoId:                  turnoMananaEscuela.id,
    },
  });

  // — Escuela: García, cargo directivo (sin materia ni comisión) —
  const asigGarciaDir = await prisma.asignacion.upsert({
    where: { institucionId_identificadorEstructural: { institucionId: escuela.id, identificadorEstructural: "DIR-001" } },
    update: {},
    create: {
      institucionId:            escuela.id,
      unidadId:                 direccion.id,
      identificadorEstructural: "DIR-001",
      fecha_inicio:             new Date("2024-03-01"),
      estado:                   Estado.ACTIVO,
      turnoId:                  turnoMananaEscuela.id, // turno requerido; directivo en turno mañana
    },
  });

  // — Escuela: López, Matemática en 2°A —
  const asigLopezMat = await prisma.asignacion.upsert({
    where: { institucionId_identificadorEstructural: { institucionId: escuela.id, identificadorEstructural: "DOC-2A-MAT" } },
    update: {},
    create: {
      institucionId:            escuela.id,
      unidadId:                 aulaB.id,
      identificadorEstructural: "DOC-2A-MAT",
      fecha_inicio:             new Date("2025-03-01"),
      estado:                   Estado.ACTIVO,
      materiaId:                matMatematica.id,
      comisionId:               comision2A.id,
      turnoId:                  turnoTardeEscuela.id,
    },
  });

  // — Escuela: López, Ciencias en laboratorio (1°A) —
  const asigLopezCiencias = await prisma.asignacion.upsert({
    where: { institucionId_identificadorEstructural: { institucionId: escuela.id, identificadorEstructural: "DOC-1A-CIEN" } },
    update: {},
    create: {
      institucionId:            escuela.id,
      unidadId:                 laboratorio.id,
      identificadorEstructural: "DOC-1A-CIEN",
      fecha_inicio:             new Date("2025-03-01"),
      estado:                   Estado.ACTIVO,
      materiaId:                matCiencias.id,
      comisionId:               comision1A.id,
      turnoId:                  turnoMananaEscuela.id,
    },
  });

  // — Sanatorio: Fernández, UTI mañana —
  const asigMedicoUTI = await prisma.asignacion.upsert({
    where: { institucionId_identificadorEstructural: { institucionId: sanatorio.id, identificadorEstructural: "MED-UTI-MAN" } },
    update: {},
    create: {
      institucionId:            sanatorio.id,
      unidadId:                 utiSanatorio.id,
      identificadorEstructural: "MED-UTI-MAN",
      fecha_inicio:             new Date("2024-01-01"),
      estado:                   Estado.ACTIVO,
      turnoId:                  turnoManaSanatorio.id,
      comisionId:               guardiaMananaUTI.id,
    },
  });

  // — Sanatorio: Laura, guardia noche central —
  const asigMultiGuardia = await prisma.asignacion.upsert({
    where: { institucionId_identificadorEstructural: { institucionId: sanatorio.id, identificadorEstructural: "ENF-GUAR-NOC" } },
    update: {},
    create: {
      institucionId:            sanatorio.id,
      unidadId:                 guardiaSanatorio.id,
      identificadorEstructural: "ENF-GUAR-NOC",
      fecha_inicio:             new Date("2024-06-01"),
      estado:                   Estado.ACTIVO,
      turnoId:                  turnoNocheSanatorio.id,
      comisionId:               guardiaNocheGuardia.id,
    },
  });

  console.log("✅ Asignaciones creadas");

  // -----------------------------------------------------------------------
  // TITULARES DE ASIGNACIÓN
  //
  // Un upsert no es posible porque TitularAsignacion no tiene un unique
  // compuesto que lo identifique de forma idempotente (puede haber varios
  // registros por asignación). Se usa findFirst + create para que el seed
  // sea re-ejecutable sin duplicar titulares.
  // -----------------------------------------------------------------------
  async function upsertTitular(params: {
    institucionId: number
    asignacionId: number
    agenteId: number
    fecha_desde: Date
  }) {
    const existe = await prisma.titularAsignacion.findFirst({
      where: {
        asignacionId: params.asignacionId,
        agenteId:     params.agenteId,
        fecha_desde:  params.fecha_desde,
      },
    })

    if (!existe) {
      await prisma.titularAsignacion.create({ data: params })
    }
  }

  await upsertTitular({ institucionId: escuela.id,   asignacionId: asigGarciaLengua.id, agenteId: agenteGarcia.id, fecha_desde: new Date("2025-03-01") })
  await upsertTitular({ institucionId: escuela.id,   asignacionId: asigGarciaDir.id,    agenteId: agenteGarcia.id, fecha_desde: new Date("2024-03-01") })
  await upsertTitular({ institucionId: escuela.id,   asignacionId: asigLopezMat.id,     agenteId: agenteLopez.id,  fecha_desde: new Date("2025-03-01") })
  await upsertTitular({ institucionId: escuela.id,   asignacionId: asigLopezCiencias.id,agenteId: agenteLopez.id,  fecha_desde: new Date("2025-03-01") })
  await upsertTitular({ institucionId: sanatorio.id, asignacionId: asigMedicoUTI.id,    agenteId: agenteMedico.id, fecha_desde: new Date("2024-01-01") })
  await upsertTitular({ institucionId: sanatorio.id, asignacionId: asigMultiGuardia.id, agenteId: agenteMulti.id,  fecha_desde: new Date("2024-06-01") })

  console.log("✅ Titulares de asignación creados");

  // -----------------------------------------------------------------------
  // MÓDULOS HORARIOS — ESCUELA
  // -----------------------------------------------------------------------
  const modulo1 = await prisma.moduloHorario.upsert({
    where: { institucionId_dia_semana_hora_desde_hora_hasta: { institucionId: escuela.id, dia_semana: Dias.LUNES, hora_desde: 460, hora_hasta: 500 } },
    update: {},
    create: { institucionId: escuela.id, dia_semana: Dias.LUNES, hora_desde: 460, hora_hasta: 500, turnoId: turnoMananaEscuela.id },
  });

  const modulo2 = await prisma.moduloHorario.upsert({
    where: { institucionId_dia_semana_hora_desde_hora_hasta: { institucionId: escuela.id, dia_semana: Dias.LUNES, hora_desde: 500, hora_hasta: 540 } },
    update: {},
    create: { institucionId: escuela.id, dia_semana: Dias.LUNES, hora_desde: 500, hora_hasta: 540, turnoId: turnoMananaEscuela.id },
  });

  const modulo3 = await prisma.moduloHorario.upsert({
    where: { institucionId_dia_semana_hora_desde_hora_hasta: { institucionId: escuela.id, dia_semana: Dias.MIERCOLES, hora_desde: 460, hora_hasta: 500 } },
    update: {},
    create: { institucionId: escuela.id, dia_semana: Dias.MIERCOLES, hora_desde: 460, hora_hasta: 500, turnoId: turnoMananaEscuela.id },
  });

  // MÓDULOS HORARIOS — SANATORIO
  const moduloGuardiaManaUTI = await prisma.moduloHorario.upsert({
    where: { institucionId_dia_semana_hora_desde_hora_hasta: { institucionId: sanatorio.id, dia_semana: Dias.LUNES, hora_desde: 420, hora_hasta: 780 } },
    update: {},
    create: { institucionId: sanatorio.id, dia_semana: Dias.LUNES, hora_desde: 420, hora_hasta: 780, turnoId: turnoManaSanatorio.id },
  });

  console.log("✅ Módulos horarios creados");

  // -----------------------------------------------------------------------
  // DISTRIBUCIÓN HORARIA
  // -----------------------------------------------------------------------
  const distGarciaLengua = await prisma.distribucionHoraria.upsert({
    where: { asignacionId_version: { asignacionId: asigGarciaLengua.id, version: 1 } },
    update: {},
    create: {
      institucionId: escuela.id,
      asignacionId:  asigGarciaLengua.id,
      version:       1,
      fecha_vigencia_desde: new Date("2025-03-01"),
      estado: Estado.ACTIVO,
    },
  });

  await prisma.distribucionModulo.upsert({
    where: { distribucionHorariaId_moduloHorarioId: { distribucionHorariaId: distGarciaLengua.id, moduloHorarioId: modulo1.id } },
    update: {},
    create: { distribucionHorariaId: distGarciaLengua.id, moduloHorarioId: modulo1.id },
  });

  await prisma.distribucionModulo.upsert({
    where: { distribucionHorariaId_moduloHorarioId: { distribucionHorariaId: distGarciaLengua.id, moduloHorarioId: modulo3.id } },
    update: {},
    create: { distribucionHorariaId: distGarciaLengua.id, moduloHorarioId: modulo3.id },
  });

  const distLopezMat = await prisma.distribucionHoraria.upsert({
    where: { asignacionId_version: { asignacionId: asigLopezMat.id, version: 1 } },
    update: {},
    create: {
      institucionId: escuela.id,
      asignacionId:  asigLopezMat.id,
      version:       1,
      fecha_vigencia_desde: new Date("2025-03-01"),
      estado: Estado.ACTIVO,
    },
  });

  await prisma.distribucionModulo.upsert({
    where: { distribucionHorariaId_moduloHorarioId: { distribucionHorariaId: distLopezMat.id, moduloHorarioId: modulo2.id } },
    update: {},
    create: { distribucionHorariaId: distLopezMat.id, moduloHorarioId: modulo2.id },
  });

  console.log("✅ Distribuciones horarias creadas");

  // -----------------------------------------------------------------------
  // HORARIOS ASIGNADOS
  // agenteId es snapshot del titular al momento de crear el horario.
  // -----------------------------------------------------------------------
  await prisma.horarioAsignado.upsert({
    where: { distribucionHorariaId_moduloHorarioId: { distribucionHorariaId: distGarciaLengua.id, moduloHorarioId: modulo1.id } },
    update: {},
    create: {
      institucionId:         escuela.id,
      agenteId:              agenteGarcia.id,  // snapshot
      asignacionId:          asigGarciaLengua.id,
      distribucionHorariaId: distGarciaLengua.id,
      moduloHorarioId:       modulo1.id,
    },
  });

  await prisma.horarioAsignado.upsert({
    where: { distribucionHorariaId_moduloHorarioId: { distribucionHorariaId: distGarciaLengua.id, moduloHorarioId: modulo3.id } },
    update: {},
    create: {
      institucionId:         escuela.id,
      agenteId:              agenteGarcia.id,  // snapshot
      asignacionId:          asigGarciaLengua.id,
      distribucionHorariaId: distGarciaLengua.id,
      moduloHorarioId:       modulo3.id,
    },
  });

  console.log("✅ Horarios asignados creados");

  // -----------------------------------------------------------------------
  // CLASES PROGRAMADAS
  // -----------------------------------------------------------------------
const claseGarciaLunes = await prisma.claseProgramada.upsert({
  where: {
    asignacionId_moduloId_fecha: {
      asignacionId: asigGarciaLengua.id,
      moduloId: modulo1.id,
      fecha: new Date("2025-04-07T07:40:00"),
    },
  },
  update: {},
  create: {
    institucionId: escuela.id,
    asignacionId: asigGarciaLengua.id,
    moduloId: modulo1.id,
    unidadId: aulaA.id,
    comisionId: comision1A.id,
    fecha: new Date("2025-04-07T07:40:00"),
    estado: EstadoClase.DICTADA,
  },
});

const claseGarciaMartes = await prisma.claseProgramada.upsert({
  where: {
    asignacionId_moduloId_fecha: {
      asignacionId: asigGarciaLengua.id,
      moduloId: modulo3.id,
      fecha: new Date("2025-04-09T07:40:00"),
    },
  },
  update: {},
  create: {
    institucionId: escuela.id,
    asignacionId: asigGarciaLengua.id,
    moduloId: modulo3.id,
    unidadId: aulaA.id,
    comisionId: comision1A.id,
    fecha: new Date("2025-04-09T07:40:00"),
    estado: EstadoClase.PROGRAMADA,
  },
});

const claseLopezLunes = await prisma.claseProgramada.upsert({
  where: {
    asignacionId_moduloId_fecha: {
      asignacionId: asigLopezMat.id,
      moduloId: modulo2.id,
      fecha: new Date("2025-04-07T08:20:00"),
    },
  },
  update: {},
  create: {
    institucionId: escuela.id,
    asignacionId: asigLopezMat.id,
    moduloId: modulo2.id,
    unidadId: aulaB.id,
    comisionId: comision2A.id,
    fecha: new Date("2025-04-07T08:20:00"),
    estado: EstadoClase.PROGRAMADA,
  },
});

  console.log("✅ Clases programadas creadas");

  // -----------------------------------------------------------------------
  // INCIDENCIA — García ausente el 9/4
  // -----------------------------------------------------------------------
const incidenciaGarcia = await prisma.incidencia.upsert({
  where: {
    asignacionId_fecha_desde: {
      asignacionId: asigGarciaLengua.id,
      fecha_desde: new Date("2025-04-09"),
    },
  },
  update: {},
  create: {
    asignacionId: asigGarciaLengua.id,
    fecha_desde: new Date("2025-04-09"),
    fecha_hasta: new Date("2025-04-09"),
    codigarioItemId: itemEnfermedad.id,
    observacion: "Certificado médico presentado",
  },
});

  await prisma.claseProgramada.update({
    where: { id: claseGarciaMartes.id },
    data: {
      estado:      EstadoClase.SUSPENDIDA,
      incidenciaId: incidenciaGarcia.id,
    },
  });

  console.log("✅ Incidencia creada");

  // -----------------------------------------------------------------------
  // REEMPLAZO — López reemplaza a García el miércoles
  // -----------------------------------------------------------------------
await prisma.reemplazo.upsert({
  where: {
    claseId_asignacionSuplenteId: {
      claseId: claseGarciaMartes.id,
      asignacionSuplenteId: asigLopezCiencias.id,
    },
  },
  update: {},
  create: {
    claseId: claseGarciaMartes.id,
    asignacionTitularId: asigGarciaLengua.id,
    asignacionSuplenteId: asigLopezCiencias.id,
    observacion: "Reemplazo de emergencia por enfermedad titular",
  },
});

  console.log("✅ Reemplazo creado");

  // -----------------------------------------------------------------------
  // CALENDARIO ESCOLAR
  // -----------------------------------------------------------------------
  await prisma.calendarioEscolar.createMany({
    skipDuplicates: true,
    data: [
      {
        institucionId:  escuela.id,
        fecha:          new Date("2025-04-02"),
        descripcion:    "Feriado Nacional - Malvinas",
        esFeriado:      true,
        suspendeClases: true,
      },
      {
        institucionId:  escuela.id,
        fecha:          new Date("2025-07-07"),
        descripcion:    "Inicio receso invernal",
        esFeriado:      false,
        suspendeClases: true,
      },
    ],
  });

  console.log("✅ Calendario escolar creado");

  // -----------------------------------------------------------------------
  // RESUMEN
  // -----------------------------------------------------------------------
  console.log("\n🎉 Seed completado exitosamente");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Instituciones : Escuela N°12 + Sanatorio del Sur");
  console.log("Usuarios      : superadmin + 2 admins + 1 docente");
  console.log("Agentes       : 4 (García con doble cargo, Laura en 2 instituciones)");
  console.log("Turnos        : 2 escuela (M/T) + 3 sanatorio (M/T/N)");
  console.log("Cursos        : 2 escuela + 2 sanatorio (sectores)");
  console.log("Comisiones    : 2 escuela + 2 sanatorio (guardias)");
  console.log("Materias      : 3 (solo escuela, con cursoId)");
  console.log("Asignaciones  : 6 (sin agenteId — titular en TitularAsignacion)");
  console.log("Titulares     : 6 registros iniciales en TitularAsignacion");
  console.log("Clases        : 3 programadas (1 dictada, 1 suspendida, 1 programada)");
  console.log("Incidencias   : 1 (enfermedad García con reemplazo)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });