// lib/reporting/datasets/obtenerJornadas.ts
import prisma from "@/lib/prisma"

export type EstadoJornada = "trabajado" | "reemplazado" | "sin_cobertura" | "feriado"

export type DetalleJornada = {
  fecha: Date
  estado: EstadoJornada
  incidenciaId: number | null
  codigarioItemCodigo: string | null
  codigarioItemNombre: string | null
  porcentajePagado: number
}

export type ResultadoJornadas = {
  agenteId: number
  periodo: { desde: Date; hasta: Date }
  totalDias: number
  diasComputables: number
  detalle: DetalleJornada[]
}

/**
 * Reporte de jornadas para cargos jornalizados (preceptor, secretario,
 * director -- asignación sin materia): igual espíritu que
 * obtenerModulosComputables, pero con "día" como unidad en vez de
 * "módulo", porque estos cargos se pagan por jornal, no por módulo.
 *
 * Cada ClaseProgramada del día se clasifica individualmente con el mismo
 * criterio que ya usa el Dashboard (obtenerClasesOperativas.ts /
 * calcularCobertura.ts):
 *   - DICTADA/PROGRAMADA sin reemplazo activo → normal (trabajado)
 *   - con reemplazo activo                    → reemplazada
 *   - SUSPENDIDA + causa INCIDENCIA, sin reemplazo → sin_cobertura
 *   - SUSPENDIDA + causa CALENDARIO_ESCOLAR   → feriado
 *   - SUSPENDIDA + cualquier otra causa (PERIODO_OPERATIVO,
 *     CAMBIO_DISTRIBUCION, FIN_ASIGNACION, MANUAL, NINGUNA) → excluida
 *
 * Las "excluidas" son estados puramente administrativos/internos (ver
 * PERIODO_OPERATIVO: no es un feriado real, es simplemente que no había
 * un período operativo activo cubriendo la fecha) -- no representan ni
 * un día trabajado, ni un feriado real, ni una ausencia real, así que no
 * cuentan ni aparecen en el reporte. Si TODOS los módulos de un día caen
 * en esta categoría, el día entero se omite.
 *
 * Cuando un día tiene módulos en más de un estado, se colapsa a uno solo
 * con esta prioridad: sin_cobertura > reemplazada > normal > feriado.
 *
 * Pago por día: trabajado y feriado pagan 100% (un feriado se paga igual
 * que un día trabajado, mismo criterio que para cualquier empleado en
 * blanco). Reemplazado y sin_cobertura pagan el porcentajeComputable del
 * CodigarioItem asociado a la incidencia -- mismo criterio que
 * obtenerModulosComputables, aplicado una vez por día en vez de una vez
 * por módulo.
 */
export async function obtenerJornadas(
  tenantId: number,
  agenteId: number,
  periodo: { desde: Date; hasta: Date }
): Promise<ResultadoJornadas> {
  // 1. Tramos de titularidad del agente, SOLO cargos jornalizados (sin
  //    materia) -- espejo exacto del filtro de obtenerModulosComputables,
  //    pero invertido.
  const titularidades = await prisma.titularAsignacion.findMany({
    where: {
      institucionId: tenantId,
      agenteId,
      deletedAt: null,
      fecha_desde: { lte: periodo.hasta },
      OR: [
        { fecha_hasta: null },
        { fecha_hasta: { gte: periodo.desde } },
      ],
      asignacion: { materiaId: null },
    },
    select: { asignacionId: true, fecha_desde: true, fecha_hasta: true },
  })

  if (titularidades.length === 0) {
    return { agenteId, periodo, totalDias: 0, diasComputables: 0, detalle: [] }
  }

  // 2. Para cada tramo, el rango efectivo es la intersección entre el
  //    período pedido y la vigencia del titular en ese cargo.
  const clasesPorTramo = await Promise.all(
    titularidades.map(t => {
      const desdeTramo = t.fecha_desde > periodo.desde ? t.fecha_desde : periodo.desde
      const hastaTramo = t.fecha_hasta && t.fecha_hasta < periodo.hasta ? t.fecha_hasta : periodo.hasta
      return prisma.claseProgramada.findMany({
        where: {
          institucionId: tenantId,
          asignacionId: t.asignacionId,
          fecha: { gte: desdeTramo, lte: hastaTramo },
        },
        select: {
          fecha: true,
          estado: true,
          causa: true,
          incidenciaId: true,
          reemplazos: {
            where: { activo: true },
            select: { id: true },
          },
          incidencia: {
            select: {
              codigarioItem: {
                select: { codigo: true, nombre: true, porcentajeComputable: true },
              },
            },
          },
        },
        orderBy: { fecha: "asc" },
      })
    })
  )

  const clases = clasesPorTramo.flat()

  type ClaseClasificada = {
    fecha: Date
    tipo: "normal" | "reemplazada" | "sin_cobertura" | "feriado" | "excluida"
    incidenciaId: number | null
    codigarioItemCodigo: string | null
    codigarioItemNombre: string | null
    porcentajeComputable: number
  }

  // 3. Clasificar cada clase individual.
  const clasesClasificadas: ClaseClasificada[] = clases.map(c => {
    const tieneReemplazoActivo = c.reemplazos.length > 0
    let tipo: ClaseClasificada["tipo"]
    if (c.estado === "SUSPENDIDA") {
      if (c.causa === "CALENDARIO_ESCOLAR") tipo = "feriado"
      else if (c.causa === "INCIDENCIA") tipo = tieneReemplazoActivo ? "reemplazada" : "sin_cobertura"
      else tipo = "excluida" // PERIODO_OPERATIVO y demás causas internas/administrativas
    } else {
      tipo = tieneReemplazoActivo ? "reemplazada" : "normal"
    }
    return {
      fecha: c.fecha,
      tipo,
      incidenciaId: c.incidenciaId,
      codigarioItemCodigo: c.incidencia?.codigarioItem?.codigo ?? null,
      codigarioItemNombre: c.incidencia?.codigarioItem?.nombre ?? null,
      porcentajeComputable: c.incidencia?.codigarioItem?.porcentajeComputable ?? 100,
    }
  })

  // 4. Agrupar por día y colapsar a un único estado con la prioridad
  //    sin_cobertura > reemplazada > normal > feriado. Las "excluida" no
  //    participan de la decisión; si TODAS las clases del día son
  //    "excluida", el día entero se omite del reporte.
  const porFecha = new Map<string, ClaseClasificada[]>()
  for (const c of clasesClasificadas) {
    const key = c.fecha.toISOString().split("T")[0]
    const arr = porFecha.get(key) ?? []
    arr.push(c)
    porFecha.set(key, arr)
  }

  const prioridad: Record<string, number> = {
    sin_cobertura: 3,
    reemplazada: 2,
    normal: 1,
    feriado: 0,
  }

  const detalle: DetalleJornada[] = []
  for (const [, clasesDia] of Array.from(porFecha.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const relevantes = clasesDia.filter(c => c.tipo !== "excluida")
    if (relevantes.length === 0) continue // día puramente administrativo, se omite

    const ganadora = relevantes.reduce((mejor, actual) =>
      prioridad[actual.tipo] > prioridad[mejor.tipo] ? actual : mejor
    )

    const estado: EstadoJornada =
      ganadora.tipo === "sin_cobertura" ? "sin_cobertura" :
      ganadora.tipo === "reemplazada"   ? "reemplazado" :
      ganadora.tipo === "feriado"       ? "feriado" :
                                           "trabajado"

    const porcentajePagado =
      estado === "trabajado" || estado === "feriado"
        ? 100
        : ganadora.porcentajeComputable

    detalle.push({
      fecha: ganadora.fecha,
      estado,
      incidenciaId: ganadora.incidenciaId,
      codigarioItemCodigo: ganadora.codigarioItemCodigo,
      codigarioItemNombre: ganadora.codigarioItemNombre,
      porcentajePagado,
    })
  }

  const diasComputablesCrudo = detalle.reduce((acc, d) => acc + d.porcentajePagado / 100, 0)
  // Redondeo a 2 decimales, mismo criterio que módulos computables.
  const diasComputables = Math.round(diasComputablesCrudo * 100) / 100

  return {
    agenteId,
    periodo,
    totalDias: detalle.length,
    diasComputables,
    detalle,
  }
}

export type FilaResumenJornada = {
  agenteId:        number
  agenteNombre:    string
  agenteDocumento: string
  totalDias:       number
  diasComputables: number
}

/**
 * Igual que obtenerJornadas, pero para TODOS los agentes con cargo
 * jornalizado que tuvieron titularidad vigente en el período -- sin
 * detalle día por día, solo los totales agregados por agente.
 */
export async function obtenerJornadasResumen(
  tenantId: number,
  periodo: { desde: Date; hasta: Date }
): Promise<FilaResumenJornada[]> {
  const titularidades = await prisma.titularAsignacion.findMany({
    where: {
      institucionId: tenantId,
      deletedAt: null,
      fecha_desde: { lte: periodo.hasta },
      OR: [
        { fecha_hasta: null },
        { fecha_hasta: { gte: periodo.desde } },
      ],
      asignacion: { materiaId: null },
    },
    select: { agenteId: true },
    distinct: ["agenteId"],
  })

  if (titularidades.length === 0) return []

  const agentes = await prisma.agente.findMany({
    where: {
      id: { in: titularidades.map(t => t.agenteId) },
      institucionId: tenantId,
    },
    select: { id: true, nombre: true, apellido: true, documento: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  })

  const resultados = await Promise.all(
    agentes.map(async (agente) => {
      const r = await obtenerJornadas(tenantId, agente.id, periodo)
      return {
        agenteId:        agente.id,
        agenteNombre:    `${agente.apellido}, ${agente.nombre}`,
        agenteDocumento: agente.documento,
        totalDias:       r.totalDias,
        diasComputables: r.diasComputables,
      }
    })
  )

  return resultados
}

export type AgenteHeader = { nombre: string; apellido: string; documento: string } | null

/** Datos mínimos del agente para el encabezado del PDF individual. */
export async function obtenerAgenteParaHeaderJornadas(tenantId: number, agenteId: number): Promise<AgenteHeader> {
  return prisma.agente.findFirst({
    where: { id: agenteId, institucionId: tenantId },
    select: { nombre: true, apellido: true, documento: true },
  })
}