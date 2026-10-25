// lib/usecases/distribuciones/reactivarDistribucion.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import prisma from "@/lib/prisma"
import {
  reconciliarAsignacion,
  RequiereConfirmacionError,
  OPCIONES_TRANSACCION,
} from "@/lib/services/reconciliacionService"
import { hoyLocal } from "@/lib/helpers/fechaInstitucion"
export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}
// UX-DIS-008: a diferencia de Asignacion, una DistribucionHoraria está
// versionada -- el resto del módulo asume que solo puede haber una
// versión ACTIVO por asignación a la vez (ver distribucionActivaSeleccionada
// en useDistribuciones.ts). Esta guarda solo aplica si la fila a reactivar
// YA ERA ACTIVO antes de eliminarse (reactivar() no fuerza el estado, ver
// distribucionRepository.ts) -- si era una versión vieja ya INACTIVO,
// reactivarla no genera ningún conflicto de versión vigente.
export class YaExisteActivaError extends Error {
  constructor() {
    super("Ya existe una distribución activa para esta asignación. No se puede reactivar esta versión sin resolver antes ese conflicto.")
  }
}
/**
 * Reactiva una distribución eliminada y reconcilia la asignación en la misma
 * transacción. La baja regía desde el día local de su deletedAt; se
 * reconcilia desde ese día, pero sin reescribir el pasado salvo pedido
 * explícito: por defecto desde el más tardío entre ese día y hoy, y con
 * reescribirPasado desde el día de la baja (las clases pasadas que cambien
 * quedan confirmadas). Antes se re-resolvían TODAS las CAMBIO_DISTRIBUCION
 * de la asignación, de cualquier versión (R2 del plan).
 */
export async function reactivarDistribucion(
  id: number,
  tenantId: number,
  body?: { reescribirPasado?: boolean }
) {
  const existente = await distribucionRepository.existeEliminada(id, tenantId)
  if (!existente) throw new DistribucionNoEncontradaError()
  if (existente.estado === "ACTIVO") {
    const yaHayActiva = await prisma.distribucionHoraria.findFirst({
      where: {
        asignacionId:  existente.asignacionId,
        institucionId: tenantId,
        estado:        "ACTIVO",
        deletedAt:     null,
        id:            { not: id },
      },
      select: { id: true },
    })
    if (yaHayActiva) throw new YaExisteActivaError()
  }
  const hoy = hoyLocal()
  const diaBaja = hoyLocal(existente.deletedAt!)
  const desde = body?.reescribirPasado || diaBaja > hoy ? diaBaja : hoy
  try {
    const r = await prisma.$transaction(async (tx) => {
      await distribucionRepository.reactivar(id, tenantId, tx)
      return reconciliarAsignacion({
        tenantId,
        asignacionId:       existente.asignacionId,
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