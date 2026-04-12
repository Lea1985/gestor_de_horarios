import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export async function listarAsignaciones(tenantId: number) {
  return asignacionRepository.listar(tenantId)
}