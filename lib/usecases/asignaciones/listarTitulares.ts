import { titularAsignacionRepository } from "@/lib/repositories/titularAsignacionRepository"
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export class AsignacionNoEncontradaError extends Error {
  constructor() {
    super("Asignación no encontrada")
  }
}

export async function listarTitulares(
  asignacionId: number,
  tenantId: number
) {
  const existe = await asignacionRepository.existeEnTenant(
    asignacionId,
    tenantId
  )

  if (!existe) {
    throw new AsignacionNoEncontradaError()
  }

  return titularAsignacionRepository.listar(asignacionId, tenantId)
}