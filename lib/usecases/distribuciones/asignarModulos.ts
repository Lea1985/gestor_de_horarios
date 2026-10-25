// lib/usecases/distribuciones/asignarModulos.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import {
  reconciliarAsignacion,
  RequiereConfirmacionError,
  OPCIONES_TRANSACCION,
} from "@/lib/services/reconciliacionService"
import { hoyLocal } from "@/lib/helpers/fechaInstitucion"
import prisma from "@/lib/prisma"

export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}
export class ModulosInvalidosError extends Error {
  constructor() { super("Uno o más módulos no pertenecen a esta institución") }
}
export class FormatoModulosInvalidoError extends Error {
  constructor() { super("Se espera un array de IDs de módulos") }
}
export class FechaDesdeInvalidaError extends Error {
  constructor() { super("desde debe ser una fecha válida (AAAA-MM-DD)") }
}
// Ya NO se lanza — asignar módulos ahora funciona sin período ACTIVO.
// Se deja exportada porque app/api/distribuciones/[id]/modulos/route.ts
// todavía la importa; si la borrás de acá, borrá también esa importación.
export class SinPeriodoActivoError extends Error {
  constructor() { super("No hay período ACTIVO.") }
}
/**
 * Reasigna los módulos de una distribución ("Editar") y reconcilia las
 * clases de la asignación con reconciliarAsignacion, todo en una única
 * transacción.
 *
 * Asignar módulos SIEMPRE es posible, haya o no período ACTIVO. Sin período
 * activo, se guardan los módulos y no se toca ninguna clase (activarPeriodo
 * generará lo que corresponda).
 *
 * desde (decisión 6 del plan):
 *  - Por defecto, hoy local: el cambio rige de hoy en adelante.
 *  - Con desde anterior (por ejemplo, el inicio de la distribución) se
 *    corrige el pasado; nunca antes del inicio de la distribución. Si eso
 *    cambia clases pasadas, se pide confirmación (reescribirPasado).
 *  - Primera asignación de módulos (distribución sin módulos): es la carga
 *    inicial del horario, rige desde el inicio de la distribución y no hay
 *    nada que reescribir.
 *
 * Confirmación: si la reconciliación anularía reemplazos de clases futuras
 * o reescribiría el pasado y no vino la confirmación correspondiente, se
 * revierte todo y se devuelve { ok: false, requiereConfirmacion, aviso }.
 * mantenerReemplazo lo elige el usuario en ese aviso, nunca es automático.
 */
export async function asignarModulos(
  distribucionId: number,
  tenantId: number,
  body: {
    modulos?:            unknown
    desde?:              string
    confirmarAnulacion?: boolean
    reescribirPasado?:   boolean
    mantenerReemplazo?:  boolean
  }
) {
  if (!Array.isArray(body.modulos)) throw new FormatoModulosInvalidoError()
  const distribucion = await prisma.distribucionHoraria.findFirst({
    where: { id: distribucionId, institucionId: tenantId, deletedAt: null },
    include: { asignacion: true, _count: { select: { distribucionModulos: true } } },
  })
  if (!distribucion) throw new DistribucionNoEncontradaError()
  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)
  // ── Sin período ACTIVO: solo guardamos los módulos, sin tocar clases ──
  if (!periodo) {
    const result = await distribucionRepository.asignarModulos(
      distribucionId, tenantId, body.modulos as number[]
    )
    if (!result) throw new ModulosInvalidosError()
    return {
      ok: true,
      total: result.length,
      clasesCreadas: 0,
      avisoSinPeriodoActivo: true, // el frontend puede mostrar un aviso informativo
    }
  }
  const inicio = distribucion.fecha_vigencia_desde
  const primeraAsignacion = distribucion._count.distribucionModulos === 0
  let desde = primeraAsignacion ? inicio : hoyLocal()
  if (!primeraAsignacion && body.desde !== undefined) {
    const pedido = distribucionRepository.parseDate(body.desde)
    if (!pedido) throw new FechaDesdeInvalidaError()
    desde = pedido
  }
  if (desde < inicio) desde = inicio
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const modulos = await distribucionRepository.asignarModulos(
        distribucionId, tenantId, body.modulos as number[], tx
      )
      if (!modulos) throw new ModulosInvalidosError()
      const reconciliacion = await reconciliarAsignacion({
        tenantId,
        asignacionId:       distribucion.asignacionId,
        desde,
        confirmarAnulacion: body.confirmarAnulacion,
        reescribirDictadas: primeraAsignacion || body.reescribirPasado,
        mantenerReemplazo:  body.mantenerReemplazo,
      }, tx)
      return { total: modulos.length, ...reconciliacion }
    }, OPCIONES_TRANSACCION)
    return { ok: true, desde: desde.toISOString().slice(0, 10), ...resultado }
  } catch (error) {
    if (error instanceof RequiereConfirmacionError) {
      return { ok: false, requiereConfirmacion: true, aviso: error.aviso }
    }
    throw error
  }
}
