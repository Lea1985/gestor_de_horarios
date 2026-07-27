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

  const periodoActivo = await prisma.periodoOperativo.update({
    where: { id: periodoId },
    data:  { estado: "ACTIVO" },
  })

  const distribuciones = await prisma.distribucionHoraria.findMany({
    where: {
      institucionId: tenantId,
      activo: true,
      estado: "ACTIVO",
      deletedAt: null,
      fecha_vigencia_desde: { lte: periodoActivo.fecha_hasta },
      OR: [
        { fecha_vigencia_hasta: null },
        { fecha_vigencia_hasta: { gte: periodoActivo.fecha_desde } },
      ],
    },
    include: {
      asignacion: { select: { id: true, unidadId: true, comisionId: true, identificadorEstructural: true } },
      _count: { select: { distribucionModulos: true } },
    },
  })

  let totalCreadas = 0
  const distribucionesSinModulos: { id: number; identificadorEstructural: string; version: number }[] = []

  for (const dist of distribuciones) {
    if (dist._count.distribucionModulos === 0) {
      distribucionesSinModulos.push({
        id: dist.id,
        identificadorEstructural: dist.asignacion.identificadorEstructural,
        version: dist.version,
      })
      continue
    }

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

  // Reconciliar TODAS las clases existentes de la institución contra el
  // nuevo rango vigente -- las que quedan fuera pasan a SUSPENDIDA por
  // PERIODO_OPERATIVO, y las que vuelven a caer adentro se revierten.
  const reconciliacion = await claseProgramadaService.reconciliarPorPeriodoOperativo({
    institucionId: tenantId,
    desde:         periodoActivo.fecha_desde,
    hasta:         periodoActivo.fecha_hasta,
  })

  return {
    periodo: periodoActivo,
    distribucionesProcesadas: distribuciones.length - distribucionesSinModulos.length,
    clasesCreadas: totalCreadas,
    distribucionesSinModulos,
    ...reconciliacion,
  }
}