//lib/usecases/asignaciones/reactivarAsignacion.ts
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"
import prisma from "@/lib/prisma"
import { Causa } from "@prisma/client"
import { resolverClase } from "@/lib/services/resolucionClaseService"

export class AsignacionNoEncontradaError extends Error {
  constructor() { super("Asignación no encontrada") }
}

export async function reactivarAsignacion(id: number, tenantId: number) {
  const existe = await asignacionRepository.existeEliminada(id, tenantId)
  if (!existe) throw new AsignacionNoEncontradaError()

  await asignacionRepository.reactivar(id, tenantId)

  // Las clases que quedaron SUSPENDIDA/FIN_ASIGNACION al eliminar no tienen
  // por qué seguir así ahora que la asignación existe de nuevo -- se
  // re-resuelven una por una para que el motor decida el estado actual
  // (puede haber cambiado el período vigente, o la fecha puede haber
  // pasado desde que se eliminó).
  const clases = await prisma.claseProgramada.findMany({
    where: {
      asignacionId:  id,
      institucionId: tenantId,
      causa:         Causa.FIN_ASIGNACION,
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