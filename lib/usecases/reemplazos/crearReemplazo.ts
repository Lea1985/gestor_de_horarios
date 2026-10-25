// lib/usecases/reemplazos/crearReemplazo.ts
import { reemplazoRepository } from "@/lib/repositories/reemplazoRepository"
import { validarSuperposicionSuplente, obtenerAgenteQueSeReemplaza } from "./validarSuperposicion"
import { Causa } from "@prisma/client"
import {
  resolverClase,
  resolverEstadoYCausa,
  obtenerCondicionesVigentes,
} from "@/lib/services/resolucionClaseService"
export class DatosReemplazoInvalidosError extends Error {
  constructor() { super("claseId y asignacionTitularId son obligatorios") }
}
export class SuplenteRequeridoError extends Error {
  constructor() { super("Debe indicar agenteSuplenteId") }
}
export class ClaseNoEncontradaError extends Error {
  constructor() { super("Clase no encontrada o su incidencia está eliminada") }
}
export class ClaseNoVigenteError extends Error {
  constructor() {
    super("La clase ya no existe en el horario (asignación dada de baja o módulo quitado de la distribución): no admite reemplazo")
  }
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
  const clase = await reemplazoRepository.verificarClase(claseId, tenantId)
  if (!clase) throw new ClaseNoEncontradaError()
  // Clase muerta: se pregunta al motor (en vivo, no la causa guardada) si
  // la resolución da FIN_ASIGNACION o CAMBIO_DISTRIBUCION.
  const { causa } = resolverEstadoYCausa(await obtenerCondicionesVigentes(claseId, tenantId))
  if (causa === Causa.FIN_ASIGNACION || causa === Causa.CAMBIO_DISTRIBUCION) {
    throw new ClaseNoVigenteError()
  }
  if (!await reemplazoRepository.verificarAsignacion(asignacionTitularId, tenantId)) {
    throw new AsignacionTitularNoEncontradaError()
  }
  if (!await reemplazoRepository.verificarAgente(agenteSuplenteId, tenantId)) {
    throw new AgenteSuplenteNoEncontradoError()
  }
  // UX-REE-006: se chequea primero -- es el bloqueo más básico (la clase
  // ya tiene reemplazo activo), no depende de quién sea el suplente
  // propuesto. Antes iba al final, así que en un escenario de carrera
  // (dos solicitudes casi simultáneas) podía mostrarse "superposición"
  // en vez de esta causa, más específica y más fácil de explicar.
  if (await reemplazoRepository.verificarReemplazoActivo(claseId, tenantId)) {
    throw new ReemplazoActivoExistenteError()
  }
  const agenteQueSeReemplaza = await obtenerAgenteQueSeReemplaza(claseId, asignacionTitularId, tenantId)
  if (agenteQueSeReemplaza === agenteSuplenteId) {
    throw new AutoReemplazoError()
  }
  if (await validarSuperposicionSuplente(claseId, agenteSuplenteId, tenantId)) {
    throw new SuperposicionSuplenteError()
  }
  const reemplazo = await reemplazoRepository.crear(tenantId, {
    claseId,
    asignacionTitularId,
    agenteSuplenteId,
    // Sin incidenciaId en el cuerpo se toma el de la clase (bug 13). Si
    // llega uno, se usa tal cual (no se valida contra el de la clase).
    incidenciaId: incidenciaId ?? clase.incidenciaId,
    observacion,
  })
  await resolverClase(claseId, tenantId)
  return reemplazo
}