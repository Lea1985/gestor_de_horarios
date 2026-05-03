// lib/usecases/materias/actualizarMateria.ts
import { materiaRepository } from "@/lib/repositories/materiaRepository"

export class MateriaNoEncontradaError extends Error {
  constructor() {
    super("Materia no encontrada")
  }
}

export class SinCamposParaActualizarError extends Error {
  constructor() {
    super("Sin campos para actualizar")
  }
}

export async function actualizarMateria(
  id: number,
  tenantId: number,
  body: any
) {
  const existe = await materiaRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    throw new MateriaNoEncontradaError()
  }

  const data: any = {}

  if (typeof body.nombre === "string") {
    const nombre = body.nombre.trim()

    if (!nombre) {
      throw new SinCamposParaActualizarError()
    }

    data.nombre = nombre
  }

  if (Object.keys(data).length === 0) {
    throw new SinCamposParaActualizarError()
  }

  return materiaRepository.actualizar(id, data)
}