// lib/pdf/datasets/dashboard.ts
import { obtenerKPIsDashboard } from "@/lib/reporting/kpis/obtenerKPIsDashboard"
import {
  obtenerClasesOperativasHoy,
  mapearCoberturaHoy,
  ClaseSinCobertura,
  ClaseReemplazoActivo,
} from "@/lib/reporting/datasets/obtenerClasesOperativas"

export type DatosDashboardPDF = {
  fecha: Date
  kpis: {
    clasesHoy: number
    reemplazosActivos: number
    suspendidasHoy: number
    sinCoberturaHoy: number
    incidenciasActivas: number
    coberturaPorcentaje: number
  }
  sinCobertura: ClaseSinCobertura[]
  reemplazosActivos: ClaseReemplazoActivo[]
}

export async function obtenerDatosDashboardPDF(
  tenantId: number
): Promise<DatosDashboardPDF> {
  const [kpis, clasesHoy] = await Promise.all([
    obtenerKPIsDashboard(tenantId),
    obtenerClasesOperativasHoy(tenantId),
  ])

  const { sinCobertura, reemplazosActivos } = mapearCoberturaHoy(clasesHoy)

  return {
    fecha: new Date(),
    kpis: {
      clasesHoy:           kpis.clasesHoy,
      reemplazosActivos:   kpis.reemplazosActivos,
      suspendidasHoy:      kpis.suspendidasHoy,
      sinCoberturaHoy:     kpis.sinCoberturaHoy,
      incidenciasActivas:  kpis.incidenciasActivas,
      coberturaPorcentaje: kpis.coberturaPorcentaje,
    },
    sinCobertura,
    reemplazosActivos,
  }
}