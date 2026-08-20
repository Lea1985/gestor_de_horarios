// app/api/dashboard/overview/route.ts
import { withContext } from "@/lib/auth/withContext"
import { obtenerClasesOperativas, obtenerClasesOperativasHoy, mapearCoberturaHoy, filtrarFrenteACurso } from "@/lib/reporting/datasets/obtenerClasesOperativas"
import { generarTimelineCobertura } from "@/lib/reporting/transformers/generarTimelineCobertura"
import { obtenerKPIsDashboard } from "@/lib/reporting/kpis/obtenerKPIsDashboard"
import prisma from "@/lib/prisma"

const RANGOS_VALIDOS = [7, 14, 30] as const
type RangoDias = (typeof RANGOS_VALIDOS)[number]
function esRangoValido(n: number): n is RangoDias {
  return RANGOS_VALIDOS.includes(n as RangoDias)
}

/** Cobertura de ayer para calcular delta. UTC explícito -- ver nota en
 *  obtenerClasesOperativasHoy sobre por qué no se usa setHours local.
 *  Excluye cargos no-frente-a-curso (asignacion.materiaId null), mismo
 *  criterio que el resto de las métricas de cobertura -- ver
 *  filtrarFrenteACurso() en obtenerClasesOperativas.ts. */
async function obtenerCoberturaAyer(tenantId: number): Promise<number | null> {
  const ayer = new Date()
  ayer.setUTCDate(ayer.getUTCDate() - 1)
  ayer.setUTCHours(0, 0, 0, 0)
  const ayerFin = new Date(ayer)
  ayerFin.setUTCHours(23, 59, 59, 999)
  const clases = await prisma.claseProgramada.findMany({
    where: {
      institucionId: tenantId,
      fecha: { gte: ayer, lte: ayerFin },
      asignacion: { materiaId: { not: null } },
    },
    select: {
      estado: true,
      causa:  true,
    },
  })
  if (clases.length === 0) return null
  let cubiertas = 0
  let suspendidas = 0
  for (const c of clases) {
    if (c.estado === "SUSPENDIDA") {
      if (c.causa !== "INCIDENCIA") suspendidas++
      // SUSPENDIDA + causa INCIDENCIA: sin cobertura -- no suma a
      // cubiertas ni a suspendidas, pero sí cuenta en el denominador.
      continue
    }
    cubiertas++
  }
  const denominador = clases.length - suspendidas
  if (denominador === 0) return null
  return Math.round((cubiertas / denominador) * 100)
}

/** Próximos vencimientos: incidencias que vencen en los próximos N días.
 *  UTC explícito, mismo motivo que las funciones anteriores. */
async function obtenerProximosVencimientos(tenantId: number) {
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setUTCDate(hoy.getUTCDate() + 1)
  const mananaFin = new Date(manana)
  mananaFin.setUTCHours(23, 59, 59, 999)
  const semanaFin = new Date(hoy)
  semanaFin.setUTCDate(hoy.getUTCDate() + 7)
  semanaFin.setUTCHours(23, 59, 59, 999)
  const [vencenHoy, vencenManana, vencenEstaSemana, reemplazosVencenSemana] =
    await Promise.all([
      prisma.incidencia.count({
        where: {
          activo: true, deletedAt: null,
          fecha_hasta: { gte: hoy, lte: new Date(hoy.getTime() + 86399999) },
          asignacion: { institucionId: tenantId },
        },
      }),
      prisma.incidencia.count({
        where: {
          activo: true, deletedAt: null,
          fecha_hasta: { gte: manana, lte: mananaFin },
          asignacion: { institucionId: tenantId },
        },
      }),
      prisma.incidencia.count({
        where: {
          activo: true, deletedAt: null,
          fecha_hasta: { gt: mananaFin, lte: semanaFin },
          asignacion: { institucionId: tenantId },
        },
      }),
      prisma.reemplazo.count({
        where: {
          activo: true, deletedAt: null,
          clase: {
            institucionId: tenantId,
            incidencia: {
              activo: true,
              fecha_hasta: { gte: hoy, lte: semanaFin },
            },
          },
        },
      }),
    ])
  return { vencenHoy, vencenManana, vencenEstaSemana, reemplazosVencenSemana }
}

/** Continuidad pedagógica del período: (cubiertas) / (total - suspendidas) */
function calcularContinuidad(timeline: ReturnType<typeof generarTimelineCobertura>): number | null {
  const totals = timeline.reduce(
    (acc, d) => ({
      cubiertas:    acc.cubiertas    + d.normales + d.reemplazadas,
      denominador:  acc.denominador  + d.total    - d.suspendidas,
    }),
    { cubiertas: 0, denominador: 0 }
  )
  if (totals.denominador === 0) return null
  return Math.round((totals.cubiertas / totals.denominador) * 100)
}

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const hoy = new Date()
      const diasRaw = Number(searchParams.get("dias"))
      const dias: RangoDias = esRangoValido(diasRaw) ? diasRaw : 14
      const hasta = hoy.toISOString().split("T")[0]
      const desde = (() => {
        const d = new Date()
        // UTC explícito: getDate/setDate locales corrían el rango si el
        // servidor no está en TZ=UTC (mismo bug que las funciones de arriba).
        d.setUTCDate(hoy.getUTCDate() - (dias - 1))
        return d.toISOString().split("T")[0]
      })()
      const desdeDate = new Date(desde)
      const hastaDate = new Date(hasta)
      const [kpis, clasesRango, clasesHoy, coberturaAyer, proximosVencimientos] =
        await Promise.all([
          obtenerKPIsDashboard(tenantId),
          obtenerClasesOperativas(tenantId, desdeDate, hastaDate),
          obtenerClasesOperativasHoy(tenantId),
          obtenerCoberturaAyer(tenantId),
          obtenerProximosVencimientos(tenantId),
        ])
      // Timeline y tablas de "hoy" son métricas de cobertura de aula:
      // excluyen cargos no-frente-a-curso, mismo criterio que obtenerKPIsDashboard.
      const clasesRangoFrenteACurso = filtrarFrenteACurso(clasesRango)
      const clasesHoyFrenteACurso   = filtrarFrenteACurso(clasesHoy)
      const timeline              = generarTimelineCobertura(clasesRangoFrenteACurso)
      const continuidadPedagogica = calcularContinuidad(timeline)
      const coberturaHoy = kpis.coberturaPorcentaje
      const deltaCobertura =
        coberturaAyer !== null && typeof coberturaHoy === "number"
          ? coberturaHoy - coberturaAyer
          : null
      const { sinCobertura, reemplazosActivos } = mapearCoberturaHoy(clasesHoyFrenteACurso)
      return Response.json({
        kpis: {
          clasesHoy:           kpis.clasesHoy,
          reemplazosActivos:   kpis.reemplazosActivos,
          suspendidasHoy:      kpis.suspendidasHoy,
          sinCoberturaHoy:     kpis.sinCoberturaHoy,
          incidenciasActivas:  kpis.incidenciasActivas,
          coberturaPorcentaje: kpis.coberturaPorcentaje,
          continuidadPedagogica,
          deltaCobertura,
        },
        pendientes: {
          sinCobertura:              sinCobertura.length,
          vencenHoy:                 proximosVencimientos.vencenHoy,
          vencenManana:              proximosVencimientos.vencenManana,
          vencenEstaSemana:          proximosVencimientos.vencenEstaSemana,
          reemplazosVencenSemana:    proximosVencimientos.reemplazosVencenSemana,
        },
        sinCobertura,
        reemplazosActivos,
        timeline,
        meta: {
          periodo: { desde, hasta, dias },
          totalClases: clasesRangoFrenteACurso.length,
        },
      })
    } catch (error) {
      console.error("Error dashboard overview:", error)
      return Response.json({ error: "Error generando dashboard overview" }, { status: 500 })
    }
  })
}