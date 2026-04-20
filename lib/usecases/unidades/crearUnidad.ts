// lib/usecases/unidades/crearUnidad.ts

import { unidadRepository } from "@/lib/repositories/unidadRepository"
import { RequestContext as Context } from "@/lib/types/context"
import { TipoUnidad } from "@prisma/client"

export class DatosUnidadInvalidosError extends Error {
  constructor() {
    super("codigoUnidad y nombre son obligatorios")
  }
}

export class TipoUnidadInvalidoError extends Error {
  constructor() {
    super("Tipo de unidad inválido")
  }
}

type CrearUnidadDTO = {
  codigoUnidad?: number
  nombre?: string
  tipo?: TipoUnidad
}

export async function crearUnidad(ctx: Context, body: CrearUnidadDTO) {
  const { codigoUnidad, nombre, tipo } = body

  if (codigoUnidad == null || !nombre) {
    throw new DatosUnidadInvalidosError()
  }

  // Validación runtime (opcional pero PRO)
  if (tipo && !Object.values(TipoUnidad).includes(tipo)) {
    throw new TipoUnidadInvalidoError()
  }

  return unidadRepository.crear({
    tenantId: ctx.tenantId,
    codigoUnidad,
    nombre,
    tipo: tipo ?? null,
  })
}