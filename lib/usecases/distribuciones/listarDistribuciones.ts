//lib/usecases/distribuciones/listarDistribuciones.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"

export async function listarDistribuciones(tenantId: number) {
  return distribucionRepository.listar(tenantId)
}