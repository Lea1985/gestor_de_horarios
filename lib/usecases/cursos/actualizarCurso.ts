// lib/usecases/cursos/actualizarCurso.ts

import { Prisma } from "@prisma/client"
import { cursoRepository } from "@/lib/repositories/cursoRepository"

export class CursoNoEncontradoError extends Error {}
export class SinCamposParaActualizarError extends Error {}

type Input = {
  nombre?: string
  descripcion?: string | null
  activo?: boolean
}

export async function actualizarCurso(
  id: number,
  tenantId: number,
  data: Input
) {
  const existe = await cursoRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    throw new CursoNoEncontradoError("Curso no encontrado")
  }

  const updateData: Prisma.CursoUpdateInput = {}

  if (data.nombre !== undefined) {
    updateData.nombre = data.nombre.trim()
  }

  if (data.descripcion !== undefined) {
    updateData.descripcion =
      data.descripcion === null
        ? null
        : data.descripcion.trim()
  }

  if (data.activo !== undefined) {
    updateData.activo = data.activo
  }

  if (Object.keys(updateData).length === 0) {
    throw new SinCamposParaActualizarError(
      "No se enviaron campos para actualizar"
    )
  }

  return cursoRepository.actualizar(id, updateData)
}