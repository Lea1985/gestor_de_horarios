import { claseRepository } from "@/lib/repositories/claseRepository"
import { EstadoClase } from "@prisma/client"

export class ClaseNoEncontradaError extends Error {
  constructor() { super("Clase no encontrada") }
}

export class SinCamposError extends Error {
  constructor() { super("Se requiere al menos: estado o incidenciaId") }
}

export class EstadoInvalidoError extends Error {
  constructor(estados: string[]) { super(`Estado inválido. Válidos: ${estados.join(", ")}`) }
}

export class IncidenciaInvalidaError extends Error {
  constructor() { super("Incidencia no encontrada o no pertenece a la asignación de esta clase") }
}

const ESTADOS_VALIDOS = Object.values(EstadoClase)

export async function actualizarClase(id: number, tenantId: number, body: {
  estado?:       string
  incidenciaId?: number | null
}) {
  const { estado, incidenciaId } = body

  if (estado === undefined && incidenciaId === undefined) throw new SinCamposError()
  if (estado && !ESTADOS_VALIDOS.includes(estado as EstadoClase)) {
    throw new EstadoInvalidoError(ESTADOS_VALIDOS)
  }

  const existente = await claseRepository.existeEnTenant(id, tenantId)
  if (!existente) throw new ClaseNoEncontradaError()

  if (incidenciaId) {
    const incidencia = await claseRepository.verificarIncidencia(incidenciaId, existente.asignacionId)
    if (!incidencia) throw new IncidenciaInvalidaError()
  }

  const data: Partial<{ estado: EstadoClase; incidenciaId: number | null }> = {}
  if (estado       !== undefined) data.estado       = estado as EstadoClase
  if (incidenciaId !== undefined) data.incidenciaId = incidenciaId

  return claseRepository.actualizar(id, data)
}