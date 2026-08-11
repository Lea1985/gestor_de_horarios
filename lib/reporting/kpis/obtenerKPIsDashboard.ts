// lib/reporting/kpis/obtenerKPIsDashboard.ts
import { obtenerClasesOperativasHoy } from "../datasets/obtenerClasesOperativas"
import { calcularCobertura, type ResumenCobertura } from "../transformers/calcularCobertura"

export type DashboardKPIs = {
  clasesHoy: number
  reemplazosActivos: number
  suspendidasHoy: number
  sinCoberturaHoy: number
  incidenciasActivas: number
  coberturaPorcentaje: number
  coberturaDetalle: ResumenCobertura
}

export async function obtenerKPIsDashboard(tenantId: number): Promise<DashboardKPIs> {
  const clases = await obtenerClasesOperativasHoy(tenantId)
  const cobertura = calcularCobertura(clases)
  // Incidencias activas = incidencias distintas (no clases): una misma
  // incidencia puede cubrir más de un módulo/clase el mismo día, y antes
  // se contaba una vez por clase en lugar de una vez por incidencia.
  const incidenciasActivas = new Set(
    clases
      .filter(c => c.incidencia !== null)
      .map(c => c.incidencia!.id)
  ).size
  return {
    clasesHoy: cobertura.total,
    reemplazosActivos: cobertura.reemplazadas,
    suspendidasHoy: cobertura.suspendidas,
    sinCoberturaHoy: cobertura.sinCobertura,
    incidenciasActivas,
    coberturaPorcentaje: cobertura.coberturaPorcentaje,
    coberturaDetalle: cobertura,
  }
}