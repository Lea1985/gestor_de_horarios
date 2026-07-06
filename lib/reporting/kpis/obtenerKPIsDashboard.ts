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

  // Incidencias activas = clases con incidencia (sin importar si tienen reemplazo o no)
  const incidenciasActivas = clases.filter(c => c.incidencia !== null).length

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