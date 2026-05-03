// lib/usecases/comisiones/listarComisiones.ts

import { comisionRepository } from "@/lib/repositories/comisionRepository"

export async function listarComisiones(tenantId: number) {
  return comisionRepository.listar(tenantId)
}