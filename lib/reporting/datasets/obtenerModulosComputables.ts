// lib/reporting/datasets/obtenerModulosComputables.ts
import prisma from "@/lib/prisma"

export type DetalleClaseComputable = {
  claseId: number
  fecha: Date
  asignacionId: number
  incidenciaId: number | null
  codigarioItemCodigo: string | null
  codigarioItemNombre: string | null
  porcentajeComputable: number
}

export type ResultadoModulosComputables = {
  agenteId: number
  periodo: { desde: Date; hasta: Date }
  totalClases: number
  totalModulosComputables: number
  detalle: DetalleClaseComputable[]
}

/**
 * Módulos computables de un docente en un período: clases sin incidencia
 * computan 100%, clases con incidencia computan el porcentajeComputable
 * del CodigarioItem asociado. El resultado es una suma ponderada, no un
 * conteo de clases.
 *
 * Resuelve las clases del docente respetando el historial de titularidad
 * (TitularAsignacion): un agente puede haber ocupado distintos cargos
 * (asignaciones) en distintos tramos dentro del mismo período.
 */
export async function obtenerModulosComputables(
  tenantId: number,
  agenteId: number,
  periodo: { desde: Date; hasta: Date }
): Promise<ResultadoModulosComputables> {
  // 1. Tramos de titularidad del agente que se solapan con el período pedido.
  const titularidades = await prisma.titularAsignacion.findMany({
    where: {
      institucionId: tenantId,
      agenteId,
      deletedAt: null,
      fecha_desde: { lte: periodo.hasta },
      OR: [
        { fecha_hasta: null },
        { fecha_hasta: { gte: periodo.desde } },
      ],
    },
    select: { asignacionId: true, fecha_desde: true, fecha_hasta: true },
  })

  if (titularidades.length === 0) {
    return {
      agenteId,
      periodo,
      totalClases: 0,
      totalModulosComputables: 0,
      detalle: [],
    }
  }

  // 2. Para cada tramo, el rango efectivo es la intersección entre el
  //    período pedido y la vigencia del titular en ese cargo.
  const clasesPorTramo = await Promise.all(
    titularidades.map(t => {
      const desdeTramo = t.fecha_desde > periodo.desde ? t.fecha_desde : periodo.desde
      const hastaTramo = t.fecha_hasta && t.fecha_hasta < periodo.hasta ? t.fecha_hasta : periodo.hasta
      return prisma.claseProgramada.findMany({
        where: {
          institucionId: tenantId,
          asignacionId: t.asignacionId,
          fecha: { gte: desdeTramo, lte: hastaTramo },
        },
        select: {
          id: true,
          fecha: true,
          asignacionId: true,
          incidenciaId: true,
          incidencia: {
            select: {
              codigarioItem: {
                select: { codigo: true, nombre: true, porcentajeComputable: true },
              },
            },
          },
        },
        orderBy: { fecha: "asc" },
      })
    })
  )

  const clases = clasesPorTramo.flat()

  const detalle: DetalleClaseComputable[] = clases.map(c => {
    const porcentajeComputable = c.incidencia?.codigarioItem?.porcentajeComputable ?? 100
    return {
      claseId: c.id,
      fecha: c.fecha,
      asignacionId: c.asignacionId,
      incidenciaId: c.incidenciaId,
      codigarioItemCodigo: c.incidencia?.codigarioItem?.codigo ?? null,
      codigarioItemNombre: c.incidencia?.codigarioItem?.nombre ?? null,
      porcentajeComputable,
    }
  })

  const totalModulosComputablesCrudo = detalle.reduce(
    (acc, d) => acc + d.porcentajeComputable / 100,
    0
  )
  // Redondeo a 2 decimales para evitar ruido de punto flotante (ej. 3.8500000000000005).
  const totalModulosComputables = Math.round(totalModulosComputablesCrudo * 100) / 100

  return {
    agenteId,
    periodo,
    totalClases: detalle.length,
    totalModulosComputables,
    detalle,
  }
}