export type MetricValue = number | string

export type DashboardKPIs = {
  clasesHoy: MetricValue
  reemplazosActivos: MetricValue
  suspendidasHoy: MetricValue
  sinCoberturaHoy: MetricValue
  incidenciasActivas: MetricValue
  coberturaPorcentaje: MetricValue
}

export type TimelineItem = {
  fecha: string
  total: number
  normales: number
  reemplazadas: number
  sinCobertura: number
  suspendidas: number
  coberturaPorcentaje: number
}

export type DashboardOverviewResponse = {
  kpis: DashboardKPIs
  timeline: TimelineItem[]
}