import { agenteRepository } from "@/lib/repositories/agenteRepository"

export class AgenteNoEncontradoError extends Error {
  constructor() { super("Agente no encontrado") }
}

export async function obtenerAgente(agenteId: number, tenantId: number) {
  const registro = await agenteRepository.obtenerPorId(agenteId, tenantId)
  if (!registro) throw new AgenteNoEncontradoError()
  return registro
}