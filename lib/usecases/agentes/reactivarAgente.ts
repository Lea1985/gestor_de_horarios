import { agenteRepository } from "@/lib/repositories/agenteRepository"

export class AgenteNoEncontradoError extends Error {
  constructor() { super("Agente no encontrado") }
}

export async function reactivarAgente(agenteId: number, tenantId: number) {
  const existe = await agenteRepository.existeEliminado(agenteId, tenantId)
  if (!existe) throw new AgenteNoEncontradoError()

  await agenteRepository.reactivar(agenteId, tenantId)
  return { ok: true }
}