import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"

export async function obtenerPeriodoActivo(tenantId: number) {
  return periodoOperativoRepository.obtenerVigente(tenantId)
}