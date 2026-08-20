// lib/reporting/kpis/obtenerKPIsDashboard.ts
import { obtenerClasesOperativasHoy, filtrarFrenteACurso } from "../datasets/obtenerClasesOperativas"
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
  const todasLasClases = await obtenerClasesOperativasHoy(tenantId)
  // Las métricas de cobertura de aula excluyen cargos no-frente-a-curso
  // (preceptor/secretario/director) -- ver filtrarFrenteACurso().
  const clasesCobertura = filtrarFrenteACurso(todasLasClases)
  const cobertura = calcularCobertura(clasesCobertura)
  // Incidencias activas = incidencias distintas (no clases): una misma
  // incidencia puede cubrir más de un módulo/clase el mismo día, y antes
  // se contaba una vez por clase en lugar de una vez por incidencia.
  // A diferencia de "cobertura", esta cuenta SIGUE incluyendo cargos
  // no-frente-a-curso -- es un conteo general de incidencias activas hoy,
  // no una métrica de cobertura de aula.
  const incidenciasActivas = new Set(
    todasLasClases
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