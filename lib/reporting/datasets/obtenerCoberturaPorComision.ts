// lib/reporting/datasets/obtenerCoberturaPorComision.ts
//
// Calcula cobertura diaria por comisión y devuelve las N comisiones
// con mayor variación (desvío estándar del % diario).
// Las más variables son las más problemáticas operativamente.
//
// Lógica de cobertura (igual que calcularCobertura / obtenerClasesOperativas):
//   SUSPENDIDA + causa INCIDENCIA → sin cobertura (nada la cubrió)
//   SUSPENDIDA por otro motivo    → suspendida (no cuenta para cobertura)
//   cualquier otro estado         → cubierta (reemplazada, dictada o programada)

import prisma from "@/lib/prisma"

export type TendenciaComision = "sube" | "baja" | "estable"

export interface TimelineComisionItem {
  fecha:               string
  total:               number
  cubiertas:           number
  sinCobertura:        number
  suspendidas:         number
  coberturaPorcentaje: number
}

export interface CoberturaPorComision {
  comisionId:          number
  nombre:              string
  curso:               string
  turno:               string
  coberturaPorcentaje: number      // promedio del período
  variacion:           number      // desvío estándar — cuánto oscila día a día
  tendencia:           TendenciaComision
  timeline:            TimelineComisionItem[]
}

function calcularDesviacion(valores: number[]): number {
  if (valores.length < 2) return 0
  const media = valores.reduce((a, b) => a + b, 0) / valores.length
  const varianza = valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / valores.length
  return Math.round(Math.sqrt(varianza) * 10) / 10
}

function calcularTendencia(timeline: TimelineComisionItem[]): TendenciaComision {
  if (timeline.length < 3) return "estable"
  const mitad    = Math.floor(timeline.length / 2)
  const primeraM = timeline.slice(0, mitad).reduce((a, d) => a + d.coberturaPorcentaje, 0) / mitad
  const segundaM = timeline.slice(mitad).reduce((a, d) => a + d.coberturaPorcentaje, 0) / (timeline.length - mitad)
  const delta    = segundaM - primeraM
  if (delta > 5)  return "sube"
  if (delta < -5) return "baja"
  return "estable"
}

export async function obtenerCoberturaPorComision(
  tenantId:    number,
  diasRango:   number = 14,
  limite:      number = 3,
  comisionId?: number,
): Promise<CoberturaPorComision[]> {
  const hasta = new Date()
  const desde = new Date(hasta)
  // UTC explícito: ClaseProgramada.fecha se guarda como medianoche UTC.
  // setDate/setHours locales corrían el rango en cualquier servidor con
  // TZ != UTC, y además desalineaban este timeline por comisión respecto
  // del timeline institucional (generarTimelineCobertura), que ya usa UTC.
  desde.setUTCDate(hasta.getUTCDate() - (diasRango - 1))
  desde.setUTCHours(0, 0, 0, 0)

  // 1. Traer clases con causa/estado y comisión para calcular cobertura real
  const clases = await prisma.claseProgramada.findMany({
    where: {
      institucionId: tenantId,
      comisionId:    comisionId ? comisionId : { not: null },
      fecha:         { gte: desde, lte: hasta },
    },
    select: {
      fecha:      true,
      estado:     true,
      causa:      true,
      comisionId: true,
      comision: {
        select: {
          id:     true,
          nombre: true,
          curso:  { select: { nombre: true } },
          turno:  { select: { nombre: true } },
        },
      },
    },
    orderBy: { fecha: "asc" },
  })

  if (clases.length === 0) return []

  // 2. Agrupar por comisión
  const porComision = new Map<number, typeof clases>()
  for (const clase of clases) {
    if (!clase.comisionId) continue
    const existing = porComision.get(clase.comisionId) ?? []
    existing.push(clase)
    porComision.set(clase.comisionId, existing)
  }

  // 3. Calcular métricas por comisión
  const resultados: CoberturaPorComision[] = []
  for (const [cId, clasesComision] of porComision.entries()) {
    const meta = clasesComision[0].comision
    if (!meta) continue

    // Agrupar por fecha
    const porFecha = new Map<string, typeof clasesComision>()
    for (const c of clasesComision) {
      const fecha = c.fecha.toISOString().split("T")[0]
      const existing = porFecha.get(fecha) ?? []
      existing.push(c)
      porFecha.set(fecha, existing)
    }

    // Timeline diario con lógica de cobertura correcta
    const timeline: TimelineComisionItem[] = Array.from(porFecha.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, clasesDia]) => {
        let suspendidas  = 0
        let sinCobertura = 0
        let cubiertas    = 0
        for (const clase of clasesDia) {
          if (clase.estado === "SUSPENDIDA") {
            if (clase.causa === "INCIDENCIA") {
              sinCobertura++ // suspendida por incidencia real, sin reemplazo
            } else {
              suspendidas++  // feriado, período operativo, etc. -- no cuenta
            }
          } else {
            cubiertas++ // reemplazada, dictada o programada -- cubierta
          }
        }
        const total = clasesDia.length
        // Las suspendidas no cuentan en el denominador
        const denominador = total - suspendidas
        const pct = denominador > 0
          ? Math.round((cubiertas / denominador) * 100)
          : 100  // si solo hay suspendidas o no hay clases → 100%
        return { fecha, total, cubiertas, sinCobertura, suspendidas, coberturaPorcentaje: pct }
      })

    const porcentajes = timeline.map(d => d.coberturaPorcentaje)
    const promedio    = Math.round(porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length)
    const variacion   = calcularDesviacion(porcentajes)
    const tendencia   = calcularTendencia(timeline)

    resultados.push({
      comisionId:          cId,
      nombre:              meta.nombre,
      curso:               meta.curso?.nombre ?? "",
      turno:               meta.turno?.nombre ?? "",
      coberturaPorcentaje: promedio,
      variacion,
      tendencia,
      timeline,
    })
  }

  // 4. Si pidieron una comisión específica, devolver solo esa
  if (comisionId) return resultados

  // 5. Ordenar por variación desc y limitar
  return resultados
    .sort((a, b) => b.variacion - a.variacion)
    .slice(0, limite)
}