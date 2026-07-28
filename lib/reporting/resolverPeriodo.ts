// lib/reporting/resolverPeriodo.ts
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class PeriodoInvalidoError extends Error {
  constructor(msg: string) { super(msg) }
}

export type ParametrosPeriodo =
  | { modo: "mes"; mes: number; anio: number }
  | { modo: "periodoOperativo"; periodoOperativoId: number }
  | { modo: "rango"; desde: Date; hasta: Date }

/**
 * Resuelve un período pedido en cualquiera de sus tres formas soportadas
 * a un rango concreto {desde, hasta}. Usado por los reportes que necesitan
 * un período flexible (ej. módulos computables).
 */
export async function resolverPeriodo(
  tenantId: number,
  params: ParametrosPeriodo
): Promise<{ desde: Date; hasta: Date }> {
  if (params.modo === "mes") {
    const { mes, anio } = params
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new PeriodoInvalidoError("mes debe ser un entero entre 1 y 12")
    }
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new PeriodoInvalidoError("anio inválido")
    }
    const desde = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0, 0))
    const hasta = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999))
    return { desde, hasta }
  }

  if (params.modo === "periodoOperativo") {
    const periodo = await periodoOperativoRepository.obtenerPorId(params.periodoOperativoId, tenantId)
    if (!periodo) throw new PeriodoInvalidoError("PeriodoOperativo no encontrado")
    return { desde: periodo.fecha_desde, hasta: periodo.fecha_hasta }
  }

  // rango arbitrario
  const { desde, hasta } = params
  if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
    throw new PeriodoInvalidoError("Fechas inválidas")
  }
  if (desde.getTime() > hasta.getTime()) {
    throw new PeriodoInvalidoError("desde no puede ser posterior a hasta")
  }
  return { desde, hasta }
}