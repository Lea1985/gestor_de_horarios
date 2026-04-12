import { codigarioRepository } from "@/lib/repositories/codigarioRepository"

export async function listarCodigarios(tenantId: number) {
  return codigarioRepository.listar(tenantId)
}