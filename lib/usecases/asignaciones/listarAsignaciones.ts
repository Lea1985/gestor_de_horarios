import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export function listarAsignaciones(
  tenantId: number,
  incluirInactivas = false
) {
  return asignacionRepository.listar(tenantId, incluirInactivas)
}