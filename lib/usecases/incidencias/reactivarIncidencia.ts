// lib/usecases/incidencias/reactivarIncidencia.ts
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"
import { resolverClasesIncidencia } from "./resolverClasesIncidencia"
import { hoyLocal } from "@/lib/helpers/fechaInstitucion"
import {
  IncidenciaDuplicadaError,
  IncidenciaPadreNoValidaError,
  FechaFueraDePadreError,
  esIncidenciaDuplicada,
} from "./crearIncidencia"

export { IncidenciaDuplicadaError, IncidenciaPadreNoValidaError, FechaFueraDePadreError }

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
  const hoy = hoyLocal()
  if (existente.fecha_hasta < hoy) throw new FechaPasadaError()

  // Una hija solo vuelve dentro de una padre viva que la siga conteniendo
  // (mismas reglas que al crearla).
  let ancestros: number[] | undefined
  if (existente.incidenciaPadreId) {
    const padre = await incidenciaRepository.verificarPadre(
      existente.incidenciaPadreId, existente.asignacionId, tenantId
    )
    if (!padre) throw new IncidenciaPadreNoValidaError()
    if (existente.fecha_desde < padre.fecha_desde || existente.fecha_hasta > padre.fecha_hasta) {
      throw new FechaFueraDePadreError()
    }
    ancestros = await incidenciaRepository.obtenerAncestros(existente.incidenciaPadreId, tenantId)
  }

  // Regla 4: no reactivar si hay superposición con otra incidencia activa
  // (la cadena de ancestros no cuenta, como al crear).
  const superposicion = await incidenciaRepository.verificarSuperposicion(
    existente.asignacionId,
    existente.fecha_desde,
    existente.fecha_hasta,
    tenantId,
    id,
    ancestros,
  )
  if (superposicion) throw new SuperposicionError()

  try {
    await incidenciaRepository.reactivar(id)
  } catch (error) {
    if (esIncidenciaDuplicada(error)) throw new IncidenciaDuplicadaError()
    throw error
  }
  await resolverClasesIncidencia(id, tenantId)
  return { ok: true }
}