// lib/usecases/modulosHorarios/obtenerModulo.ts

import { moduloHorarioRepository } from "@/lib/repositories/moduloHorarioRepository"

export class ModuloNoEncontradoError extends Error {
  constructor() { super("Módulo no encontrado") }
}

export async function obtenerModulo(id: number, tenantId: number) {
  const modulo = await moduloHorarioRepository.obtenerPorId(id, tenantId)
  if (!modulo) throw new ModuloNoEncontradoError()
  return modulo
}