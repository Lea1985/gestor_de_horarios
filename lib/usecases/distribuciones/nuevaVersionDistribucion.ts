// lib/usecases/distribuciones/nuevaVersionDistribucion.ts
import prisma from "@/lib/prisma"
import { claseProgramadaRepository } from "@/lib/repositories/claseProgramadaRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { generarClases } from "@/lib/helpers/clases"

export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}

export class SinPeriodoOperativoError extends Error {
  constructor() { super("No hay período operativo vigente. Establecé uno antes de crear una nueva versión.") }
}

export async function nuevaVersionDistribucion(
  distribucionId: number,
  tenantId: number,
) {
  // 1. Obtener distribución actual con asignación y módulos
  const actual = await prisma.distribucionHoraria.findFirst({
    where: { id: distribucionId, institucionId: tenantId, deletedAt: null },
    include: {
      asignacion: { select: { id: true, unidadId: true, comisionId: true } },
      distribucionModulos: { include: { moduloHorario: true } },
    },
  })
  if (!actual) throw new DistribucionNoEncontradaError()

  // 2. Obtener período operativo vigente
  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)
  if (!periodo) throw new SinPeriodoOperativoError()

  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)

  const ayerFin = new Date(hoy)
  ayerFin.setUTCDate(ayerFin.getUTCDate() - 1)
  ayerFin.setUTCHours(23, 59, 59, 999)

  const hasta = new Date(periodo.fecha_hasta)
  hasta.setUTCHours(23, 59, 59, 999)

  // 3. Marcar SUSPENDIDA las clases PROGRAMADAS futuras (dentro del período)
  await claseProgramadaRepository.suspenderFuturas(
    actual.asignacion.id,
    hoy,
    hasta
  )

  // 4. Cerrar la distribución actual
  await prisma.distribucionHoraria.update({
    where: { id: distribucionId },
    data: {
      fecha_vigencia_hasta: ayerFin,
      estado:               "INACTIVO",
      activo:               false,
    },
  })

  // 5. Calcular nueva versión
  const ultima = await prisma.distribucionHoraria.findFirst({
    where:   { asignacionId: actual.asignacionId },
    orderBy: { version: "desc" },
    select:  { version: true },
  })
  const nuevaVersion = (ultima?.version ?? 0) + 1

  // 6. Crear nueva distribución sin módulos
  const nueva = await prisma.distribucionHoraria.create({
    data: {
      institucionId:        tenantId,
      asignacionId:         actual.asignacionId,
      version:              nuevaVersion,
      fecha_vigencia_desde: hoy,
      estado:               "ACTIVO",
    },
  })

  return {
    ok:             true,
    nuevaVersionId: nueva.id,
    version:        nuevaVersion,
  }
}