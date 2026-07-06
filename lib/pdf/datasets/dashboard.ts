// lib/pdf/datasets/dashboard.ts
import { obtenerKPIsDashboard } from "@/lib/reporting/kpis/obtenerKPIsDashboard"
import { obtenerClasesOperativasHoy } from "@/lib/reporting/datasets/obtenerClasesOperativas"
import prisma from "@/lib/prisma"

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
  sinCobertura: Array<{
    unidad:        string | null
    comision:      string | null
    identificador: string | null
    titular:       string
    articulo:      string | null
  }>
  reemplazosActivos: Array<{
    unidad:        string | null
    comision:      string | null
    identificador: string | null
    titular:       string
    suplente:      string
  }>
}

export async function obtenerDatosDashboardPDF(
  tenantId: number
): Promise<DatosDashboardPDF> {
  const [kpis, clasesHoy] = await Promise.all([
    obtenerKPIsDashboard(tenantId),
    obtenerClasesOperativasHoy(tenantId),
  ])

  const sinCobertura = clasesHoy
    .filter(c => c.coberturaEstado === "SIN_COBERTURA")
    .map(c => ({
      unidad:        c.unidad?.nombre ?? null,
      comision:      c.comision?.nombre ?? null,
      identificador: c.asignacion?.identificadorEstructural ?? null,
      titular:       c.titular ? `${c.titular.apellido}, ${c.titular.nombre}` : "Vacante",
      articulo:      c.incidencia?.articulo ?? null,
    }))

  const reemplazosActivos = clasesHoy
    .filter(c => c.coberturaEstado === "REEMPLAZADA")
    .map(c => ({
      unidad:        c.unidad?.nombre ?? null,
      comision:      c.comision?.nombre ?? null,
      identificador: c.asignacion?.identificadorEstructural ?? null,
      titular:       c.titular ? `${c.titular.apellido}, ${c.titular.nombre}` : "Vacante",
      suplente:      c.suplente ? `${c.suplente.apellido}, ${c.suplente.nombre}` : "—",
    }))

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
