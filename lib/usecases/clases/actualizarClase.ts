// lib/usecases/clases/actualizarClase.ts
import { claseProgramadaRepository } from "@/lib/repositories/claseProgramadaRepository"
import { resolverClase } from "@/lib/services/resolucionClaseService"

export class ClaseNoEncontradaError extends Error {
  constructor() { super("Clase no encontrada") }
}

export class SinCamposError extends Error {
  constructor() { super("Se requiere al menos: incidenciaId") }
}

export class IncidenciaInvalidaError extends Error {
  constructor() { super("Incidencia no encontrada o no pertenece a la asignación de esta clase") }
}

// El estado de una ClaseProgramada es responsabilidad exclusiva del motor
// de resolución (resolucionClaseService.resolverClase). Este usecase ya NO
// acepta "estado" -- se sacó tras confirmar que era un bypass sin ningún
// consumidor real (ver punto-de-partida-clase-programada-2026-07-27.md).
// Si en el futuro aparece una necesidad real de forzar un estado manual,
// eso requiere extender el motor para que reconozca una causa MANUAL como
// estado terminal (igual que ya hace con DICTADA) -- no volver a escribir
// estado directo acá.
export async function actualizarClase(id: number, tenantId: number, body: {
  incidenciaId?: number | null
}) {
  const { incidenciaId } = body

  if (incidenciaId === undefined) throw new SinCamposError()

  const existente = await claseProgramadaRepository.existeEnTenant(id, tenantId)
  if (!existente) throw new ClaseNoEncontradaError()

  if (incidenciaId) {
    const incidencia = await claseProgramadaRepository.verificarIncidencia(incidenciaId, existente.asignacionId)
    if (!incidencia) throw new IncidenciaInvalidaError()
  }

  await claseProgramadaRepository.actualizar(id, { incidenciaId })

  // Vincular o desvincular una incidencia cambia las condiciones vigentes
  // de la clase -- el motor decide el estado/causa resultante.
  await resolverClase(id, tenantId)

  // Releer después de resolverClase: estado/causa/versionResolucion pueden
  // haber cambiado como consecuencia del vínculo, y el caller necesita ver
  // el estado real, no el que había antes de resolver.
  return claseProgramadaRepository.actualizar(id, {})
}