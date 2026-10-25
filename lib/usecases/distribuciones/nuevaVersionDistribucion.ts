// lib/usecases/distribuciones/nuevaVersionDistribucion.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import {
  reconciliarAsignacion,
  RequiereConfirmacionError,
  OPCIONES_TRANSACCION,
} from "@/lib/services/reconciliacionService"
import { hoyLocal } from "@/lib/helpers/fechaInstitucion"
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
export class FechaDesdeInvalidaError extends Error {
  constructor() {
    super("La nueva versión tiene que empezar después del inicio de la versión actual y dentro de su vigencia")
  }
}
/**
 * "Nueva versión": cierra la distribución actual el día anterior a desde
 * (INACTIVO) y crea la versión siguiente desde esa fecha con una COPIA de
 * sus módulos (decisión 3 del plan de la Fase 3). Crear la copia no cambia
 * ninguna clase ni anula ningún reemplazo: el horario nuevo se carga después
 * con "Editar" sobre la nueva versión, que rige desde su inicio.
 *
 * desde: la fecha elegida (por defecto, hoy local). Tiene que ser posterior
 * al inicio de la versión actual y no posterior a su fin, si lo tiene.
 *
 * Todo (cierre, versión nueva, copia de módulos y reconciliación) va en una
 * única transacción. La reconciliación es un no-op con la copia, pero corre
 * igual: si algo no coincide, el aviso de confirmación lo muestra.
 *
 * UX-DIS-009: el P2002 de @@unique([asignacionId, version]) (doble click,
 * dos pestañas) se traduce a VersionEnConflictoError.
 */
export async function nuevaVersionDistribucion(
  distribucionId: number,
  tenantId: number,
  body?: {
    desde?:              string
    confirmarAnulacion?: boolean
    reescribirPasado?:   boolean
    mantenerReemplazo?:  boolean
  }
) {
  const actual = await prisma.distribucionHoraria.findFirst({
    where: { id: distribucionId, institucionId: tenantId, deletedAt: null },
    include: { distribucionModulos: { select: { moduloHorarioId: true } } },
  })
  if (!actual) throw new DistribucionNoEncontradaError()
  let desde = hoyLocal()
  if (body?.desde !== undefined) {
    const pedido = distribucionRepository.parseDate(body.desde)
    if (!pedido) throw new FechaDesdeInvalidaError()
    desde = pedido
  }
  if (desde <= actual.fecha_vigencia_desde) throw new FechaDesdeInvalidaError()
  if (actual.fecha_vigencia_hasta && desde > actual.fecha_vigencia_hasta) throw new FechaDesdeInvalidaError()
  const cierre = new Date(desde)
  cierre.setUTCDate(cierre.getUTCDate() - 1)
  cierre.setUTCHours(23, 59, 59, 999)
  try {
    const { nueva, reconciliacion } = await prisma.$transaction(async (tx) => {
      // Cerrar la distribución actual
      await tx.distribucionHoraria.update({
        where: { id: distribucionId },
        data: {
          fecha_vigencia_hasta: cierre,
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
      // Crear la nueva versión con una copia de los módulos de la actual
      const nueva = await tx.distribucionHoraria.create({
        data: {
          institucionId:        tenantId,
          asignacionId:         actual.asignacionId,
          version:              nuevaVersion,
          fecha_vigencia_desde: desde,
          estado:               "ACTIVO",
        },
      })
      if (actual.distribucionModulos.length > 0) {
        await tx.distribucionModulo.createMany({
          data: actual.distribucionModulos.map(dm => ({
            distribucionHorariaId: nueva.id,
            moduloHorarioId:       dm.moduloHorarioId,
          })),
        })
      }
      const reconciliacion = await reconciliarAsignacion({
        tenantId,
        asignacionId:       actual.asignacionId,
        desde,
        confirmarAnulacion: body?.confirmarAnulacion,
        reescribirDictadas: body?.reescribirPasado,
        mantenerReemplazo:  body?.mantenerReemplazo,
      }, tx)
      return { nueva, reconciliacion }
    }, OPCIONES_TRANSACCION)
    return {
      ok:             true,
      nuevaVersionId: nueva.id,
      version:        nueva.version,
      desde:          desde.toISOString().slice(0, 10),
      ...reconciliacion,
    }
  } catch (error) {
    if (error instanceof RequiereConfirmacionError) {
      return { ok: false, requiereConfirmacion: true, aviso: error.aviso }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new VersionEnConflictoError()
    }
    throw error
  }
}
