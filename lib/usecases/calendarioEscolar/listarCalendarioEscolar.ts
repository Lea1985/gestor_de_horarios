// lib/usecases/calendarioEscolar/listarCalendarioEscolar.ts

import { calendarioEscolarRepository }
  from "@/lib/repositories/calendarioEscolarRepository"

export async function listarCalendarioEscolar(
  tenantId: number,
  periodoOperativoId: number,
  incluirInactivos = false
) {

  return calendarioEscolarRepository.listar(
    tenantId,
    periodoOperativoId,
    incluirInactivos
  )
}