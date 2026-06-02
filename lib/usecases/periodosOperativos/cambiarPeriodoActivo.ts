// lib/usecases/periodosOperativos/cambiarPeriodoActivo.ts

import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export class PeriodoNoEncontradoError extends Error {
  constructor() {
    super("El período a activar no existe o no pertenece a la institución")
  }
}

export async function cambiarPeriodoActivo(
  tenantId: number,
  nuevoPeriodoId: number
) {

  // Verificar existencia dentro de la institución
  const existe = await periodoOperativoRepository.existeEnTenant(
    nuevoPeriodoId,
    tenantId
  )

  if (!existe) {
    throw new PeriodoNoEncontradoError()
  }

  // Establecer nuevo período vigente
  return periodoOperativoRepository.setActivePeriod(
    tenantId,
    nuevoPeriodoId
  )
}