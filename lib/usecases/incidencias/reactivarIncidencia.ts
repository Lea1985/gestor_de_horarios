// lib/usecases/incidencias/reactivarIncidencia.ts
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"
import { resolverClasesIncidencia } from "./resolverClasesIncidencia"

export class IncidenciaNoEncontradaError extends Error {
  constructor() { super("Incidencia no encontrada") }
}
export class SuperposicionError extends Error {
  constructor() { super("Existe otra incidencia activa que se superpone en ese período") }
}
export class FechaPasadaError extends Error {
  constructor() { super("No se puede reactivar una incidencia cuyo período ya finalizó") }
}

export async function reactivarIncidencia(id: number, tenantId: number) {
  const existente = await incidenciaRepository.existeEliminada(id, tenantId)
  if (!existente) throw new IncidenciaNoEncontradaError()

  // Regla 3: no reactivar si el rango ya pasó
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  if (existente.fecha_hasta < hoy) throw new FechaPasadaError()

  // Regla 4: no reactivar si hay superposición con otra incidencia activa
  const superposicion = await incidenciaRepository.verificarSuperposicion(
    existente.asignacionId,
    existente.fecha_desde,
    existente.fecha_hasta,
    tenantId,
    id,
  )
  if (superposicion) throw new SuperposicionError()

  await incidenciaRepository.reactivar(id)
  await resolverClasesIncidencia(id, tenantId)
  return { ok: true }
}