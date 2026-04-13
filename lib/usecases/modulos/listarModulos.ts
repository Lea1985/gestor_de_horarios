import { moduloRepository } from "@/lib/repositories/moduloRepository"

export async function listarModulos(tenantId: number) {
  return moduloRepository.listar(tenantId)
}