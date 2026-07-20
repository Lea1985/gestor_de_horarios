// lib/usecases/distribuciones/nuevaVersionDistribucion.ts
import prisma from "@/lib/prisma"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"

export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
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

  // Cerrar la distribución actual
  await prisma.distribucionHoraria.update({
    where: { id: distribucionId },
    data: {
      fecha_vigencia_hasta: ayerFin,
      estado:               "INACTIVO",
      activo:               false,
    },
  })

  // Calcular nueva versión
  const ultima = await prisma.distribucionHoraria.findFirst({
    where:   { asignacionId: actual.asignacionId },
    orderBy: { version: "desc" },
    select:  { version: true },
  })
  const nuevaVersion = (ultima?.version ?? 0) + 1

  // Crear nueva distribución sin módulos
  const nueva = await prisma.distribucionHoraria.create({
    data: {
      institucionId:        tenantId,
      asignacionId:         actual.asignacionId,
      version:              nuevaVersion,
      fecha_vigencia_desde: hoy,
      estado:               "ACTIVO",
    },
  })

  return {
    ok:             true,
    nuevaVersionId: nueva.id,
    version:        nuevaVersion,
    clasesSuspendidas,
    avisoReemplazoNoAplica,
  }
}
