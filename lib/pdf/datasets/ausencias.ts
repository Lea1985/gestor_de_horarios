// lib/pdf/datasets/ausencias.ts
import prisma from "@/lib/prisma"
import { titularVigenteEn } from "./titularVigenteEn"
export type FilaAusencia = {
  incidenciaId:      number
  incidenciaPadreId: number | null
  esRaiz:            boolean
  fechaDesde:        Date
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

/**
 * Mismo criterio que titularVigenteEn, pero para distribuciones horarias:
 * busca la versión que estaba vigente en una fecha puntual, no la
 * actualmente activa. Necesario porque una distribución puede haberse
 * reemplazado o eliminado DESPUÉS de la fecha de la incidencia que se
 * está reportando -- si filtráramos por "activo/deletedAt actuales",
 * perderíamos la carga horaria histórica real (bug encontrado 17/08/2026,
 * incidencia #5: la distribución vigente el 04/08 fue borrada el 05/08,
 * y el reporte mostraba "-" en vez del horario real).
 */
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
  // Traer incidencias en el rango con sus datos.
  // Ojo: cuando se filtra por agenteId, acá solo se hace un filtro AMPLIO
  // ("tuvo alguna vez a este agente como titular"), sin importar si estaba
  // activo o si la fecha coincide -- el filtro preciso (vigente en la
  // fecha real de cada incidencia) se hace después, en JS, porque Prisma
  // no puede correlacionar la fecha del titular contra la fecha de la
  // incidencia padre en un único filtro anidado.
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
  // Filtro preciso por agente: se queda solo con las incidencias donde el
  // titular REALMENTE vigente en la fecha de esa incidencia puntual (no el
  // titular actual) coincide con el agente buscado.
  const incidenciasFiltradas = filtros.agenteId
    ? incidencias.filter(inc => {
        const titularReal = titularVigenteEn(inc.asignacion.titularidades, inc.fecha_desde)
        return titularReal?.id === filtros.agenteId
      })
    : incidencias
  if (incidenciasFiltradas.length === 0) return []
  // Ventana exclusiva de cada incidencia: si tiene una hija que arranca
  // dentro de su propio rango (cadena), las clases desde ese punto en
  // adelante reflejan el estado de la HIJA, no el de esta incidencia --
  // se busca en TODAS las incidencias traídas (no solo las filtradas por
  // agente), porque la hija puede quedar afuera del filtro por agente
  // aunque su fecha de inicio siga siendo relevante para acotar la ventana
  // del padre.
  const primerHijoPorIncidencia = new Map<number, Date>()
  for (const posibleHijo of incidencias) {
    if (!posibleHijo.incidenciaPadreId) continue
    const actual = primerHijoPorIncidencia.get(posibleHijo.incidenciaPadreId)
    if (!actual || posibleHijo.fecha_desde < actual) {
      primerHijoPorIncidencia.set(posibleHijo.incidenciaPadreId, posibleHijo.fecha_desde)
    }
  }
  const salienteHistorico = new Map<number, Agente>()
  const entranteActivo    = new Map<number, Agente>()
  await Promise.all(
    incidenciasFiltradas.map(async (inc) => {
      const inicioHijo = primerHijoPorIncidencia.get(inc.id) ?? null
      let finVentana = inc.fecha_hasta
      if (inicioHijo && inicioHijo <= inc.fecha_hasta) {
        finVentana = new Date(inicioHijo)
        finVentana.setUTCDate(finVentana.getUTCDate() - 1)
      }
      // La hija arranca el mismo día que esta incidencia (o antes) -- no
      // hay ventana propia, no hay datos confiables que mostrar para ella.
      if (finVentana < inc.fecha_desde) return
      const clases = await prisma.claseProgramada.findMany({
        where: {
          institucionId: tenantId,
          asignacionId:  inc.asignacionId,
          fecha: { gte: inc.fecha_desde, lte: finVentana },
        },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
        select: {
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
      for (const clase of clases) {
        if (clase.reemplazos.length === 0) continue
        // El "saliente" es el último desactivado antes del actual (no el
        // primero jamás creado) -- en una cadena de 3+ niveles, el primero
        // histórico y el inmediatamente anterior son personas distintas.
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
    })
  )
  const filas: FilaAusencia[] = incidenciasFiltradas.map(inc => {
    const esRaiz   = !inc.incidenciaPadreId
    const titular  = titularVigenteEn(inc.asignacion.titularidades, inc.fecha_desde)
    const dist     = distribucionVigenteEn(inc.asignacion.distribuciones, inc.fecha_desde)
    const modulos = dist?.distribucionModulos.map(dm => dm.moduloHorario) ?? []
    const distribucion = formatearDistribucion(modulos)
    let titularDNI:    string
    let titularNombre: string
    let reemplazante:  { nombre: string; documento: string } | null
    if (esRaiz) {
      titularDNI    = titular?.documento ?? "-"
      titularNombre = titular ? `${titular.apellido}, ${titular.nombre}` : "Vacante"
      const r = salienteHistorico.get(inc.id) ?? null
      reemplazante = r ? { nombre: `${r.apellido}, ${r.nombre}`, documento: r.documento } : null
    } else {
      const saliente = salienteHistorico.get(inc.id) ?? null
      titularDNI    = saliente?.documento ?? "-"
      titularNombre = saliente ? `${saliente.apellido}, ${saliente.nombre}` : "Sin datos"
      const entrante = entranteActivo.get(inc.id) ?? null
      reemplazante = entrante ? { nombre: `${entrante.apellido}, ${entrante.nombre}`, documento: entrante.documento } : null
    }
    return {
      incidenciaId:      inc.id,
      incidenciaPadreId: inc.incidenciaPadreId,
      esRaiz,
      fechaDesde:    inc.fecha_desde,
      fechaHasta:    inc.fecha_hasta,
      codigoArt:     inc.codigarioItem?.codigo ?? "-",
      nombreArt:     inc.codigarioItem?.nombre ?? "-",
      titularDNI,
      titularNombre,
      identificador: inc.asignacion.identificadorEstructural,
      materia:       inc.asignacion.materia?.nombre ?? null,
      comision:      inc.asignacion.comision?.nombre ?? null,
      distribucion,
      reemplazante,
    }
  })
  return filas
}