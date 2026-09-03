// lib/usecases/distribuciones/reactivarDistribucion.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import prisma from "@/lib/prisma"
import { Causa, EstadoClase } from "@prisma/client"
import { resolverClase } from "@/lib/services/resolucionClaseService"
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
export async function reactivarDistribucion(id: number, tenantId: number) {
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
  await distribucionRepository.reactivar(id, tenantId)
  // Las clases que quedaron SUSPENDIDA (causa CAMBIO_DISTRIBUCION) al
  // eliminar esta distribución no tienen por qué seguir así ahora que
  // existe de nuevo -- se re-resuelven una por una para que el motor
  // decida el estado actual (mismo patrón que reactivarAsignacion.ts).
  const clases = await prisma.claseProgramada.findMany({
    where: {
      asignacionId:  existente.asignacionId,
      institucionId: tenantId,
      causa:         Causa.CAMBIO_DISTRIBUCION,
      estado:        EstadoClase.SUSPENDIDA,
    },
    select: { id: true },
  })
  let clasesResueltas = 0
  for (const clase of clases) {
    const r = await resolverClase(clase.id, tenantId)
    if (r.actualizada) clasesResueltas++
  }
  return { ok: true, clasesResueltas }
}