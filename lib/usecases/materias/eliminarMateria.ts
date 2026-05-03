// lib/usecases/materias/eliminarMateria.ts
import { materiaRepository } from "@/lib/repositories/materiaRepository"

export class MateriaNoEncontradaError extends Error {
  constructor() {
    super("Materia no encontrada")
  }
}

export async function eliminarMateria(
  id: number,
  tenantId: number
) {
  const existe = await materiaRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    throw new MateriaNoEncontradaError()
  }

  // ✅ FIX: pasar tenantId para mantener consistencia multi-tenant
  await materiaRepository.eliminar(id, tenantId)

  return {
    ok: true,
  }
}