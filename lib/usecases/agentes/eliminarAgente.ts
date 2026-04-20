import { agenteRepository } from "@/lib/repositories/agenteRepository"

export class AgenteNoEncontradoError extends Error {
  constructor() { super("Agente no encontrado") }
}

export async function eliminarAgente(agenteId: number, tenantId: number) {
  const existe = await agenteRepository.existeEnTenant(agenteId, tenantId)
  if (!existe) throw new AgenteNoEncontradoError()

  await agenteRepository.eliminar(agenteId,tenantId)
  return { ok: true }
}