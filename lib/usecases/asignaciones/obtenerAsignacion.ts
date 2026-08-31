//lib/usecases/asignaciones/obtenerAsignacion.ts
import prisma from "@/lib/prisma"
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export class AsignacionNoEncontradaError extends Error {
  constructor() { super("Asignación no encontrada") }
}

export async function obtenerAsignacion(id: number, tenantId: number, incluirEliminados = false) {
  const asignacion = await asignacionRepository.obtenerPorId(id, tenantId, incluirEliminados)
  if (!asignacion) throw new AsignacionNoEncontradaError()

  // UX-ASG-009: el cliente necesita saber de antemano si hay reemplazos
  // activos, la misma regla que eliminarAsignacion.ts va a evaluar, para
  // poder anticipar el bloqueo en el botón "Eliminar" en vez de que el
  // usuario se entere recién después de confirmar.
  const reemplazosActivos = await prisma.reemplazo.count({
    where: {
      activo:    true,
      deletedAt: null,
      clase: { asignacionId: id },
    },
  })

  return { ...asignacion, tieneReemplazosActivos: reemplazosActivos > 0 }
}