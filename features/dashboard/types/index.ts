// features/dashboard/types/index.ts
export type MetricValue = number | string

export type DashboardKPIs = {
  clasesHoy:            MetricValue
  reemplazosActivos:    MetricValue
  suspendidasHoy:       MetricValue
  sinCoberturaHoy:      MetricValue
  incidenciasActivas:   MetricValue
  coberturaPorcentaje:  MetricValue
  // Nuevos campos del backend
  continuidadPedagogica?: number | null
  deltaCobertura?:        number | null
}

export type TimelineItem = {
  fecha:               string
  total:               number
  normales:            number
  reemplazadas:        number
  sinCobertura:        number
  suspendidas:         number
  coberturaPorcentaje: number
}

export type ResumenCobertura = {
  total:               number
  normales:            number
  reemplazadas:        number
  sinCobertura:        number
  suspendidas:         number
  coberturaPorcentaje: number
}

export type ClaseSinCobertura = {
  claseId:       number
  incidenciaId:  number | null
  unidad:        string | null
  comision:      string | null
  materia:       string | null
  identificador: string | null
  titular:       string
  articulo:      string | null
}
export type ReemplazoActivoHoy = {
  claseId:       number
  incidenciaId:  number | null
  unidad:        string | null
  comision:      string | null
  materia:       string | null
  identificador: string | null
  titular:       string
  suplente:      string
}

export type PendientesDashboard = {
  sinCobertura:           number
  vencenHoy:              number
  vencenManana:           number
  vencenEstaSemana:       number
  reemplazosVencenSemana: number
}

export type DashboardOverviewResponse = {
  kpis:              DashboardKPIs
  sinCobertura:      ClaseSinCobertura[]
  reemplazosActivos: ReemplazoActivoHoy[]
  timeline:          TimelineItem[]
  pendientes:        PendientesDashboard
}

export const RANGOS_DIAS = [7, 14, 30] as const
export type RangoDias = (typeof RANGOS_DIAS)[number]
