// lib/pdf/datasets/ausencias.ts
import prisma from "@/lib/prisma"
import { titularVigenteEn } from "./titularVigenteEn"

export type FilaAusencia = {
  incidenciaId:      number
  incidenciaPadreId: number | null
  esRaiz:            boolean
  tramoIndex:        number  // posición del tramo (0-based) dentro de esta incidencia
  totalTramos:       number  // cuántos tramos tiene esta incidencia en total
  fechaDesde:        Date    // fechas del TRAMO, no necesariamente de toda la incidencia
  fechaHasta:        Date
  codigoArt:         string
  nombreArt:         string
  titularDNI:        string
  titularNombre:     string
  identificador:     string
  materia:           string | null
  comision:          string | null
  distribucion:      string
  reemplazante:      {
    nombre:    string
    documento: string
  } | null
}

type Agente = { id: number; nombre: string; apellido: string; documento: string }

const ORDEN_DIAS: Record<string, number> = {
  LUNES: 1, MARTES: 2, MIERCOLES: 3,
  JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 7,
}

function formatHora(min: number): string {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`
}

function distribucionVigenteEn<T extends { fecha_vigencia_desde: Date; fecha_vigencia_hasta: Date | null }>(
  distribuciones: T[],
  fecha: Date
): T | null {
  return distribuciones.find(
    d => d.fecha_vigencia_desde <= fecha && (!d.fecha_vigencia_hasta || d.fecha_vigencia_hasta >= fecha)
  ) ?? null
}

function formatearDistribucion(
  modulos: { dia_semana: string; hora_desde: number; hora_hasta: number }[]
): string {
  const porDia = new Map<string, { dia_semana: string; hora_desde: number; hora_hasta: number }[]>()
  for (const m of modulos) {
    if (!porDia.has(m.dia_semana)) porDia.set(m.dia_semana, [])
    porDia.get(m.dia_semana)!.push(m)
  }
  const dias = [...porDia.keys()].sort(
    (a, b) => (ORDEN_DIAS[a] ?? 9) - (ORDEN_DIAS[b] ?? 9)
  )
  return dias
    .map(dia => {
      const modulosDia = porDia.get(dia)!.sort((a, b) => a.hora_desde - b.hora_desde)
      const horarios = modulosDia.map(m => `${formatHora(m.hora_desde)}-${formatHora(m.hora_hasta)}`).join(", ")
      return `${dia.slice(0, 3)} (${modulosDia.length}) ${horarios}`
    })
    .join(", ")
}

export async function obtenerDatosAusencias(
  tenantId:   number,
  filtros: {
    desde:      Date
    hasta:      Date
    comisionId?: number | null
    agenteId?:   number | null
  }
): Promise<FilaAusencia[]> {
  const incidencias = await prisma.incidencia.findMany({
    where: {
      activo:     true,
      deletedAt:  null,
      fecha_desde: { lte: filtros.hasta },
      fecha_hasta: { gte: filtros.desde },
      asignacion: {
        institucionId: tenantId,
        activo:        true,
        deletedAt:     null,
        ...(filtros.comisionId ? { comisionId: filtros.comisionId } : {}),
        ...(filtros.agenteId   ? {
          titularidades: {
            some: { agenteId: filtros.agenteId },
          },
        } : {}),
      },
    },
    orderBy: [
      { fecha_desde: "asc" },
      { asignacionId: "asc" },
    ],
    select: {
      id:                true,
      asignacionId:      true,
      incidenciaPadreId: true,
      fecha_desde:       true,
      fecha_hasta:       true,
      codigarioItem: {
        select: { codigo: true, nombre: true },
      },
      asignacion: {
        select: {
          identificadorEstructural: true,
          materia:  { select: { nombre: true } },
          comision: { select: { nombre: true } },
          titularidades: {
            orderBy: { fecha_desde: "desc" },
            select: {
              fecha_desde: true,
              fecha_hasta: true,
              agente: { select: { id: true, nombre: true, apellido: true, documento: true } },
            },
          },
          distribuciones: {
            orderBy: { version: "desc" },
            select: {
              fecha_vigencia_desde: true,
              fecha_vigencia_hasta: true,
              distribucionModulos: {
                select: {
                  moduloHorario: {
                    select: {
                      dia_semana: true,
                      hora_desde: true,
                      hora_hasta: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (incidencias.length === 0) return []

  const incidenciasFiltradas = filtros.agenteId
    ? incidencias.filter(inc => {
        const titularReal = titularVigenteEn(inc.asignacion.titularidades, inc.fecha_desde)
        return titularReal?.id === filtros.agenteId
      })
    : incidencias

  if (incidenciasFiltradas.length === 0) return []

  const primerHijoPorIncidencia = new Map<number, Date>()
  for (const posibleHijo of incidencias) {
    if (!posibleHijo.incidenciaPadreId) continue
    const actual = primerHijoPorIncidencia.get(posibleHijo.incidenciaPadreId)
    if (!actual || posibleHijo.fecha_desde < actual) {
      primerHijoPorIncidencia.set(posibleHijo.incidenciaPadreId, posibleHijo.fecha_desde)
    }
  }

  type TramoRaiz = {
    fechaDesde:   Date
    fechaHasta:   Date
    reemplazante: Agente | null
  }
  const tramosPorIncidencia = new Map<number, TramoRaiz[]>()
  const salienteHistorico = new Map<number, Agente>()
  const entranteActivo    = new Map<number, Agente>()
  // Ventana REAL (ya truncada por la hija, si corresponde) de cada
  // incidencia -- se guarda para poder filtrar el resultado final contra
  // el rango pedido usando la ventana efectiva, no las fechas crudas de
  // Incidencia.fecha_desde/fecha_hasta (que pueden seguir reflejando el
  // rango original de la licencia aunque una hija la haya truncado antes).
  const ventanaRealPorIncidencia = new Map<number, { desde: Date; hasta: Date }>()

  await Promise.all(
    incidenciasFiltradas.map(async (inc) => {
      const inicioHijo = primerHijoPorIncidencia.get(inc.id) ?? null
      let finVentana = inc.fecha_hasta
      if (inicioHijo && inicioHijo <= inc.fecha_hasta) {
        finVentana = new Date(inicioHijo)
        finVentana.setUTCDate(finVentana.getUTCDate() - 1)
      }
      if (finVentana < inc.fecha_desde) return
      ventanaRealPorIncidencia.set(inc.id, { desde: inc.fecha_desde, hasta: finVentana })

      const clases = await prisma.claseProgramada.findMany({
        where: {
          institucionId: tenantId,
          asignacionId:  inc.asignacionId,
          fecha: { gte: inc.fecha_desde, lte: finVentana },
        },
        orderBy: [{ fecha: "asc" }, { modulo: { hora_desde: "asc" } }, { id: "asc" }],
        select: {
          fecha: true,
          reemplazos: {
            orderBy: { id: "asc" },
            select: {
              activo: true,
              agenteSuplente: {
                select: { id: true, nombre: true, apellido: true, documento: true },
              },
            },
          },
        },
      })

      const esRaiz = !inc.incidenciaPadreId

      if (esRaiz) {
        const tramos: TramoRaiz[] = []
        let claveActual: number | null | undefined = undefined
        for (const clase of clases) {
          const activo = clase.reemplazos.find(r => r.activo)?.agenteSuplente ?? null
          const clave  = activo?.id ?? null
          if (claveActual === undefined || clave !== claveActual) {
            tramos.push({ fechaDesde: clase.fecha, fechaHasta: clase.fecha, reemplazante: activo })
            claveActual = clave
          } else {
            tramos[tramos.length - 1].fechaHasta = clase.fecha
          }
        }
        if (tramos.length === 0) {
          tramos.push({ fechaDesde: inc.fecha_desde, fechaHasta: finVentana, reemplazante: null })
        }
        tramosPorIncidencia.set(inc.id, tramos)
      } else {
        for (const clase of clases) {
          if (clase.reemplazos.length === 0) continue
          const inactivos = clase.reemplazos.filter(r => !r.activo)
          const saliente   = inactivos[inactivos.length - 1] ?? null
          const activo     = clase.reemplazos.find(r => r.activo)
          if (saliente?.agenteSuplente && !salienteHistorico.has(inc.id)) {
            salienteHistorico.set(inc.id, saliente.agenteSuplente)
          }
          if (activo?.agenteSuplente && !entranteActivo.has(inc.id)) {
            entranteActivo.set(inc.id, activo.agenteSuplente)
          }
          break
        }
      }
    })
  )

  const filas: FilaAusencia[] = []

  for (const inc of incidenciasFiltradas) {
    const esRaiz  = !inc.incidenciaPadreId
    const titular = titularVigenteEn(inc.asignacion.titularidades, inc.fecha_desde)
    const dist    = distribucionVigenteEn(inc.asignacion.distribuciones, inc.fecha_desde)
    const modulos = dist?.distribucionModulos.map(dm => dm.moduloHorario) ?? []
    const distribucion = formatearDistribucion(modulos)

    const base = {
      incidenciaId:      inc.id,
      incidenciaPadreId: inc.incidenciaPadreId,
      esRaiz,
      codigoArt:     inc.codigarioItem?.codigo ?? "-",
      nombreArt:     inc.codigarioItem?.nombre ?? "-",
      identificador: inc.asignacion.identificadorEstructural,
      materia:       inc.asignacion.materia?.nombre ?? null,
      comision:      inc.asignacion.comision?.nombre ?? null,
      distribucion,
    }

    if (esRaiz) {
      const tramos = tramosPorIncidencia.get(inc.id) ?? []
      const titularDNI    = titular?.documento ?? "-"
      const titularNombre = titular ? `${titular.apellido}, ${titular.nombre}` : "Vacante"
      tramos.forEach((tramo, i) => {
        filas.push({
          ...base,
          tramoIndex:  i,
          totalTramos: tramos.length,
          fechaDesde:  tramo.fechaDesde,
          fechaHasta:  tramo.fechaHasta,
          titularDNI,
          titularNombre,
          reemplazante: tramo.reemplazante
            ? { nombre: `${tramo.reemplazante.apellido}, ${tramo.reemplazante.nombre}`, documento: tramo.reemplazante.documento }
            : null,
        })
      })
    } else {
      const saliente = salienteHistorico.get(inc.id) ?? null
      const entrante = entranteActivo.get(inc.id) ?? null
      const titularDNI    = saliente?.documento ?? "-"
      const titularNombre = saliente ? `${saliente.apellido}, ${saliente.nombre}` : "Sin datos"
      const ventanaReal = ventanaRealPorIncidencia.get(inc.id)
      filas.push({
        ...base,
        tramoIndex:  0,
        totalTramos: 1,
        fechaDesde:  ventanaReal?.desde ?? inc.fecha_desde,
        fechaHasta:  ventanaReal?.hasta ?? inc.fecha_hasta,
        titularDNI,
        titularNombre,
        reemplazante: entrante
          ? { nombre: `${entrante.apellido}, ${entrante.nombre}`, documento: entrante.documento }
          : null,
      })
    }
  }

  // Filtro final contra el rango pedido, usando las fechas REALES ya
  // calculadas de cada tramo/fila (no las crudas de Incidencia), para no
  // arrastrar incidencias que técnicamente "solapan" el rango por su
  // fecha_hasta original, pero cuya ventana efectiva (truncada por una
  // hija) ya terminó antes de que empezara el período consultado.
  return filas.filter(f => f.fechaHasta >= filtros.desde && f.fechaDesde <= filtros.hasta)
}