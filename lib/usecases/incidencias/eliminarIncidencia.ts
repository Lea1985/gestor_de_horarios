// lib/usecases/incidencias/eliminarIncidencia.ts
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import { resolverClase } from "@/lib/services/resolucionClaseService"
import prisma from "@/lib/prisma"

export class IncidenciaNoEncontradaError extends Error {
  constructor() { super("Incidencia no encontrada") }
}

export class TieneHijosError extends Error {
  constructor() { super("No se puede eliminar una incidencia que tiene incidencias hijas en la cadena") }
}

export class TieneReemplazosError extends Error {
  constructor() { super("No se puede eliminar una incidencia que tiene reemplazos asignados en sus clases") }
}

export async function eliminarIncidencia(id: number, tenantId: number) {
  const existe = await incidenciaRepository.existeEnTenant(id, tenantId)

  if (!existe || existe.deletedAt) {
    return { ok: true, deleted: false }
  }

  // Regla 1: no eliminar si tiene hijos en la cadena
  const tieneHijos = await prisma.incidencia.count({
    where: {
      incidenciaPadreId: id,
      deletedAt: null,
    },
  })
  if (tieneHijos > 0) throw new TieneHijosError()

  // Regla 2: no eliminar si alguna clase afectada tiene reemplazos activos
  const tieneReemplazos = await prisma.reemplazo.count({
    where: {
      activo: true,
      deletedAt: null,
      clase: {
        incidenciaId: id,
      },
    },
  })
  if (tieneReemplazos > 0) throw new TieneReemplazosError()

  await incidenciaRepository.eliminar(id, tenantId)

  // Liberar las clases que quedaron vinculadas a esta incidencia y volver a
  // resolver su estado (normalmente vuelven a PROGRAMADA, o a lo que
  // corresponda por período/calendario si esas causas siguen vigentes).
  const { ids } = await claseProgramadaService.desvincularIncidencia(id)
  for (const claseId of ids) {
    await resolverClase(claseId, tenantId)
  }

  return { ok: true, deleted: true }
}