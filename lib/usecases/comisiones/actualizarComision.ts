// lib/usecases/comisiones/actualizarComision.ts

import { Prisma } from "@prisma/client"
import { comisionRepository } from "@/lib/repositories/comisionRepository"

export class ComisionNoEncontradaError extends Error {}
export class SinCamposParaActualizarError extends Error {}

type Input = {
  cursoId?: number
  turnoId?: number
  unidadId?: number | null
  nombre?: string
  descripcion?: string | null
  activo?: boolean
}

export async function actualizarComision(
  id: number,
  tenantId: number,
  data: Input
) {
  const existe = await comisionRepository.existeEnTenant(id, tenantId)

  if (!existe) {
    throw new ComisionNoEncontradaError("Comisión no encontrada")
  }

  const updateData: Prisma.ComisionUpdateInput = {}

  if (data.cursoId !== undefined) {
    updateData.curso = {
      connect: { id: data.cursoId },
    }
  }

  if (data.turnoId !== undefined) {
    updateData.turno = {
      connect: { id: data.turnoId },
    }
  }

  if (data.unidadId !== undefined) {
    updateData.unidad =
      data.unidadId === null
        ? { disconnect: true }
        : { connect: { id: data.unidadId } }
  }

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

  return comisionRepository.actualizar(id, updateData)
}