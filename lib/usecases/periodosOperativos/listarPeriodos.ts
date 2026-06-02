// lib/usecases/periodosOperativos/listarPeriodos.ts

import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export async function listarPeriodos(
  tenantId: number,
  incluirEliminados = false
) {
  return periodoOperativoRepository.listar(
    tenantId,
    incluirEliminados
  )
}