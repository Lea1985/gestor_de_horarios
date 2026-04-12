import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export class NombreObligatorioError extends Error {
  constructor() { super("nombre es obligatorio") }
}

export async function crearCodigario(tenantId: number, body: { nombre?: string; descripcion?: string }) {
  if (!body.nombre) throw new NombreObligatorioError()
  return codigarioRepository.crear(tenantId, body.nombre.trim().toUpperCase(), body.descripcion)
}