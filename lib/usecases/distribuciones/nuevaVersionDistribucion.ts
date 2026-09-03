// lib/usecases/distribuciones/nuevaVersionDistribucion.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}
// UX-DIS-009: dos pestañas/doble click generando nueva versión al mismo
// tiempo -- el @@unique([asignacionId, version]) de la DB ya lo impedía a
// nivel de datos (nunca se corrompía nada), pero el P2002 subía sin
// capturar y el usuario veía un 500 crudo. Ahora se traduce a un error de
// dominio con mensaje claro.
export class VersionEnConflictoError extends Error {
  constructor() { super("Ya se creó una nueva versión para esta asignación -- recargá la página e intentá de nuevo.") }
}
/**
 * Cierra la distribución actual (fecha_vigencia_hasta = ayer, INACTIVO) y
 * crea una nueva versión vacía (sin módulos, a asignar después vía
 * asignarModulos). Ya NO bloquea si no hay período ACTIVO — coherente con
 * el resto del sistema (crearDistribucion, asignarModulos).
 *
 * Gestión de clases del tramo [hoy, fin de período] de la versión VIEJA:
 *  - Si no hay período ACTIVO: no hay nada que gestionar, se cierra y listo.
 *  - Si hay período ACTIVO: se SUSPENDEN (causa CAMBIO_DISTRIBUCION) las
 *    clases futuras, con el mismo flujo de confirmación de reemplazo que
 *    usa asignarModulos y eliminarDistribucion. Se suspenden, no se borran:
 *    la nueva versión nace sin módulos (modulosNuevos: []), así que
 *    suspenderNoVigentes trata el tramo entero como "ya no vigente" y marca
 *    todo. Cuando el usuario complete la nueva versión con asignarModulos,
 *    ese mismo mecanismo va a reutilizar (no duplicar, por el @@unique) las
 *    clases que vuelvan a coincidir con los módulos nuevos.
 *  - La nueva versión arranca sin módulos, así que NO hay "clases nuevas"
 *    a las que migrar el reemplazo todavía (igual que en eliminarDistribucion).
 *    Se informa igual para que el usuario sepa que se perdió, y lo vuelva
 *    a cargar cuando asigne módulos a la nueva versión.
 *
 * Nunca se elimina ninguna ClaseProgramada en este flujo — la historia y
 * la identidad de cada clase se preservan, solo cambia su Estado/Causa.
 *
 * UX-DIS-009: cerrar la vieja + calcular la próxima versión + crear la
 * nueva van dentro de un único prisma.$transaction -- si algo falla a
 * mitad de camino (ej. se corta la conexión), ya no puede quedar la
 * asignación sin ninguna distribución ACTIVO (la vieja cerrada, la nueva
 * nunca creada). La suspensión de clases (suspenderNoVigentes) queda
 * deliberadamente afuera de esta transacción: claseProgramadaService no
 * acepta hoy un cliente de transacción (lo usan también asignarModulos y
 * eliminarDistribucion, tocarlo es un cambio de mayor alcance), y es una
 * operación idempotente/autocorregible -- un updateMany dirigido; si el
 * swap de versión fallara después, reintentar todo el flujo no duplica
 * nada. El riesgo real que describía la tarea era la asignación sin
 * versión ACTIVO, no la suspensión en sí.
 */
export async function nuevaVersionDistribucion(
  distribucionId: number,
  tenantId: number,
  body?: { mantenerReemplazo?: boolean }
) {
  const actual = await prisma.distribucionHoraria.findFirst({
    where: { id: distribucionId, institucionId: tenantId, deletedAt: null },
    include: { asignacion: { select: { id: true, unidadId: true, comisionId: true } } },
  })
  if (!actual) throw new DistribucionNoEncontradaError()
  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)
  let clasesSuspendidas = 0
  let avisoReemplazoNoAplica = false
  if (periodo) {
    const hoy = new Date()
    hoy.setUTCHours(0, 0, 0, 0)
    const hasta = periodo.fecha_hasta
    if (hoy <= hasta) {
      const tramos = await claseProgramadaService.resolverCoberturaDelTramo({
        asignacionId: actual.asignacion.id, desde: hoy, hasta,
      })
      if (tramos.length > 0 && body?.mantenerReemplazo === undefined) {
        return { ok: false, requiereConfirmacion: true, tramos }
      }
      const r = await claseProgramadaService.suspenderNoVigentes({
        institucionId: tenantId,
        asignacionId:  actual.asignacion.id,
        unidadId:      actual.asignacion.unidadId,
        comisionId:    actual.asignacion.comisionId,
        modulosNuevos: [], // la nueva versión nace vacía, todo el tramo queda no-vigente
        desde: hoy, hasta,
      })
      clasesSuspendidas = r.suspendidas
      avisoReemplazoNoAplica = body?.mantenerReemplazo === true && tramos.length > 0
    }
  }
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const ayerFin = new Date(hoy)
  ayerFin.setUTCDate(ayerFin.getUTCDate() - 1)
  ayerFin.setUTCHours(23, 59, 59, 999)
  let nueva
  try {
    nueva = await prisma.$transaction(async (tx) => {
      // Cerrar la distribución actual
      await tx.distribucionHoraria.update({
        where: { id: distribucionId },
        data: {
          fecha_vigencia_hasta: ayerFin,
          estado:               "INACTIVO",
          activo:               false,
        },
      })
      // Calcular nueva versión
      const ultima = await tx.distribucionHoraria.findFirst({
        where:   { asignacionId: actual.asignacionId },
        orderBy: { version: "desc" },
        select:  { version: true },
      })
      const nuevaVersion = (ultima?.version ?? 0) + 1
      // Crear nueva distribución sin módulos
      return tx.distribucionHoraria.create({
        data: {
          institucionId:        tenantId,
          asignacionId:         actual.asignacionId,
          version:              nuevaVersion,
          fecha_vigencia_desde: hoy,
          estado:               "ACTIVO",
        },
      })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new VersionEnConflictoError()
    }
    throw error
  }
  return {
    ok:             true,
    nuevaVersionId: nueva.id,
    version:        nueva.version,
    clasesSuspendidas,
    avisoReemplazoNoAplica,
  }
}