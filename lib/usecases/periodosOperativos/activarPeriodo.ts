// lib/usecases/periodosOperativos/activarPeriodo.ts
import prisma from "@/lib/prisma"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"

export class PeriodoNoEncontradoError extends Error {
  constructor() { super("El período a activar no existe o no pertenece a la institución") }
}
export class PeriodoNoEsBorradorError extends Error {
  constructor() { super("Solo se puede activar un período en estado BORRADOR") }
}
export class YaHayPeriodoActivoError extends Error {
  constructor(public readonly periodoActivoId: number, public readonly nombre: string) {
    super(`Ya existe un período ACTIVO ("${nombre}"). Cerralo antes de activar uno nuevo.`)
  }
}

export async function activarPeriodo(tenantId: number, periodoId: number) {
  const periodo = await prisma.periodoOperativo.findFirst({
    where: { id: periodoId, institucionId: tenantId, deletedAt: null },
  })
  if (!periodo) throw new PeriodoNoEncontradoError()
  if (periodo.estado !== "BORRADOR") throw new PeriodoNoEsBorradorError()

  const activoExistente = await prisma.periodoOperativo.findFirst({
    where: { institucionId: tenantId, estado: "ACTIVO", deletedAt: null },
  })
  if (activoExistente) {
    throw new YaHayPeriodoActivoError(activoExistente.id, activoExistente.nombre)
  }

  // 1. Activar el período (una sola escritura; el índice único parcial en DB
  //    garantiza que nunca haya dos ACTIVO aunque haya una carrera de requests)
  const periodoActivo = await prisma.periodoOperativo.update({
    where: { id: periodoId },
    data:  { estado: "ACTIVO" },
  })

  // 2. Recorrer distribuciones cuyo rango se solape con el nuevo período
  const distribuciones = await prisma.distribucionHoraria.findMany({
    where: {
      institucionId: tenantId,
      activo: true,
      deletedAt: null,
      fecha_vigencia_desde: { lte: periodoActivo.fecha_hasta },
      OR: [
        { fecha_vigencia_hasta: null },
        { fecha_vigencia_hasta: { gte: periodoActivo.fecha_desde } },
      ],
    },
    include: { asignacion: { select: { id: true, unidadId: true, comisionId: true } } },
  })

  let totalCreadas = 0
  for (const dist of distribuciones) {
    // El rango real a generar es la intersección [dist.desde, periodo.hasta] —
    // nunca antes del inicio de la distribución ni después del fin del período.
    const desde = dist.fecha_vigencia_desde > periodoActivo.fecha_desde
      ? dist.fecha_vigencia_desde
      : periodoActivo.fecha_desde

    const { creadas } = await claseProgramadaService.generarParaRango({
      institucionId:  tenantId,
      asignacionId:   dist.asignacion.id,
      unidadId:       dist.asignacion.unidadId,
      comisionId:     dist.asignacion.comisionId,
      distribucionId: dist.id,
      periodoId:      periodoActivo.id,
      desde,
      hasta: periodoActivo.fecha_hasta,
    })
    totalCreadas += creadas
  }

  return { periodo: periodoActivo, distribucionesProcesadas: distribuciones.length, clasesCreadas: totalCreadas }
}
