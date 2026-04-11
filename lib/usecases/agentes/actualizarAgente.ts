import { agenteRepository } from "@/lib/repositories/agenteRepository"

export class AgenteNoEncontradoError extends Error {
  constructor() { super("Agente no encontrado") }
}

export class SinCamposParaActualizarError extends Error {
  constructor() { super("No hay campos para actualizar") }
}

export async function actualizarAgente(agenteId: number, tenantId: number, body: {
  nombre?:    string
  apellido?:  string
  documento?: string
  email?:     string
  telefono?:  string
  domicilio?: string
}) {
  const existe = await agenteRepository.existeEnTenant(agenteId, tenantId)
  if (!existe) throw new AgenteNoEncontradoError()

  const campos = ["nombre", "apellido", "documento", "email", "telefono", "domicilio"]
  const tieneCampos = campos.some(c => body[c as keyof typeof body] !== undefined)
  if (!tieneCampos) throw new SinCamposParaActualizarError()

  return agenteRepository.actualizar(agenteId, tenantId, body)
}