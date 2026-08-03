// lib/usecases/periodosOperativos/cerrarPeriodo.ts
import prisma from "@/lib/prisma"
import { EstadoClase } from "@prisma/client"
import { resolverClase } from "@/lib/services/resolucionClaseService"

export class PeriodoNoEncontradoError extends Error {
  constructor() { super("Período no encontrado") }
}
export class PeriodoNoEsActivoError extends Error {
  constructor() { super("Solo se puede cerrar un período en estado ACTIVO") }
}

export async function cerrarPeriodo(tenantId: number, periodoId: number) {
  const periodo = await prisma.periodoOperativo.findFirst({
    where: { id: periodoId, institucionId: tenantId, deletedAt: null },
  })
  if (!periodo) throw new PeriodoNoEncontradoError()
  if (periodo.estado !== "ACTIVO") throw new PeriodoNoEsActivoError()

  // Resolvemos las PROGRAMADA de este rango ANTES de cerrar el período,
  // mientras el motor todavía lo ve como vigente: las que ya pasaron
  // (fecha <= hoy) quedan DICTADA, las futuras quedan sin cambios (van a
  // resolverse solas más adelante, ej. cuando se active un período nuevo
  // y reconciliarPorPeriodoOperativo las alcance).
  const idsARevisar = (
    await prisma.claseProgramada.findMany({
      where: {
        institucionId: tenantId,
        estado: EstadoClase.PROGRAMADA,
        fecha: { gte: periodo.fecha_desde, lte: periodo.fecha_hasta },
      },
      select: { id: true },
    })
  ).map(c => c.id)

  let clasesMarcadasDictadas = 0
  for (const claseId of idsARevisar) {
    const r = await resolverClase(claseId, tenantId)
    if (r.estado === EstadoClase.DICTADA) clasesMarcadasDictadas++
  }

  const periodoCerrado = await prisma.periodoOperativo.update({
    where: { id: periodoId },
    data:  { estado: "CERRADO" },
  })

  return { periodo: periodoCerrado, clasesMarcadasDictadas }
}