//lib/usecases/codigarios/listarCodigarios.ts
import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export async function listarCodigarios(tenantId: number, incluirInactivos = false) {
  return codigarioRepository.listar(tenantId, incluirInactivos)
}