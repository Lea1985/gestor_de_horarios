// tests/helpers/factories.ts

import { PrismaClient, Estado, Prisma } from "@prisma/client"
import { randomUUID } from "crypto"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

export async function createTestInstitucion(overrides?: {
  nombre?: string
  configuracion?: Prisma.InputJsonValue
}) {
  const uid = randomUUID()

  return prisma.institucion.create({
    data: {
      nombre:        overrides?.nombre ?? `Test Institución ${uid}`,
      dominio:       `test-${uid}.dev`,
      cuit:          `30-${uid.replace(/-/g, "").slice(0, 8)}-0`,
      estado:        Estado.ACTIVO,
      configuracion: overrides?.configuracion ?? Prisma.JsonNull,
    },
  })
}

export async function createTestTenant() {
  const inst = await createTestInstitucion()

  const rol = await prisma.rol.upsert({
    where:  { id: 1 },
    update: {},
    create: { nombre: "ADMIN", descripcion: "Administrador" },
  })

  const uid          = randomUUID()
  const passwordHash = await bcrypt.hash("password123", 10)

  const usuario = await prisma.usuario.create({
    data: {
      email:        `admin-${uid}@test.dev`,
      passwordHash,
      nombre:       "Admin Test",
      esSuperAdmin: false,
      estado:       Estado.ACTIVO,
    },
  })

  await prisma.usuarioRol.create({
    data: { usuarioId: usuario.id, rolId: rol.id, institucionId: inst.id },
  })

  const sesion = await prisma.sesion.create({
    data: {
      usuarioId:     usuario.id,
      institucionId: inst.id,
      token:         `token-${uid}`,
      expiresAt:     new Date(Date.now() + 1000 * 60 * 60 * 8),
    },
  })

  return {
    institucion:   inst,
    usuario,
    token:         sesion.token,
    institucionId: inst.id,
  }
}

export async function createTestSuperAdmin(institucionId: number) {
  const uid = randomUUID()

  const usuario = await prisma.usuario.create({
    data: {
      email:        `superadmin-${uid}@test.dev`,
      passwordHash: "$2b$10$placeholderHashForTests000000000000000000000000000000",
      nombre:       "Super Admin Test",
      esSuperAdmin: true,
      estado:       Estado.ACTIVO,
    },
  })

  const sesion = await prisma.sesion.create({
    data: {
      usuarioId:     usuario.id,
      institucionId: institucionId,
      token:         `token-superadmin-${uid}`,
      expiresAt:     new Date(Date.now() + 1000 * 60 * 60 * 8),
    },
  })

  return { usuario, sesion }
}

export async function createTestUsuario(
  institucionId: number,
  rolId: number,
  overrides?: { esSuperAdmin?: boolean }
) {
  const uid = randomUUID()

  const usuario = await prisma.usuario.create({
    data: {
      email:        `test-${uid}@test.dev`,
      passwordHash: "$2b$10$placeholderHashForTests000000000000000000000000000000",
      nombre:       `Test User ${uid}`,
      esSuperAdmin: overrides?.esSuperAdmin ?? false,
      estado:       Estado.ACTIVO,
    },
  })

  await prisma.usuarioRol.create({
    data: { usuarioId: usuario.id, rolId, institucionId },
  })

  return usuario
}

export async function createTestAgente(institucionId: number) {
  const uid = randomUUID()

  const agente = await prisma.agente.create({
    data: {
      nombre:    "Test",
      apellido:  "Agente",
      documento: `DOC-${uid}`,
      email:     `agente-${uid}@test.dev`,
      estado:    Estado.ACTIVO,
    },
  })

  await prisma.agenteInstitucion.create({
    data: { agenteId: agente.id, institucionId, documento: `DOC-${uid}` },
  })

  return agente
}

export async function destroyInstitucion(institucionId: number) {
  // 1. Reemplazos → ClasesProgramadas → Incidencias
  await prisma.reemplazo.deleteMany({
    where: { clase: { institucionId } },
  })
  await prisma.claseProgramada.deleteMany({ where: { institucionId } })
  await prisma.incidencia.deleteMany({
    where: { asignacion: { institucionId } },
  })

  // 2. HorarioAsignado → DistribucionModulo → DistribucionHoraria
  await prisma.horarioAsignado.deleteMany({ where: { institucionId } })
  await prisma.distribucionModulo.deleteMany({
    where: { distribucionHoraria: { institucionId } },
  })
  await prisma.distribucionHoraria.deleteMany({ where: { institucionId } })

  // 3. Asignaciones
  await prisma.asignacion.deleteMany({ where: { institucionId } })

  // 4. Módulos, Comisiones, Unidades, Cursos, Turnos
  await prisma.moduloHorario.deleteMany({ where: { institucionId } })
  await prisma.comision.deleteMany({ where: { institucionId } })
  await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
  await prisma.curso.deleteMany({ where: { institucionId } })
  await prisma.turno.deleteMany({ where: { institucionId } })

  // 5. Codigarios, Materias, Calendario
  await prisma.codigarioItem.deleteMany({
    where: { codigario: { institucionId } },
  })
  await prisma.codigario.deleteMany({ where: { institucionId } })
  await prisma.materia.deleteMany({ where: { institucionId } })
  await prisma.calendarioEscolar.deleteMany({ where: { institucionId } })

  // 6. Agentes: obtener ids ANTES de desvincular
  const agentesVinculados = await prisma.agenteInstitucion.findMany({
    where:  { institucionId },
    select: { agenteId: true },
  })
  const agenteIds = agentesVinculados.map(a => a.agenteId)

  await prisma.agenteInstitucion.deleteMany({ where: { institucionId } })

  // Borrar agentes huérfanos (sin ninguna otra institución)
  if (agenteIds.length > 0) {
    const aun_vinculados = await prisma.agenteInstitucion.findMany({
      where:  { agenteId: { in: agenteIds } },
      select: { agenteId: true },
    })
    const idsAunVinculados = new Set(aun_vinculados.map(a => a.agenteId))
    const idsHuerfanos     = agenteIds.filter(id => !idsAunVinculados.has(id))

    if (idsHuerfanos.length > 0) {
      await prisma.agente.deleteMany({ where: { id: { in: idsHuerfanos } } })
    }
  }

  // 7. Agentes creados vía API con soft delete — email termina en @test.com
  //    No tienen AgenteInstitucion si fueron soft-deleted antes del cleanup
  await prisma.agente.deleteMany({
    where: {
      email:          { endsWith: "@test.com" },
      instituciones:  { none: {} },
    },
  })

  // 8. Usuarios: obtener ids ANTES de borrar roles
  const usuariosVinculados = await prisma.usuarioRol.findMany({
    where:  { institucionId },
    select: { usuarioId: true },
  })
  const usuarioIds = usuariosVinculados.map(u => u.usuarioId)

  await prisma.usuarioRol.deleteMany({ where: { institucionId } })
  await prisma.sesion.deleteMany({ where: { institucionId } })

  // Borrar usuarios huérfanos (sin roles ni sesiones en ninguna institución)
  if (usuarioIds.length > 0) {
    await prisma.usuario.deleteMany({
      where: {
        id:       { in: usuarioIds },
        roles:    { none: {} },
        sesiones: { none: {} },
      },
    })
  }

  // 9. Institución
  await prisma.institucion.delete({ where: { id: institucionId } })
}

export { prisma }