import { agenteRepository } from "@/lib/repositories/agenteRepository"

export class DatosAgenteInvalidosError extends Error {
  constructor() { super("nombre, apellido y documento son requeridos") }
}

export async function crearAgente(tenantId: number, body: {
  nombre?:    string
  apellido?:  string
  documento?: string
  email?:     string
  telefono?:  string
  domicilio?: string
}) {
  const { nombre, apellido, documento, email, telefono, domicilio } = body

  if (!nombre || !apellido || !documento) {
    throw new DatosAgenteInvalidosError()
  }

  return agenteRepository.crear({
    nombre,
    apellido,
    documento: String(documento).trim(),
    email:     email     ?? null,
    telefono:  telefono  ?? null,
    domicilio: domicilio ?? null,
    tenantId,
  })
}