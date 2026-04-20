// tests/helpers/cleanup.ts
// Orden estricto de FK:
// Reemplazo → ClaseProgramada → Incidencia → HorarioAsignado
// → DistribucionModulo → DistribucionHoraria → Asignacion
// → AgenteInstitucion → Agente
// → UnidadOrganizativa
// → ModuloHorario
// → CodigarioItem → Codigario
// → UsuarioRol → Sesion → Usuario

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ── Limpieza completa de una asignación y todo lo que cuelga de ella ──────────
export async function cleanupAsignacion(asignacionId: number) {
  // 1. Reemplazos (FK → ClaseProgramada)
  await prisma.reemplazo.deleteMany({
    where: { clase: { asignacionId } },
  })

  // 2. Clases programadas
  await prisma.claseProgramada.deleteMany({ where: { asignacionId } })

  // 3. Incidencias
  await prisma.incidencia.deleteMany({ where: { asignacionId } })

  // 4. HorarioAsignado
  await prisma.horarioAsignado.deleteMany({ where: { asignacionId } })

  // 5. DistribucionModulo → DistribucionHoraria
  const dists = await prisma.distribucionHoraria.findMany({
    where: { asignacionId },
    select: { id: true },
  })

  for (const d of dists) {
    await prisma.horarioAsignado.deleteMany({
      where: { distribucionHorariaId: d.id },
    })

    await prisma.distribucionModulo.deleteMany({
      where: { distribucionHorariaId: d.id },
    })
  }

  await prisma.distribucionHoraria.deleteMany({ where: { asignacionId } })

  // 6. Asignación
  await prisma.asignacion.deleteMany({ where: { id: asignacionId } })
}

export async function cleanupClases(asignacionId: number) {
  await prisma.reemplazo.deleteMany({ where: { clase: { asignacionId } } })
  await prisma.claseProgramada.deleteMany({ where: { asignacionId } })
}

export async function cleanupDistribucion(distribucionId: number) {
  await prisma.horarioAsignado.deleteMany({
    where: { distribucionHorariaId: distribucionId },
  })

  await prisma.distribucionModulo.deleteMany({
    where: { distribucionHorariaId: distribucionId },
  })

  await prisma.distribucionHoraria.deleteMany({
    where: { id: distribucionId },
  })
}

export async function cleanupUnidad(unidadId: number) {
  // 🔥 limpiar asignaciones que dependan de la unidad
  const asignaciones = await prisma.asignacion.findMany({
    where: { unidadId },
    select: { id: true },
  })

  for (const a of asignaciones) {
    await cleanupAsignacion(a.id)
  }

  await prisma.unidadOrganizativa.deleteMany({
    where: { id: unidadId },
  })
}

export async function cleanupAgente(agenteId: number) {
  await prisma.agenteInstitucion.deleteMany({ where: { agenteId } })
  await prisma.agente.deleteMany({ where: { id: agenteId } })
}

// Limpia agente por documento incluyendo todas sus asignaciones
export async function cleanupAgenteByDocumento(
  documento: string,
  institucionId = 1
) {
  const agente = await prisma.agente.findFirst({
    where: { documento },
  })

  if (!agente) return

  const asigs = await prisma.asignacion.findMany({
    where: { agenteId: agente.id, institucionId },
    select: { id: true },
  })

  for (const a of asigs) {
    await cleanupAsignacion(a.id)
  }

  await cleanupAgente(agente.id)
}

export async function cleanupCodigario(codigarioId: number) {
  await prisma.codigarioItem.deleteMany({ where: { codigarioId } })
  await prisma.codigario.deleteMany({ where: { id: codigarioId } })
}

export async function cleanupModulo(moduloId: number) {
  await prisma.horarioAsignado.deleteMany({
    where: { moduloHorarioId: moduloId },
  })

  await prisma.distribucionModulo.deleteMany({
    where: { moduloHorarioId: moduloId },
  })

  await prisma.moduloHorario.deleteMany({
    where: { id: moduloId },
  })
}

export async function cleanupUsuario(
  usuarioId: number,
  institucionId: number
) {
  await prisma.usuarioRol.deleteMany({
    where: { usuarioId, institucionId },
  })

  await prisma.sesion.deleteMany({
    where: { usuarioId },
  })

  await prisma.usuario.deleteMany({
    where: { id: usuarioId },
  })
}

// 🔥 CORREGIDO (este era el bug principal)
export async function cleanupUnidadByCodigo(
  codigoUnidad: number,
  institucionId = 1
) {
  const unidad = await prisma.unidadOrganizativa.findFirst({
    where: { codigoUnidad, institucionId },
  })

  if (!unidad) return

  // 🔥 limpiar asignaciones primero
  const asignaciones = await prisma.asignacion.findMany({
    where: { unidadId: unidad.id },
    select: { id: true },
  })

  for (const a of asignaciones) {
    await cleanupAsignacion(a.id)
  }

  // 🔥 ahora sí borrar unidad
  await prisma.unidadOrganizativa.deleteMany({
    where: { id: unidad.id },
  })
}

export async function disconnectPrisma() {
  await prisma.$disconnect()
}