// lib/usecases/periodosOperativos/cerrarPeriodo.ts
import prisma from "@/lib/prisma"
import { EstadoClase, Causa } from "@prisma/client"
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

  // Cerramos PRIMERO: el motor tiene que ver que este período ya no está
  // vigente al resolver las clases residuales, para decidir bien entre
  // DICTADA (fecha ya pasada) y SUSPENDIDA/PERIODO_OPERATIVO (fecha futura).
  const periodoCerrado = await prisma.periodoOperativo.update({
    where: { id: periodoId },
    data:  { estado: "CERRADO" },
  })

  let clasesMarcadasDictadas = 0
  let clasesSuspendidasPorPeriodo = 0
  for (const claseId of idsARevisar) {
    const r = await resolverClase(claseId, tenantId)
    if (r.estado === EstadoClase.DICTADA) clasesMarcadasDictadas++
    if (r.causa === Causa.PERIODO_OPERATIVO) clasesSuspendidasPorPeriodo++
  }

  return { periodo: periodoCerrado, clasesMarcadasDictadas, clasesSuspendidasPorPeriodo }
}