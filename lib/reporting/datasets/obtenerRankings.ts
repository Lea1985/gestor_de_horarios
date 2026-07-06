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

function calcularPeriodo(rango: RangoRankings): { desde: Date | null; hasta: Date | null } {
  if (rango === "todo") return { desde: null, hasta: null }
  const hasta = new Date()
  const desde = new Date(hasta)
  if (rango === "anio")     desde.setFullYear(hasta.getFullYear() - 1)
  if (rango === "semestre") desde.setMonth(hasta.getMonth() - 6)
  if (rango === "mes")      desde.setMonth(hasta.getMonth() - 1)
  return { desde, hasta }
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
  const rawAgentes = await prisma.incidencia.groupBy({
    by: ["asignacionId"],
    where: {
      activo:     true,
      deletedAt:  null,
      asignacion: { institucionId: tenantId },
      ...(filtroDates ? { fecha_desde: filtroDates } : {}),
    } satisfies Prisma.IncidenciaWhereInput,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limite * 3,
  })

  const titulares = await prisma.titularAsignacion.findMany({
    where: {
      asignacionId: { in: rawAgentes.map(r => r.asignacionId) },
      activo:       true,
      deletedAt:    null,
    },
    include: { agente: { select: { id: true, nombre: true, apellido: true } } },
    distinct: ["asignacionId"],
  })

  const totalPorAgente = new Map<number, { nombre: string; apellido: string; total: number }>()
  for (const row of rawAgentes) {
    const titular = titulares.find(t => t.asignacionId === row.asignacionId)
    if (!titular) continue
    const { id, nombre, apellido } = titular.agente
    const prev = totalPorAgente.get(id)
    totalPorAgente.set(id, { nombre, apellido, total: (prev?.total ?? 0) + row._count.id })
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
  const rawComisiones = await prisma.claseProgramada.groupBy({
    by: ["comisionId"],
    where: {
      institucionId: tenantId,
      estado:        { in: ["SUSPENDIDA", "REEMPLAZADA"] },
      comisionId:    { not: null },
      ...(filtroDates ? { fecha: filtroDates } : {}),
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
