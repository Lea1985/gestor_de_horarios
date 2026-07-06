import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export class CodigarioNoEncontradoError extends Error {
  constructor() {
    super("Codigario no encontrado")
  }
}

export class CodigarioConItemsError extends Error {
  constructor() {
    super("No se puede eliminar el codigario porque posee items asociados")
  }
}

export async function eliminarCodigario(id: number, tenantId: number) {
  const existe = await codigarioRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    throw new CodigarioNoEncontradoError()
  }

  const tieneItems = await codigarioRepository.tieneItems(id, tenantId)

  if (tieneItems) {
    throw new CodigarioConItemsError()
  }

  await codigarioRepository.eliminar(id, tenantId)

  return { ok: true }
}