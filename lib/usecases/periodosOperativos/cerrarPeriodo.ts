// lib/usecases/periodosOperativos/cerrarPeriodo.ts
import prisma from "@/lib/prisma"
import { EstadoClase } from "@prisma/client"

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

  return prisma.$transaction(async (tx) => {
    // Decisión de negocio: las PROGRAMADA residuales de este período pasan
    // a DICTADA automáticamente al cerrar (se asume que el período ya
    // terminó en el calendario real). No toca SUSPENDIDA ni REEMPLAZADA:
    // esas ya reflejan un estado explícito que no queremos pisar.
    const clasesActualizadas = await tx.claseProgramada.updateMany({
      where: {
        institucionId: tenantId,
        estado: EstadoClase.PROGRAMADA,
        fecha: { gte: periodo.fecha_desde, lte: periodo.fecha_hasta },
      },
      data: { estado: EstadoClase.DICTADA },
    })

    const periodoCerrado = await tx.periodoOperativo.update({
      where: { id: periodoId },
      data:  { estado: "CERRADO" },
    })

    return { periodo: periodoCerrado, clasesMarcadasDictadas: clasesActualizadas.count }
  })
}
