// lib/services/reconciliacionService.ts
//
// Reconciliación de una asignación (plan de la Fase 3, 3.3): deja las clases
// del rango [desde, hasta] coherentes con lo que rige en cada fecha
// (asignación, versiones de distribución, licencias, calendario, período),
// usando el motor de resolución para cada clase. Reemplaza a los atajos en
// lote (suspenderNoVigentes, la reactivación de reactivarDistribucion,
// migrarReemplazoATramo y suspenderPorFinAsignacion).
//
// Pasos:
//  1. Genera las clases que faltan de cada versión de distribución vigente en
//     el rango (generarParaRango vincula la licencia y resuelve cada una).
//  2. Re-resuelve cada clase existente del rango. Todo cambio de estado/causa
//     en una clase anterior a hoy (salvo PROGRAMADA -> DICTADA, que es el
//     paso natural del tiempo) reescribe el pasado y exige confirmación
//     explícita (reescribirDictadas), igual que las clases pasadas nuevas.
//  3. Anula los reemplazos activos de clases de hoy en adelante que dejaron de
//     existir (FIN_ASIGNACION, CAMBIO_DISTRIBUCION), con confirmación
//     (confirmarAnulacion). Los de fechas pasadas se conservan.
//  Lo ya terminado no se reescribe por un cambio que rige desde hoy: con
//  desde >= hoy y sin reescribirDictadas, las clases de hoy cuyo horario ya
//  terminó (claseTermino) no se generan ni se tocan (ni estado ni
//  reemplazos), salvo PROGRAMADA -> DICTADA, el paso del tiempo. Todo se
//  decide con un único "ahora", tomado al inicio.
//  4. Con mantenerReemplazo, cubre con el suplente de la licencia las clases
//     nuevas o revividas de esa licencia, solo si tenía un único suplente y
//     sin superposición. Las que quedan sin cobertura se listan.
//
// Sin la confirmación que hace falta, se lanza RequiereConfirmacionError con
// el aviso completo: como todo corre en una transacción, se revierte y el
// aviso refleja exactamente lo que el cambio iba a producir.
import prisma from "@/lib/prisma"
import { EstadoClase, Causa } from "@prisma/client"
import type { Db } from "@/lib/types/db"
import { claseTermino, hoyLocal } from "@/lib/helpers/fechaInstitucion"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import { resolverClase } from "@/lib/services/resolucionClaseService"
import { validarSuperposicionSuplente } from "@/lib/usecases/reemplazos/validarSuperposicion"

// La reconciliación de un período completo resuelve cientos de clases.
export const OPCIONES_TRANSACCION = { maxWait: 10_000, timeout: 120_000 }

const DIA_MS = 24 * 60 * 60 * 1000
const CAUSAS_MUERTAS: Causa[] = [Causa.FIN_ASIGNACION, Causa.CAMBIO_DISTRIBUCION]

const diaDe = (fecha: Date) =>
  new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()))
const finDelDia = (dia: Date) => new Date(dia.getTime() + DIA_MS - 1)
const iso = (fecha: Date) => fecha.toISOString().slice(0, 10)
const nombreDe = (a: { apellido: string; nombre: string }) => `${a.apellido}, ${a.nombre}`
const maximo = (...fechas: Date[]) => new Date(Math.max(...fechas.map(f => f.getTime())))
const minimo = (...fechas: Date[]) => new Date(Math.min(...fechas.map(f => f.getTime())))

export type ClaseAfectada = { claseId: number; fecha: string; moduloId: number | null }
export type ReemplazoAAnular = ClaseAfectada & {
  reemplazoId:      number
  agenteSuplenteId: number
  suplente:         string
  incidenciaId:     number | null
}
export type DictadaAReescribir = ClaseAfectada & { estado: EstadoClase; causa: Causa }
// Clase pasada no DICTADA cuyo estado/causa cambiaría. Si era REEMPLAZADA,
// indica de qué reemplazo (que se conserva: solo cambia la clase).
export type PasadaAReescribir = DictadaAReescribir & {
  estadoAnterior: EstadoClase
  causaAnterior:  Causa
  reemplazo:      { reemplazoId: number; agenteSuplenteId: number; suplente: string } | null
}
export type AvisoReconciliacion = {
  reemplazosAAnular:   ReemplazoAAnular[]
  dictadasAReescribir: DictadaAReescribir[]
  pasadasAReescribir:  PasadaAReescribir[]
  // Cuántas de pasadasAReescribir eran REEMPLAZADA.
  reemplazadasPasadas: number
  clasesPasadasNuevas: ClaseAfectada[]
}

export class RequiereConfirmacionError extends Error {
  constructor(public readonly aviso: AvisoReconciliacion) {
    super("La reconciliación requiere confirmación")
  }
}
export class AsignacionNoEncontradaError extends Error {
  constructor() { super("Asignación no encontrada") }
}

export type ParametrosReconciliacion = {
  tenantId:            number
  asignacionId:        number
  desde:               Date
  hasta?:              Date | null // por defecto, el fin del período vigente
  confirmarAnulacion?: boolean
  // Confirma reescribir el pasado: DICTADA, cualquier otra clase anterior a
  // hoy que cambie (salvo PROGRAMADA -> DICTADA) y clases pasadas nuevas.
  reescribirDictadas?: boolean
  mantenerReemplazo?:  boolean
}

export type ResultadoReconciliacion = {
  clasesCreadas:        number
  clasesActualizadas:   number
  // Clases pasadas reescritas con confirmación: DICTADA y otras.
  dictadasReescritas:   number
  reemplazosAnulados:   ReemplazoAAnular[]
  reemplazosMantenidos: number
  sinCobertura:         ClaseAfectada[]
}

/**
 * Con el prisma global abre su propia transacción; con un cliente
 * transaccional corre dentro de la del llamador (Prisma no anida
 * transacciones interactivas).
 */
export async function reconciliarAsignacion(
  params: ParametrosReconciliacion,
  db: Db = prisma
): Promise<ResultadoReconciliacion> {
  if ("$transaction" in db) {
    return db.$transaction(tx => reconciliarEn(params, tx), OPCIONES_TRANSACCION)
  }
  return reconciliarEn(params, db)
}

// Último día en que rige la asignación: hasta fecha_fin, y si fue eliminada,
// hasta el día anterior al día local de su deletedAt (mismo criterio que
// asignacionVigente en el motor). null = sin límite; "nunca" = no rige.
function ultimoDiaQueRige(a: { activo: boolean; deletedAt: Date | null; fecha_fin: Date | null }): Date | null | "nunca" {
  if (!a.activo && a.deletedAt === null) return "nunca"
  const cortes: Date[] = []
  if (a.fecha_fin) cortes.push(diaDe(a.fecha_fin))
  if (a.deletedAt) cortes.push(new Date(hoyLocal(a.deletedAt).getTime() - DIA_MS))
  return cortes.length > 0 ? minimo(...cortes) : null
}

async function reconciliarEn(params: ParametrosReconciliacion, tx: Db): Promise<ResultadoReconciliacion> {
  const { tenantId, asignacionId } = params
  const ahora = new Date()
  const hoy = hoyLocal(ahora)
  const desde = diaDe(params.desde)
  const protegerTerminadas = desde >= hoy && !params.reescribirDictadas

  const asignacion = await tx.asignacion.findFirst({
    where:  { id: asignacionId, institucionId: tenantId },
    select: {
      id: true, unidadId: true, comisionId: true, activo: true, deletedAt: true, fecha_fin: true,
      turno: { select: { horaFin: true } },
    },
  })
  if (!asignacion) throw new AsignacionNoEncontradaError()
  const horaTurno = asignacion.turno?.horaFin ?? null

  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId, tx)
  const hasta = params.hasta ? diaDe(params.hasta) : periodo ? diaDe(periodo.fecha_hasta) : null
  const rangoFechas = hasta ? { gte: desde, lte: finDelDia(hasta) } : { gte: desde }

  // 1. Generar lo que falta de cada versión vigente en el rango.
  const idsNuevas: number[] = []
  const ultimoDia = ultimoDiaQueRige(asignacion)
  if (periodo && ultimoDia !== "nunca") {
    const finGeneracion = minimo(
      ...[hasta, diaDe(periodo.fecha_hasta), ultimoDia].filter((f): f is Date => f !== null)
    )
    const versiones = await tx.distribucionHoraria.findMany({
      where: {
        asignacionId,
        deletedAt:            null,
        fecha_vigencia_desde: { lte: finDelDia(finGeneracion) },
        OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: desde } }],
      },
      select: { id: true, fecha_vigencia_desde: true, fecha_vigencia_hasta: true },
    })
    for (const v of versiones) {
      const gDesde = maximo(desde, diaDe(v.fecha_vigencia_desde), diaDe(periodo.fecha_desde))
      const gHasta = v.fecha_vigencia_hasta ? minimo(finGeneracion, diaDe(v.fecha_vigencia_hasta)) : finGeneracion
      if (gDesde > gHasta) continue
      const r = await claseProgramadaService.generarParaRango({
        institucionId:  tenantId,
        asignacionId,
        unidadId:       asignacion.unidadId,
        comisionId:     asignacion.comisionId,
        distribucionId: v.id,
        periodoId:      periodo.id,
        desde: gDesde,
        hasta: gHasta,
      }, tx, { ahora, omitirTerminadas: protegerTerminadas })
      idsNuevas.push(...r.ids)
    }
  }
  const clasesPasadasNuevas: ClaseAfectada[] = (await tx.claseProgramada.findMany({
    where:   { id: { in: idsNuevas }, fecha: { lt: hoy } },
    select:  { id: true, fecha: true, moduloId: true },
    orderBy: { fecha: "asc" },
  })).map(c => ({ claseId: c.id, fecha: iso(c.fecha), moduloId: c.moduloId }))

  // 2. Re-resolver las existentes. Las DICTADA se evalúan sin su protección;
  //    los cambios en el pasado quedan en el aviso (se aplican solo con
  //    confirmación).
  const existentes = await tx.claseProgramada.findMany({
    where:   { asignacionId, fecha: rangoFechas, id: { notIn: idsNuevas } },
    select: {
      id: true, fecha: true, moduloId: true, estado: true, causa: true,
      modulo: { select: { hora_hasta: true } },
      reemplazos: {
        where: { activo: true }, take: 1,
        select: { id: true, agenteSuplenteId: true, agenteSuplente: { select: { nombre: true, apellido: true } } },
      },
    },
    orderBy: { fecha: "asc" },
  })
  let clasesActualizadas = 0
  const dictadasAReescribir: DictadaAReescribir[] = []
  const pasadasAReescribir: PasadaAReescribir[] = []
  const idsRevividas: number[] = []
  const idsProtegidas: number[] = []
  for (const c of existentes) {
    if (protegerTerminadas && claseTermino({ fecha: c.fecha, horaHasta: c.modulo?.hora_hasta ?? horaTurno, ahora })) {
      idsProtegidas.push(c.id)
      if (c.estado === EstadoClase.PROGRAMADA) {
        await tx.claseProgramada.update({
          where: { id: c.id },
          data:  { estado: EstadoClase.DICTADA, causa: Causa.NINGUNA, versionResolucion: { increment: 1 } },
        })
        clasesActualizadas++
      }
      continue
    }
    const dictada = c.estado === EstadoClase.DICTADA
    const r = await resolverClase(c.id, tenantId, tx, { reescribirDictada: dictada, ahora })
    if (!r.actualizada) continue
    clasesActualizadas++
    const afectada = { claseId: c.id, fecha: iso(c.fecha), moduloId: c.moduloId, estado: r.estado, causa: r.causa }
    if (dictada) {
      dictadasAReescribir.push(afectada)
    } else if (c.fecha < hoy && !(c.estado === EstadoClase.PROGRAMADA && r.estado === EstadoClase.DICTADA)) {
      const reemplazo = c.estado === EstadoClase.REEMPLAZADA && c.reemplazos[0]
        ? {
            reemplazoId:      c.reemplazos[0].id,
            agenteSuplenteId: c.reemplazos[0].agenteSuplenteId,
            suplente:         nombreDe(c.reemplazos[0].agenteSuplente),
          }
        : null
      pasadasAReescribir.push({ ...afectada, estadoAnterior: c.estado, causaAnterior: c.causa, reemplazo })
    }
    if (CAUSAS_MUERTAS.includes(c.causa) && !CAUSAS_MUERTAS.includes(r.causa)) idsRevividas.push(c.id)
  }

  // 3. Reemplazos activos de clases de hoy en adelante que dejaron de existir.
  const muertasConReemplazo = await tx.claseProgramada.findMany({
    where: {
      asignacionId,
      id:         { notIn: idsProtegidas },
      fecha:      hasta ? { gte: maximo(desde, hoy), lte: finDelDia(hasta) } : { gte: maximo(desde, hoy) },
      causa:      { in: CAUSAS_MUERTAS },
      reemplazos: { some: { activo: true } },
    },
    select: {
      id: true, fecha: true, moduloId: true, incidenciaId: true,
      reemplazos: {
        where:  { activo: true },
        select: {
          id: true, agenteSuplenteId: true, asignacionTitularId: true, incidenciaId: true,
          agenteSuplente: { select: { nombre: true, apellido: true } },
        },
      },
    },
    orderBy: { fecha: "asc" },
  })
  const anulados = muertasConReemplazo.flatMap(c => c.reemplazos.map(r => ({
    claseId: c.id, fecha: iso(c.fecha), moduloId: c.moduloId,
    reemplazoId: r.id, agenteSuplenteId: r.agenteSuplenteId,
    suplente: nombreDe(r.agenteSuplente),
    incidenciaId: r.incidenciaId ?? c.incidenciaId,
    asignacionTitularId: r.asignacionTitularId,
  })))
  const reemplazosAAnular: ReemplazoAAnular[] = anulados.map(({ asignacionTitularId: _, ...r }) => r)

  const faltaConfirmarAnulacion = reemplazosAAnular.length > 0 && !params.confirmarAnulacion
  const faltaConfirmarPasado =
    (dictadasAReescribir.length > 0 || pasadasAReescribir.length > 0 || clasesPasadasNuevas.length > 0) &&
    !params.reescribirDictadas
  if (faltaConfirmarAnulacion || faltaConfirmarPasado) {
    throw new RequiereConfirmacionError({
      reemplazosAAnular,
      dictadasAReescribir,
      pasadasAReescribir,
      reemplazadasPasadas: pasadasAReescribir.filter(p => p.estadoAnterior === EstadoClase.REEMPLAZADA).length,
      clasesPasadasNuevas,
    })
  }

  if (anulados.length > 0) {
    await tx.reemplazo.updateMany({
      where: { id: { in: anulados.map(r => r.reemplazoId) } },
      data:  { activo: false, deletedAt: ahora },
    })
  }

  // 4. Clases nuevas o revividas bajo una licencia y sin suplente: con
  //    mantenerReemplazo se cubren con el único suplente de esa licencia.
  const candidatas = await tx.claseProgramada.findMany({
    where: {
      id:           { in: [...idsNuevas, ...idsRevividas] },
      incidenciaId: { not: null },
      causa:        Causa.INCIDENCIA,
      reemplazos:   { none: { activo: true } },
    },
    select:  { id: true, fecha: true, moduloId: true, incidenciaId: true },
    orderBy: { fecha: "asc" },
  })
  let reemplazosMantenidos = 0
  const sinCobertura: ClaseAfectada[] = []
  const suplentesPorLicencia = new Map<number, Map<string, { agenteSuplenteId: number; asignacionTitularId: number }>>()
  if (params.mantenerReemplazo) {
    for (const incidenciaId of new Set(candidatas.map(c => c.incidenciaId!))) {
      const vigentes = await tx.reemplazo.findMany({
        where:  { activo: true, OR: [{ incidenciaId }, { clase: { incidenciaId } }] },
        select: { agenteSuplenteId: true, asignacionTitularId: true },
      })
      const suplentes = new Map<string, { agenteSuplenteId: number; asignacionTitularId: number }>()
      for (const s of [...vigentes, ...anulados.filter(a => a.incidenciaId === incidenciaId)]) {
        suplentes.set(`${s.agenteSuplenteId}-${s.asignacionTitularId}`, s)
      }
      suplentesPorLicencia.set(incidenciaId, suplentes)
    }
  }
  for (const c of candidatas) {
    const afectada = { claseId: c.id, fecha: iso(c.fecha), moduloId: c.moduloId }
    const suplentes = suplentesPorLicencia.get(c.incidenciaId!)
    if (!params.mantenerReemplazo || !suplentes || suplentes.size !== 1) {
      sinCobertura.push(afectada)
      continue
    }
    const [suplente] = suplentes.values()
    if (await validarSuperposicionSuplente(c.id, suplente.agenteSuplenteId, tenantId, tx)) {
      sinCobertura.push(afectada)
      continue
    }
    await tx.reemplazo.create({
      data: {
        claseId:             c.id,
        asignacionTitularId: suplente.asignacionTitularId,
        agenteSuplenteId:    suplente.agenteSuplenteId,
        incidenciaId:        c.incidenciaId,
        observacion:         "Reemplazo mantenido al reconciliar la asignación",
        activo:              true,
      },
    })
    await resolverClase(c.id, tenantId, tx, { ahora })
    reemplazosMantenidos++
  }

  return {
    clasesCreadas:      idsNuevas.length,
    clasesActualizadas,
    dictadasReescritas: dictadasAReescribir.length + pasadasAReescribir.length,
    reemplazosAnulados: reemplazosAAnular,
    reemplazosMantenidos,
    sinCobertura,
  }
}
