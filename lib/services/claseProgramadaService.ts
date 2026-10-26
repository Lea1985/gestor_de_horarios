// lib/services/claseProgramadaService.ts
//
// Única fuente de verdad para crear, suspender y resolver cobertura de
// ClaseProgramada. Ningún usecase debe llamar a prisma.claseProgramada.*
// directamente para generación/suspensión masiva — todos pasan por acá.
//
// Garantías que este servicio ofrece:
//  1. generarParaRango es idempotente (skipDuplicates + @@unique real en DB).
//  2. Nunca elimina clases: solo cambia Estado/Causa. La historia y la
//     identidad de cada ClaseProgramada se preservan siempre.
//
// Los cambios de módulos, versiones y bajas de una asignación pasan por
// reconciliarAsignacion (reconciliacionService), no por atajos en lote.

import prisma from "@/lib/prisma"
import { EstadoClase, Causa } from "@prisma/client"
import { generarClases } from "@/lib/helpers/clases"
import { claseProgramadaRepository } from "@/lib/repositories/claseProgramadaRepository"
import type { RangoGeneracion } from "@/lib/types/claseProgramada"
import type { Db } from "@/lib/types/db"
import { resolverClase } from "@/lib/services/resolucionClaseService"

export class RangoInvalidoError extends Error {
  constructor() { super("desde debe ser menor o igual a hasta") }
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
   *
   * Cada clase nueva se vincula a la licencia activa de la asignación que
   * cubre su fecha (si hay varias, la de id más alto: mismo criterio que
   * desvincularIncidencia) y pasa por el motor, que decide su estado/causa
   * final -- antes nacían sin licencia y PROGRAMADA (bug 3 del piloto).
   * Con db, todo corre dentro de la transacción del llamador.
   */
  async generarParaRango(params: RangoGeneracion & {
    distribucionId: number
    periodoId:      number
  }, db: Db = prisma) {
    const { institucionId, asignacionId, unidadId, comisionId, distribucionId, periodoId } = params
    const { desde, hasta } = normalizarRango(params.desde, params.hasta)
    const vacio = { creadas: 0, saltadasPorExistentes: 0, ids: [] as number[] }

    const distribucion = await db.distribucionHoraria.findFirst({
      where: { id: distribucionId, institucionId, deletedAt: null },
      include: { distribucionModulos: { include: { moduloHorario: true } } },
    })
    if (!distribucion) return vacio

    const modulos = distribucion.distribucionModulos.map(dm => dm.moduloHorario)

    if (modulos.length === 0) return vacio

    const feriados = await claseProgramadaRepository.listarFeriados(
      institucionId, periodoId, desde, hasta, db
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

    if (clases.length === 0) return vacio

    const creadas = await db.claseProgramada.createManyAndReturn({
      data: clases,
      skipDuplicates: true, // se apoya en el @@unique real de la tabla
      select: { id: true, fecha: true },
    })

    if (creadas.length > 0) {
      const licencias = await db.incidencia.findMany({
        where: {
          asignacionId,
          activo:      true,
          deletedAt:   null,
          fecha_desde: { lte: hasta },
          fecha_hasta: { gte: desde },
        },
        orderBy: { id: "desc" },
        select:  { id: true, fecha_desde: true, fecha_hasta: true },
      })
      const porLicencia = new Map<number, number[]>()
      for (const clase of creadas) {
        const licencia = licencias.find(l => l.fecha_desde <= clase.fecha && clase.fecha <= l.fecha_hasta)
        if (!licencia) continue
        porLicencia.set(licencia.id, [...(porLicencia.get(licencia.id) ?? []), clase.id])
      }
      for (const [incidenciaId, ids] of porLicencia) {
        await db.claseProgramada.updateMany({ where: { id: { in: ids } }, data: { incidenciaId } })
      }
      for (const clase of creadas) {
        await resolverClase(clase.id, institucionId, db)
      }
    }

    return {
      creadas: creadas.length,
      saltadasPorExistentes: clases.length - creadas.length,
      ids: creadas.map(c => c.id),
    }
  },

/**
   * Re-resuelve todas las clases de una institución en una fecha puntual
   * cuando se crea, elimina o reactiva un evento de CalendarioEscolar que
   * suspende clases. Reemplaza la versión anterior (bulk-update manual
   * limitado a estado: PROGRAMADA, que por eso nunca alcanzaba a las
   * clases ya DICTADA -- confirmado con datos reales el 06/08/2026).
   *
   * Delega en resolverClase por cada clase: ya consulta en vivo contra
   * CalendarioEscolar (fix de Bug 5) y respeta toda la tabla de
   * precedencia (INCIDENCIA, PERIODO_OPERATIVO, fechaYaPaso), sin
   * necesidad de indicarle una dirección "suspende sí/no" -- el motor la
   * deduce solo a partir del estado actual de la base.
   */
  async resolverClasesPorCalendario(params: {
    institucionId: number
    fecha:         Date
  }) {
    const inicioDia = new Date(params.fecha)
    inicioDia.setUTCHours(0, 0, 0, 0)
    const finDia = new Date(params.fecha)
    finDia.setUTCHours(23, 59, 59, 999)
    const clases = await prisma.claseProgramada.findMany({
      where: {
        institucionId: params.institucionId,
        fecha: { gte: inicioDia, lte: finDia },
      },
      select: { id: true },
    })
    let actualizadas = 0
    for (const clase of clases) {
      const r = await resolverClase(clase.id, params.institucionId)
      if (r.actualizada) actualizadas++
    }
    return { actualizadas }
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
    }, db: Db = prisma): Promise<{ ids: number[] }> {
      const { desde, hasta } = normalizarRango(params.desde, params.hasta)
      const clases = await db.claseProgramada.findMany({
        where: {
          asignacionId: params.asignacionId,
          fecha: { gte: desde, lte: hasta },
          // Solo clases vivas: las dadas de baja (FIN_ASIGNACION,
          // CAMBIO_DISTRIBUCION) no se vinculan -- esas causas le ganan a la
          // incidencia en el motor, y vincularlas solo dejaba un vínculo
          // engañoso (bugs 4 y 16 del piloto). Incluye DICTADA: una incidencia
          // cargada el mismo día (o retroactiva) tiene que poder cubrir una
          // clase que ya se resolvió a DICTADA; con incidenciaId seteado,
          // INCIDENCIA le gana a DICTADA en la tabla de precedencia.
          causa: { notIn: [Causa.FIN_ASIGNACION, Causa.CAMBIO_DISTRIBUCION] },
        },
        select: { id: true },
      })
      if (clases.length === 0) return { ids: [] }
      await db.claseProgramada.updateMany({
        where: { id: { in: clases.map(c => c.id) } },
        data:  { incidenciaId: params.incidenciaId },
      })
      return { ids: clases.map(c => c.id) }
    },

  /**
   * Desvincula una incidencia (eliminada) de sus ClaseProgramada.
   *
   * Antes de soltar el vínculo, busca si hay otra incidencia ACTIVA de la
   * misma asignación que también cubra esa fecha (ej. la ancestra en la
   * cadena, de rango más amplio) y, si la hay, reclama la clase para ella
   * en vez de dejarla huérfana. Esto replica la misma semántica que ya
   * rige en la creación (vincularIncidencia pisa el incidenciaId anterior
   * sin preguntar: "la incidencia más reciente que cubre la fecha manda").
   * Si hay más de una candidata activa, gana la de id más alto (la creada
   * más recientemente), consistente con ese mismo criterio.
   *
   * Confirmado con datos reales el 26/08/2026: al eliminar una incidencia
   * hija de un solo día (creada para una "causa imprevista" puntual
   * dentro de la ventana de una incidencia padre más amplia), las clases
   * de ese día quedaban con incidenciaId null -- y el motor de resolución,
   * que confía en ese campo cacheado, las resolvía como si nunca hubiera
   * habido ninguna incidencia (DICTADA en vez de SUSPENDIDA/causa
   * INCIDENCIA), aunque la incidencia padre siguiera activa y cubriendo
   * esa misma fecha.
   *
   * El llamador debe volver a resolver cada clase devuelta (normalmente
   * vía resolverClase) para que el estado/causa reflejen el vínculo nuevo.
   *
   * Las DICTADA vinculadas solo pierden el vínculo (incidenciaId = null, sin
   * reclamante): no se devuelven ni cambian de estado -- antes se excluían
   * y quedaban ligadas a una incidencia eliminada.
   */
  async desvincularIncidencia(incidenciaId: number): Promise<{ ids: number[] }> {
    await prisma.claseProgramada.updateMany({
      where: { incidenciaId, estado: EstadoClase.DICTADA },
      data:  { incidenciaId: null },
    })
    const clases = await prisma.claseProgramada.findMany({
      where: { incidenciaId, estado: { not: EstadoClase.DICTADA } },
      select: { id: true, fecha: true, asignacionId: true },
    })
    if (clases.length === 0) return { ids: [] }

    await Promise.all(clases.map(async (clase) => {
      const reclamante = await prisma.incidencia.findFirst({
        where: {
          asignacionId: clase.asignacionId,
          activo:       true,
          deletedAt:    null,
          id:           { not: incidenciaId },
          fecha_desde:  { lte: clase.fecha },
          fecha_hasta:  { gte: clase.fecha },
        },
        orderBy: { id: "desc" },
        select:  { id: true },
      })
      await prisma.claseProgramada.update({
        where: { id: clase.id },
        data:  { incidenciaId: reclamante?.id ?? null },
      })
    }))

    return { ids: clases.map(c => c.id) }
  },
  
}