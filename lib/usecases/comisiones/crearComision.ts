// lib/usecases/comisiones/crearComision.ts

import { comisionRepository } from "@/lib/repositories/comisionRepository"

export class DatosComisionInvalidosError extends Error {}

type Input = {
  cursoId?: number
  turnoId?: number
  unidadId?: number | null
  nombre?: string
  descripcion?: string
}

export async function crearComision(
  tenantId: number,
  data: Input
) {
  const nombre = data.nombre?.trim()

  if (!data.cursoId) {
    throw new DatosComisionInvalidosError("El curso es obligatorio")
  }

  if (!data.turnoId) {
    throw new DatosComisionInvalidosError("El turno es obligatorio")
  }

  if (!nombre) {
    throw new DatosComisionInvalidosError("El nombre es obligatorio")
  }

  return comisionRepository.crear(tenantId, {
    cursoId: data.cursoId,
    turnoId: data.turnoId,
    unidadId: data.unidadId ?? null,
    nombre,
    descripcion: data.descripcion?.trim() || undefined,
  })
}