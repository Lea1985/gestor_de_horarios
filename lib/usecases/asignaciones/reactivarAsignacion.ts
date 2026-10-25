//lib/usecases/asignaciones/reactivarAsignacion.ts
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"
import prisma from "@/lib/prisma"
import {
  reconciliarAsignacion,
  RequiereConfirmacionError,
  OPCIONES_TRANSACCION,
} from "@/lib/services/reconciliacionService"
import { hoyLocal } from "@/lib/helpers/fechaInstitucion"

export class AsignacionNoEncontradaError extends Error {
  constructor() { super("Asignación no encontrada") }
}

/**
 * Reactiva una asignación eliminada y reconcilia sus clases en la misma
 * transacción (la reactivación de los titulares la hace el repositorio).
 * La baja regía desde el día local de su deletedAt; se reconcilia desde ese
 * día, sin reescribir el pasado salvo pedido explícito: por defecto desde el
 * más tardío entre ese día y hoy, y con reescribirPasado desde el día de la
 * baja. La reconciliación también genera las clases que falten y resuelve
 * licencias, calendario y período (antes solo se re-resolvían las
 * FIN_ASIGNACION).
 */
export async function reactivarAsignacion(
  id: number,
  tenantId: number,
  body?: { reescribirPasado?: boolean }
) {
  const existe = await asignacionRepository.existeEliminada(id, tenantId)
  if (!existe) throw new AsignacionNoEncontradaError()

  const hoy = hoyLocal()
  const diaBaja = existe.deletedAt ? hoyLocal(existe.deletedAt) : hoy
  const desde = body?.reescribirPasado || diaBaja > hoy ? diaBaja : hoy

  try {
    const r = await prisma.$transaction(async (tx) => {
      await asignacionRepository.reactivar(id, tenantId, tx)
      return reconciliarAsignacion({
        tenantId,
        asignacionId:       id,
        desde,
        reescribirDictadas: body?.reescribirPasado,
      }, tx)
    }, OPCIONES_TRANSACCION)
    return { ok: true, desde: desde.toISOString().slice(0, 10), clasesResueltas: r.clasesActualizadas }
  } catch (error) {
    if (error instanceof RequiereConfirmacionError) {
      return { ok: false, requiereConfirmacion: true, aviso: error.aviso }
    }
    throw error
  }
}
