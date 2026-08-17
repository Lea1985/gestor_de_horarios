// lib/usecases/reemplazos/crearReemplazo.ts
import { reemplazoRepository } from "@/lib/repositories/reemplazoRepository"
import { validarSuperposicionSuplente, obtenerAgenteQueSeReemplaza } from "./validarSuperposicion"
import { resolverClase } from "@/lib/services/resolucionClaseService"
export class DatosReemplazoInvalidosError extends Error {
  constructor() { super("claseId y asignacionTitularId son obligatorios") }
}
export class SuplenteRequeridoError extends Error {
  constructor() { super("Debe indicar agenteSuplenteId") }
}
export class ClaseNoEncontradaError extends Error {
  constructor() { super("Clase no encontrada o su incidencia está eliminada") }
}
export class AsignacionTitularNoEncontradaError extends Error {
  constructor() { super("Asignación titular no encontrada") }
}
export class AgenteSuplenteNoEncontradoError extends Error {
  constructor() { super("Agente suplente no encontrado") }
}
export class ReemplazoActivoExistenteError extends Error {
  constructor() { super("Ya existe un reemplazo activo para esta clase") }
}
export class SuperposicionSuplenteError extends Error {
  constructor() { super("El suplente ya tiene una clase programada en ese módulo y fecha") }
}
export class AutoReemplazoError extends Error {
  constructor() { super("El agente suplente no puede reemplazar su propia ausencia") }
}
export async function crearReemplazo(
  tenantId: number,
  body: {
    claseId?:             number
    asignacionTitularId?: number
    agenteSuplenteId?:    number
    incidenciaId?:        number
    observacion?:         string
  }
) {
  const { claseId, asignacionTitularId, agenteSuplenteId, incidenciaId, observacion } = body
  if (!claseId || !asignacionTitularId) throw new DatosReemplazoInvalidosError()
  if (!agenteSuplenteId) throw new SuplenteRequeridoError()
  if (!await reemplazoRepository.verificarClase(claseId, tenantId)) {
    throw new ClaseNoEncontradaError()
  }
  if (!await reemplazoRepository.verificarAsignacion(asignacionTitularId, tenantId)) {
    throw new AsignacionTitularNoEncontradaError()
  }
  if (!await reemplazoRepository.verificarAgente(agenteSuplenteId, tenantId)) {
    throw new AgenteSuplenteNoEncontradoError()
  }
  const agenteQueSeReemplaza = await obtenerAgenteQueSeReemplaza(claseId, asignacionTitularId, tenantId)
  if (agenteQueSeReemplaza === agenteSuplenteId) {
    throw new AutoReemplazoError()
  }
  if (await validarSuperposicionSuplente(claseId, agenteSuplenteId, tenantId)) {
    throw new SuperposicionSuplenteError()
  }
  if (await reemplazoRepository.verificarReemplazoActivo(claseId, tenantId)) {
    throw new ReemplazoActivoExistenteError()
  }
  const reemplazo = await reemplazoRepository.crear(tenantId, {
    claseId,
    asignacionTitularId,
    agenteSuplenteId,
    incidenciaId,
    observacion,
  })
  await resolverClase(claseId, tenantId)
  return reemplazo
}