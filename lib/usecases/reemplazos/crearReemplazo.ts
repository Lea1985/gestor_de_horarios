import { reemplazoRepository } from "@/lib/repositories/reemplazoRepository"

export class DatosReemplazoInvalidosError extends Error {
  constructor() { super("claseId, asignacionTitularId y asignacionSuplenteId son obligatorios") }
}

export class MismaAsignacionError extends Error {
  constructor() { super("La asignación titular y suplente no pueden ser la misma") }
}

export class ClaseNoEncontradaError extends Error {
  constructor() { super("Clase no encontrada") }
}

export class AsignacionTitularNoEncontradaError extends Error {
  constructor() { super("Asignación titular no encontrada") }
}

export class AsignacionSuplenteNoEncontradaError extends Error {
  constructor() { super("Asignación suplente no encontrada") }
}

export class ReemplazoActivoExistenteError extends Error {
  constructor() { super("Ya existe un reemplazo activo para esta clase") }
}

export async function crearReemplazo(tenantId: number, body: {
  claseId?:              number
  asignacionTitularId?:  number
  asignacionSuplenteId?: number
  observacion?:          string
}) {
  const { claseId, asignacionTitularId, asignacionSuplenteId, observacion } = body

  if (!claseId || !asignacionTitularId || !asignacionSuplenteId) {
    throw new DatosReemplazoInvalidosError()
  }

  if (asignacionTitularId === asignacionSuplenteId) throw new MismaAsignacionError()

  if (!await reemplazoRepository.verificarClase(claseId, tenantId)) {
    throw new ClaseNoEncontradaError()
  }

  const [titular, suplente] = await Promise.all([
    reemplazoRepository.verificarAsignacion(asignacionTitularId, tenantId),
    reemplazoRepository.verificarAsignacion(asignacionSuplenteId, tenantId),
  ])

  if (!titular)  throw new AsignacionTitularNoEncontradaError()
  if (!suplente) throw new AsignacionSuplenteNoEncontradaError()

  if (await reemplazoRepository.verificarReemplazoActivo(claseId)) {
    throw new ReemplazoActivoExistenteError()
  }

  return reemplazoRepository.crear({ claseId, asignacionTitularId, asignacionSuplenteId, observacion })
}