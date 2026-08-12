// lib/reporting/datasets/obtenerRankings.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export type RangoRankings = "todo" | "anio" | "semestre" | "mes"

export interface RankingItem {
  id:    number
  label: string
  sub?:  string
  total: number
}

export interface RankingsResult {
  agentesConMasLicencias:    RankingItem[]
  articulosMasUsados:        RankingItem[]
  comisionesConMasAusencias: RankingItem[]
  periodo: { desde: string | null; hasta: string | null }
}

// UTC explícito: fecha_desde/fecha_hasta de Incidencia se guardan como
// fecha pura (medianoche UTC), igual que ClaseProgramada.fecha. Usar
// getFullYear/setFullYear/getMonth/setMonth locales corría el corte de
// período en un servidor con TZ != UTC, aunque acá el impacto solo se
// nota si la query corre justo en el límite de un mes/semestre/año.
function calcularPeriodo(rango: RangoRankings): { desde: Date | null; hasta: Date | null } {
  if (rango === "todo") return { desde: null, hasta: null }
  const hasta = new Date()
  const desde = new Date(hasta)
  if (rango === "anio")     desde.setUTCFullYear(hasta.getUTCFullYear() - 1)
  if (rango === "semestre") desde.setUTCMonth(hasta.getUTCMonth() - 6)
  if (rango === "mes")      desde.setUTCMonth(hasta.getUTCMonth() - 1)
  return { desde, hasta }
}

// ── Titular vigente en una fecha (mismo patrón que ausencias.ts / profesor.ts / obtenerClasesOperativas.ts) ──
type Agente = { id: number; nombre: string; apellido: string }
type TitularHistorial = { fecha_desde: Date; fecha_hasta: Date | null; agente: Agente }

function titularVigenteEn(titularidades: TitularHistorial[] | undefined, fecha: Date): Agente | null {
  if (!titularidades?.length) return null
  const vigente = titularidades.find(t =>
    t.fecha_desde <= fecha && (!t.fecha_hasta || t.fecha_hasta >= fecha)
  )
  return vigente?.agente ?? null
}

export async function obtenerRankings(
  tenantId: number,
  rango:    RangoRankings = "anio",
  limite:   number        = 5,
): Promise<RankingsResult> {
  const { desde, hasta } = calcularPeriodo(rango)
  const filtroDates = desde && hasta
    ? { gte: desde, lte: hasta }
    : undefined

  // ── 1. Agentes con más licencias ─────────────────────────────────────────
  // Se trae cada incidencia individual (no agrupada en la DB) porque el titular
  // a atribuir depende de la fecha_desde de CADA incidencia, no de un único
  // titular "actual" por asignación -- si el titular de la asignación cambió
  // dentro del período, incidencias antes y después del cambio pertenecen a
  // agentes distintos.
  const incidenciasParaRanking = await prisma.incidencia.findMany({
    where: {
      activo:     true,
      deletedAt:  null,
      asignacion: { institucionId: tenantId },
      ...(filtroDates ? { fecha_desde: filtroDates } : {}),
    } satisfies Prisma.IncidenciaWhereInput,
    select: {
      id:           true,
      asignacionId: true,
      fecha_desde:  true,
    },
  })

  const asignacionIdsConIncidencias = Array.from(
    new Set(incidenciasParaRanking.map(i => i.asignacionId))
  )

  const historialTitulares = await prisma.titularAsignacion.findMany({
    where: {
      asignacionId: { in: asignacionIdsConIncidencias },
      deletedAt:    null,
    },
    orderBy: { fecha_desde: "desc" },
    select: {
      asignacionId: true,
      fecha_desde:  true,
      fecha_hasta:  true,
      agente:       { select: { id: true, nombre: true, apellido: true } },
    },
  })

  const historialPorAsignacion = new Map<number, TitularHistorial[]>()
  for (const t of historialTitulares) {
    const arr = historialPorAsignacion.get(t.asignacionId) ?? []
    arr.push(t)
    historialPorAsignacion.set(t.asignacionId, arr)
  }

  const totalPorAgente = new Map<number, { nombre: string; apellido: string; total: number }>()
  for (const inc of incidenciasParaRanking) {
    const titular = titularVigenteEn(historialPorAsignacion.get(inc.asignacionId), inc.fecha_desde)
    if (!titular) continue // asignación sin ningún titular vigente en esa fecha (ej. quedó vacante ya en ese momento)
    const prev = totalPorAgente.get(titular.id)
    totalPorAgente.set(titular.id, {
      nombre:   titular.nombre,
      apellido: titular.apellido,
      total:    (prev?.total ?? 0) + 1,
    })
  }

  const agentesConMasLicencias: RankingItem[] = Array.from(totalPorAgente.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limite)
    .map(([id, v]) => ({ id, label: `${v.apellido}, ${v.nombre}`, total: v.total }))

  // ── 2. Artículos de codigario más usados ─────────────────────────────────
  const rawArticulos = await prisma.incidencia.groupBy({
    by: ["codigarioItemId"],
    where: {
      activo:     true,
      deletedAt:  null,
      asignacion: { institucionId: tenantId },
      ...(filtroDates ? { fecha_desde: filtroDates } : {}),
    } satisfies Prisma.IncidenciaWhereInput,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limite,
  })

  const codigarioItems = await prisma.codigarioItem.findMany({
    where:  { id: { in: rawArticulos.map(r => r.codigarioItemId) } },
    select: { id: true, nombre: true, codigo: true },
  })

  const articulosMasUsados: RankingItem[] = rawArticulos.map(r => {
    const item = codigarioItems.find(i => i.id === r.codigarioItemId)
    return {
      id:    r.codigarioItemId,
      label: item?.nombre ?? `Artículo #${r.codigarioItemId}`,
      sub:   item?.codigo,
      total: r._count.id,
    }
  })

  // ── 3. Comisiones con más ausencias ──────────────────────────────────────
  // El rango se aplica sobre fecha_desde de la INCIDENCIA (misma semántica
  // que los bloques 1 y 2), no sobre la fecha de cada ClaseProgramada. Si se
  // filtrara por fecha de clase, una incidencia multi-día ya activa quedaría
  // parcialmente contada según qué días de la clase ya pasaron -- inestable
  // e inconsistente con el resto de la función.
  const rawComisiones = await prisma.claseProgramada.groupBy({
    by: ["comisionId"],
    where: {
      institucionId: tenantId,
      estado:        { in: ["SUSPENDIDA", "REEMPLAZADA"] },
      causa:         "INCIDENCIA",
      comisionId:    { not: null },
      ...(filtroDates ? { incidencia: { fecha_desde: filtroDates } } : {}),
    } satisfies Prisma.ClaseProgramadaWhereInput,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limite,
  })

  const comisiones = await prisma.comision.findMany({
    where:   { id: { in: rawComisiones.map(r => r.comisionId!).filter(Boolean) } },
    select:  { id: true, nombre: true, curso: { select: { nombre: true } } },
  })

  const comisionesConMasAusencias: RankingItem[] = rawComisiones
    .filter(r => r.comisionId !== null)
    .map(r => {
      const com = comisiones.find(c => c.id === r.comisionId)
      return {
        id:    r.comisionId!,
        label: com?.nombre ?? `Comisión #${r.comisionId}`,
        sub:   com?.curso?.nombre,
        total: r._count.id,
      }
    })

  return {
    agentesConMasLicencias,
    articulosMasUsados,
    comisionesConMasAusencias,
    periodo: {
      desde: desde?.toISOString().split("T")[0] ?? null,
      hasta: hasta?.toISOString().split("T")[0] ?? null,
    },
  }
}