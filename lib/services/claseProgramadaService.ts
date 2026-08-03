// lib/services/claseProgramadaService.ts
//
// Única fuente de verdad para crear, suspender y resolver cobertura de
// ClaseProgramada. Ningún usecase debe llamar a prisma.claseProgramada.*
// directamente para generación/suspensión masiva — todos pasan por acá.
//
// Garantías que este servicio ofrece:
//  1. generarParaRango es idempotente (skipDuplicates + @@unique real en DB).
//  2. resolverCoberturaDelTramo evalúa el tramo EXACTO pedido, no por incidencia.
//  3. suspenderNoVigentes nunca elimina: solo cambia Estado/Causa. La historia
//     y la identidad de cada ClaseProgramada se preservan siempre.

import prisma from "@/lib/prisma"
import { EstadoClase, Causa, Dias } from "@prisma/client"
import { generarClases } from "@/lib/helpers/clases"
import { claseProgramadaRepository } from "@/lib/repositories/claseProgramadaRepository"
import type { RangoGeneracion } from "@/lib/types/claseProgramada"

export class RangoInvalidoError extends Error {
  constructor() { super("desde debe ser menor o igual a hasta") }
}

export type TramoReemplazo = {
  desde: string
  hasta: string
  totalClases: number
  clasesConReemplazo: number
  migrable: boolean
  suplente: { asignacionTitularId: number; agenteSuplenteId: number; nombre: string } | null
}

function normalizarRango(desde: Date, hasta: Date) {
  const d = new Date(desde); d.setUTCHours(0, 0, 0, 0)
  const h = new Date(hasta); h.setUTCHours(23, 59, 59, 999)
  if (d > h) throw new RangoInvalidoError()
  return { desde: d, hasta: h }
}

export const claseProgramadaService = {

  /**
   * Genera las clases faltantes para una asignación en un rango, a partir
   * de los módulos de una distribución y el calendario del período dado.
   * Idempotente: si ya existen, no las duplica (skipDuplicates + unique en DB).
   */
  async generarParaRango(params: RangoGeneracion & {
    distribucionId: number
    periodoId:      number
  }) {
    const { institucionId, asignacionId, unidadId, comisionId, distribucionId, periodoId } = params
    const { desde, hasta } = normalizarRango(params.desde, params.hasta)

    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: { id: distribucionId, institucionId, deletedAt: null },
      include: { distribucionModulos: { include: { moduloHorario: true } } },
    })
    if (!distribucion) return { creadas: 0, saltadasPorExistentes: 0 }

    const modulos = distribucion.distribucionModulos.map(dm => dm.moduloHorario)

    if (modulos.length === 0) return { creadas: 0, saltadasPorExistentes: 0 }

    const feriados = await claseProgramadaRepository.listarFeriados(
      institucionId, periodoId, desde, hasta
    )

    const clases = generarClases({
      institucionId,
      asignacionId,
      unidadId,
      comisionId,
      incidenciaId: null,
      modulos,
      desde,
      hasta,
      diasSuspendidos: feriados,
    })

    if (clases.length === 0) return { creadas: 0, saltadasPorExistentes: 0 }

    const result = await prisma.claseProgramada.createMany({
      data: clases,
      skipDuplicates: true, // se apoya en el @@unique real de la tabla
    })

    return {
      creadas: result.count,
      saltadasPorExistentes: clases.length - result.count,
    }
  },

  /**
   * Reconcilia el tramo contra la nueva lista de módulos cuando cambia la
   * distribución, en las dos direcciones:
   *   - SUSPENDE (causa CAMBIO_DISTRIBUCION) las clases que ya no corresponden.
   *   - REACTIVA (PROGRAMADA, causa NINGUNA) las que habíamos suspendido por
   *     CAMBIO_DISTRIBUCION en un cambio anterior y que vuelven a corresponder
   *     (ej. lunes -> martes -> lunes: al volver a lunes, se reactivan solas).
   * Las que ya estaban vigentes y siguen vigentes quedan intactas (para que
   * generarParaRango las reutilice via skipDuplicates, sin duplicar).
   *
   * No toca DICTADA. No toca el Reemplazo asociado a las clases que cambian
   * de estado en ninguna dirección (se deja intacto a propósito, como
   * historial, hasta definir si necesita un estado propio a futuro).
   */
  async suspenderNoVigentes(params: RangoGeneracion & {
    modulosNuevos: { id: number; dia_semana: Dias }[]
  }) {
    const { institucionId, asignacionId, unidadId, comisionId, modulosNuevos } = params
    const { desde, hasta } = normalizarRango(params.desde, params.hasta)

    const clavesEsperadas = modulosNuevos.length === 0
      ? new Set<string>()
      : new Set(
          generarClases({
            institucionId,
            asignacionId,
            unidadId,
            comisionId,
            incidenciaId: null,
            modulos: modulosNuevos,
            desde,
            hasta,
            diasSuspendidos: [],
          }).map(c => `${c.fecha.toISOString().slice(0, 10)}-${c.moduloId ?? "null"}`)
        )

    const existentes = await prisma.claseProgramada.findMany({
      where: {
        asignacionId,
        fecha: { gte: desde, lte: hasta },
        estado: { in: [EstadoClase.PROGRAMADA, EstadoClase.SUSPENDIDA, EstadoClase.REEMPLAZADA] },
      },
      select: { id: true, fecha: true, moduloId: true, estado: true, causa: true },
    })

    const idsASuspender = existentes
      .filter(c => {
        // Protegidas: una clase cuya causa actual es INCIDENCIA no se toca acá.
        // INCIDENCIA está por encima de CAMBIO_DISTRIBUCION en la precedencia
        // del motor -- confirmado con datos reales que sin este filtro se
        // pisaba silenciosamente la causa real al reasignar módulos.
        if (c.causa === Causa.INCIDENCIA) return false
        const clave = `${c.fecha.toISOString().slice(0, 10)}-${c.moduloId ?? "null"}`
        return !clavesEsperadas.has(clave)
      })
      .map(c => c.id)

    const idsAReactivar = existentes
      .filter(c => {
        const clave = `${c.fecha.toISOString().slice(0, 10)}-${c.moduloId ?? "null"}`
        return c.estado === EstadoClase.SUSPENDIDA
          && c.causa === Causa.CAMBIO_DISTRIBUCION
          && clavesEsperadas.has(clave)
      })
      .map(c => c.id)

    if (idsASuspender.length === 0 && idsAReactivar.length === 0) {
      return { suspendidas: 0, reactivadas: 0 }
    }

    const [rSuspender, rReactivar] = await Promise.all([
      idsASuspender.length > 0
        ? prisma.claseProgramada.updateMany({
            where: { id: { in: idsASuspender } },
            data:  { estado: EstadoClase.SUSPENDIDA, causa: Causa.CAMBIO_DISTRIBUCION },
          })
        : Promise.resolve({ count: 0 }),
      idsAReactivar.length > 0
        ? prisma.claseProgramada.updateMany({
            where: { id: { in: idsAReactivar } },
            data:  { estado: EstadoClase.PROGRAMADA, causa: Causa.NINGUNA },
          })
        : Promise.resolve({ count: 0 }),
    ])

    return { suspendidas: rSuspender.count, reactivadas: rReactivar.count }
  },

  /**
   * Evalúa el tramo EXACTO [desde, hasta] de una asignación (no por incidencia
   * individual) y determina si un único suplente cubre el 100% de las clases
   * con reemplazo activo en ese tramo. Se usa para decidir si se puede
   * "mantener el reemplazo" al modificar/eliminar una distribución.
   */
  async resolverCoberturaDelTramo(params: {
    asignacionId: number
    desde: Date
    hasta: Date
  }): Promise<TramoReemplazo[]> {
    const { desde, hasta } = normalizarRango(params.desde, params.hasta)

    const clases = await prisma.claseProgramada.findMany({
      where: {
        asignacionId: params.asignacionId,
        fecha: { gte: desde, lte: hasta },
      },
      orderBy: { fecha: "asc" },
      select: {
        fecha: true,
        reemplazos: {
          where: { activo: true },
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            asignacionTitularId: true,
            agenteSuplenteId: true,
            agenteSuplente: { select: { nombre: true, apellido: true } },
          },
        },
      },
    })

    if (clases.length === 0) return []

    const totalClases = clases.length
    const conReemplazo = clases.filter(c => c.reemplazos.length > 0)
    const suplentesUnicos = new Set(
      conReemplazo.map(c => `${c.reemplazos[0].asignacionTitularId}-${c.reemplazos[0].agenteSuplenteId}`)
    )

    const migrable = conReemplazo.length === totalClases && suplentesUnicos.size === 1

    if (conReemplazo.length === 0) return []

    const r = conReemplazo[0].reemplazos[0]

    return [{
      desde: clases[0].fecha.toISOString().slice(0, 10),
      hasta: clases[clases.length - 1].fecha.toISOString().slice(0, 10),
      totalClases,
      clasesConReemplazo: conReemplazo.length,
      migrable,
      suplente: migrable ? {
        asignacionTitularId: r.asignacionTitularId,
        agenteSuplenteId:    r.agenteSuplenteId,
        nombre: `${r.agenteSuplente.apellido}, ${r.agenteSuplente.nombre}`,
      } : null,
    }]
  },

  /**
   * Aplica el suplente detectado como migrable a las clases nuevas generadas
   * para el mismo rango (ya deben existir, generadas por generarParaRango).
   */
  async migrarReemplazoATramo(params: {
    asignacionId: number
    desde: Date
    hasta: Date
    asignacionTitularId: number
    agenteSuplenteId: number
  }) {
    const { desde, hasta } = normalizarRango(params.desde, params.hasta)

    const clasesNuevas = await prisma.claseProgramada.findMany({
      where: {
        asignacionId: params.asignacionId,
        estado: EstadoClase.PROGRAMADA,
        fecha: { gte: desde, lte: hasta },
      },
      select: { id: true },
    })
    if (clasesNuevas.length === 0) return { migradas: 0 }

    const ids = clasesNuevas.map(c => c.id)

    await prisma.$transaction(async (tx) => {
      await tx.claseProgramada.updateMany({
        where: { id: { in: ids } },
        data:  { estado: EstadoClase.REEMPLAZADA },
      })
      await tx.reemplazo.createMany({
        data: ids.map(claseId => ({
          claseId,
          asignacionTitularId: params.asignacionTitularId,
          agenteSuplenteId:    params.agenteSuplenteId,
          observacion:         "Migrado automáticamente al modificar la distribución",
          activo:              true,
        })),
      })
    })

    return { migradas: ids.length }
  },

  /**
   * Revisita clases ya generadas en una fecha puntual cuando se agrega o
   * modifica un CalendarioEscolar con suspendeClases=true dentro de un
   * período. Solo toca PROGRAMADA -> SUSPENDIDA (no pisa REEMPLAZADA/DICTADA
   * ni clases suspendidas por otra causa de mayor precedencia).
   */
  async recalcularSuspendidasPorCalendario(params: {
    institucionId: number
    calendarioEscolarId: number
    fecha: Date
    suspende: boolean
  }) {
    const fecha = new Date(params.fecha)
    fecha.setUTCHours(0, 0, 0, 0)
    const finDia = new Date(fecha)
    finDia.setUTCHours(23, 59, 59, 999)

    if (params.suspende) {
      const r = await prisma.claseProgramada.updateMany({
        where: {
          institucionId: params.institucionId,
          fecha: { gte: fecha, lte: finDia },
          estado: EstadoClase.PROGRAMADA,
        },
        data: {
          estado: EstadoClase.SUSPENDIDA,
          causa:  Causa.CALENDARIO_ESCOLAR,
          calendarioEscolarId: params.calendarioEscolarId,
        },
      })
      return { actualizadas: r.count }
    } else {
      const r = await prisma.claseProgramada.updateMany({
        where: {
          institucionId: params.institucionId,
          fecha: { gte: fecha, lte: finDia },
          estado: EstadoClase.SUSPENDIDA,
          causa:  Causa.CALENDARIO_ESCOLAR,
          calendarioEscolarId: params.calendarioEscolarId,
        },
        data: {
          estado: EstadoClase.PROGRAMADA,
          causa:  Causa.NINGUNA,
          calendarioEscolarId: null,
        },
      })
      return { actualizadas: r.count }
    }
  },

  /**
   * Reconcilia TODAS las clases de la institución contra el período recién
   * activado. No usa el Motor de Resolución clase por clase (por escala
   * institucional) -- expresa la misma tabla de precedencia en 3
   * actualizaciones en lote, aprovechando que PERIODO_OPERATIVO solo tiene
   * dos desenlaces (dentro/fuera de rango) y una posición fija: pierde
   * contra INCIDENCIA y CAMBIO_DISTRIBUCION, gana contra CALENDARIO_ESCOLAR
   * y NINGUNA.
   *
   * No toca DICTADA -- es historia, el motor nunca la re-resuelve.
   */
  async reconciliarPorPeriodoOperativo(params: {
    institucionId: number
    desde: Date
    hasta: Date
  }) {
    const { institucionId, desde, hasta } = params
    const causasQueGanan = [Causa.INCIDENCIA, Causa.CAMBIO_DISTRIBUCION]

    const suspendidas = await prisma.claseProgramada.updateMany({
      where: {
        institucionId,
        estado: { not: EstadoClase.DICTADA },
        causa:  { notIn: [...causasQueGanan, Causa.PERIODO_OPERATIVO] },
        OR: [{ fecha: { lt: desde } }, { fecha: { gt: hasta } }],
      },
      data: {
        estado: EstadoClase.SUSPENDIDA,
        causa:  Causa.PERIODO_OPERATIVO,
        versionResolucion: { increment: 1 },
      },
    })

    const revertidasACalendario = await prisma.claseProgramada.updateMany({
      where: {
        institucionId,
        causa: Causa.PERIODO_OPERATIVO,
        calendarioEscolarId: { not: null },
        fecha: { gte: desde, lte: hasta },
      },
      data: {
        estado: EstadoClase.SUSPENDIDA,
        causa:  Causa.CALENDARIO_ESCOLAR,
        versionResolucion: { increment: 1 },
      },
    })

    const revertidasAProgramada = await prisma.claseProgramada.updateMany({
      where: {
        institucionId,
        causa: Causa.PERIODO_OPERATIVO,
        calendarioEscolarId: null,
        fecha: { gte: desde, lte: hasta },
      },
      data: {
        estado: EstadoClase.PROGRAMADA,
        causa:  Causa.NINGUNA,
        versionResolucion: { increment: 1 },
      },
    })

    return {
      suspendidasPorPeriodo: suspendidas.count,
      revertidasACalendario: revertidasACalendario.count,
      revertidasAProgramada: revertidasAProgramada.count,
    }
  },

  async vincularIncidencia(params: {
    asignacionId: number
    incidenciaId: number
    desde: Date
    hasta: Date
  }): Promise<{ ids: number[] }> {
    const { desde, hasta } = normalizarRango(params.desde, params.hasta)
    const clases = await prisma.claseProgramada.findMany({
      where: {
        asignacionId: params.asignacionId,
        fecha: { gte: desde, lte: hasta },
        estado: { not: EstadoClase.DICTADA },
      },
      select: { id: true },
    })
    if (clases.length === 0) return { ids: [] }

    await prisma.claseProgramada.updateMany({
      where: { id: { in: clases.map(c => c.id) } },
      data:  { incidenciaId: params.incidenciaId },
    })
    return { ids: clases.map(c => c.id) }
  },

  /**
   * Desvincula una incidencia (eliminada) de sus ClaseProgramada. El llamador
   * debe volver a resolver cada clase devuelta (normalmente vía resolverClase).
   */
  async desvincularIncidencia(incidenciaId: number): Promise<{ ids: number[] }> {
    const clases = await prisma.claseProgramada.findMany({
      where: { incidenciaId, estado: { not: EstadoClase.DICTADA } },
      select: { id: true },
    })
    if (clases.length === 0) return { ids: [] }

    await prisma.claseProgramada.updateMany({
      where: { id: { in: clases.map(c => c.id) } },
      data:  { incidenciaId: null },
    })
    return { ids: clases.map(c => c.id) }
  },
}