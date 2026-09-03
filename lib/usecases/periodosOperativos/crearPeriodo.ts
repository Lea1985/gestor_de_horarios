// lib/usecases/periodosOperativos/crearPeriodo.ts
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
export class DatosPeriodoInvalidosError extends Error {
  constructor() { super("nombre, fecha_desde y fecha_hasta son requeridos") }
}
export class FechasInvalidasError extends Error {
  constructor() { super("fecha_desde debe ser menor a fecha_hasta") }
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
export async function crearPeriodo(tenantId: number, body: {
  nombre?:      string
  fecha_desde?: Date | string
  fecha_hasta?: Date | string
}) {
  const { nombre, fecha_desde, fecha_hasta } = body
  if (!nombre || !fecha_desde || !fecha_hasta) {
    throw new DatosPeriodoInvalidosError()
  }
  const desde = new Date(fecha_desde)
  const hasta = new Date(fecha_hasta)
  if (desde >= hasta) {
    throw new FechasInvalidasError()
  }
  // UX-PER-008: mismo chequeo que ya existe para Incidencia -- sin esto se
  // pueden crear períodos con fechas superpuestas sin ningún aviso.
  const solapado = await periodoOperativoRepository.verificarSuperposicion(tenantId, desde, hasta)
  if (solapado) {
    throw new SuperposicionPeriodoError(solapado.id, solapado.nombre, solapado.fecha_desde, solapado.fecha_hasta)
  }
  // Todo período nuevo nace en BORRADOR (default del repositorio).
  // Pasar a ACTIVO es una transición explícita vía activarPeriodo(),
  // nunca un flag que se setea en la creación.
  return periodoOperativoRepository.crear({
    tenantId,
    nombre,
    fecha_desde: desde,
    fecha_hasta: hasta,
  })
}