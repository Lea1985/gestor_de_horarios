// lib/usecases/periodosOperativos/actualizarPeriodo.ts
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
export class PeriodoNoEncontradoError extends Error {
  constructor() { super("Período no encontrado o no pertenece a la institución") }
}
export class FechasInvalidasError extends Error {
  constructor() { super("fecha_desde debe ser menor a fecha_hasta") }
}
export class PeriodoCerradoError extends Error {
  constructor() { super("El período está CERRADO y no admite modificaciones") }
}
export class CampoEstructuralEnPeriodoActivoError extends Error {
  constructor(campos: string[]) {
    super(`No se pueden modificar campos estructurales (${campos.join(", ")}) con el período ACTIVO`)
  }
}
export class SuperposicionPeriodoError extends Error {
  constructor(
    public readonly periodoId: number,
    nombre: string,
    fecha_desde: Date,
    fecha_hasta: Date,
  ) {
    super(
      `Las fechas se superponen con el período "${nombre}" (${fecha_desde.toISOString().slice(0, 10)} → ${fecha_hasta.toISOString().slice(0, 10)}).`
    )
  }
}
const CAMPOS_ESTRUCTURALES = ["fecha_desde", "fecha_hasta"] as const
export async function actualizarPeriodo(
  periodoId: number,
  tenantId: number,
  data: { nombre?: string; fecha_desde?: Date | string; fecha_hasta?: Date | string }
) {
  const periodoActual = await periodoOperativoRepository.obtenerPorId(periodoId, tenantId, true)
  if (!periodoActual) throw new PeriodoNoEncontradoError()
  if (periodoActual.estado === "CERRADO") throw new PeriodoCerradoError()
  if (periodoActual.estado === "ACTIVO") {
    const camposTocados = CAMPOS_ESTRUCTURALES.filter(c => data[c] !== undefined)
    if (camposTocados.length > 0) {
      throw new CampoEstructuralEnPeriodoActivoError(camposTocados)
    }
    // En ACTIVO solo se permite tocar `nombre` (dato administrativo).
  }
  // Fechas efectivas tras el update (las que no cambian quedan en su valor actual).
  let nuevaDesde = periodoActual.fecha_desde
  let nuevaHasta = periodoActual.fecha_hasta
  if (data.fecha_desde !== undefined) nuevaDesde = new Date(data.fecha_desde)
  if (data.fecha_hasta !== undefined) nuevaHasta = new Date(data.fecha_hasta)
  if (data.fecha_desde !== undefined || data.fecha_hasta !== undefined) {
    if (nuevaDesde >= nuevaHasta) throw new FechasInvalidasError()
    // UX-PER-008: solo hace falta chequear superposición si las fechas
    // realmente cambian (en ACTIVO ya está bloqueado más arriba; en
    // CERRADO ya se tiró antes).
    const solapado = await periodoOperativoRepository.verificarSuperposicion(tenantId, nuevaDesde, nuevaHasta, periodoId)
    if (solapado) {
      throw new SuperposicionPeriodoError(solapado.id, solapado.nombre, solapado.fecha_desde, solapado.fecha_hasta)
    }
  }
  const updateData: { nombre?: string; fecha_desde?: Date; fecha_hasta?: Date } = {}
  if (data.nombre !== undefined)      updateData.nombre = data.nombre
  if (data.fecha_desde !== undefined) updateData.fecha_desde = nuevaDesde
  if (data.fecha_hasta !== undefined) updateData.fecha_hasta = nuevaHasta
  return periodoOperativoRepository.actualizar(periodoId, tenantId, updateData)
}