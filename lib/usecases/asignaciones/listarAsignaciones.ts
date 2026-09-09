import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export function listarAsignaciones(
  tenantId: number,
  incluirInactivas = false
) {
  return asignacionRepository.listar(tenantId, incluirInactivas)
}

// UX-INC-014: variante para el wizard de "Nueva incidencia" — trae, además
// de los datos habituales, si la asignación tiene al menos una clase
// programada de hoy en adelante (tieneClasesVigentes). Se usa para
// deshabilitar la selección de asignaciones que van a fallar igual al
// crear la incidencia.
export async function listarAsignacionesParaIncidencia(tenantId: number) {
  const asignaciones = await asignacionRepository.listarParaIncidencia(tenantId)
  return asignaciones.map(({ ClaseProgramada, ...resto }) => ({
    ...resto,
    tieneClasesVigentes: ClaseProgramada.length > 0,
  }))
}