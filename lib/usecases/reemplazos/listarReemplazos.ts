import { reemplazoRepository } from "@/lib/repositories/reemplazoRepository"

export class FiltroObligatorioError extends Error {
  constructor() {
    super(
      "Se requiere al menos uno de: claseId, asignacionTitularId, fecha_desde"
    )
  }
}

export async function listarReemplazos(
  tenantId: number,
  params: {
    claseId?: string | null
    asignacionTitularId?: string | null
    fecha_desde?: string | null
    fecha_hasta?: string | null
  }
) {

  const {
    claseId,
    asignacionTitularId,
    fecha_desde,
    fecha_hasta,
  } = params

  if (
    !claseId &&
    !asignacionTitularId &&
    !fecha_desde
  ) {
    throw new FiltroObligatorioError()
  }

  return reemplazoRepository.listar(tenantId, {
    claseId: claseId
      ? parseInt(claseId)
      : undefined,

    asignacionTitularId: asignacionTitularId
      ? parseInt(asignacionTitularId)
      : undefined,

    fecha_desde,
    fecha_hasta,
  })
}