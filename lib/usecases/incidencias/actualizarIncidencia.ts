// lib/usecases/incidencias/actualizarIncidencia.ts
import { incidenciaRepository } from "@/lib/repositories/incidenciaRepository"
import { resolverClasesIncidencia } from "./resolverClasesIncidencia"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import { resolverClase } from "@/lib/services/resolucionClaseService"
import { FechaFueraDePadreError } from "./crearIncidencia"
import prisma from "@/lib/prisma"

export class IncidenciaNoEncontradaError extends Error {
  constructor() { super("Incidencia no encontrada") }
}
export class RangoFechasInvalidoError extends Error {
  constructor() { super("Rango de fechas inválido") }
}
export class CodigarioItemNoValidoError extends Error {
  constructor() { super("Código de incidencia no válido para esta institución") }
}
export class SuperposicionError extends Error {
  constructor(
    public readonly conflicto: {
      id: number
      fecha_desde: Date
      fecha_hasta: Date
    }
  ) {
    super("Conflicto de fechas con otra incidencia")
  }
}
export class TieneHijosError extends Error {
  constructor() { super("No se puede editar una incidencia que tiene incidencias hijas en la cadena") }
}
export class TieneReemplazosError extends Error {
  constructor() { super("No se puede editar una incidencia que tiene reemplazos asignados en sus clases") }
}
export { FechaFueraDePadreError }

export async function actualizarIncidencia(
  id:       number,
  tenantId: number,
  body:     Record<string, unknown>
) {
  const incidencia = await incidenciaRepository.obtenerPorId(id, tenantId)
  if (!incidencia) throw new IncidenciaNoEncontradaError()

  // Regla 1: no editar si tiene hijos en la cadena
  const tieneHijos = await prisma.incidencia.count({
    where: {
      incidenciaPadreId: id,
      deletedAt: null,
    },
  })
  if (tieneHijos > 0) throw new TieneHijosError()

  // Regla 2: no editar si alguna clase afectada tiene reemplazos activos
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

  const nuevaDesde = body.fecha_desde
    ? new Date(body.fecha_desde as string)
    : incidencia.fecha_desde
  const nuevaHasta = body.fecha_hasta
    ? new Date(body.fecha_hasta as string)
    : incidencia.fecha_hasta
  if (isNaN(nuevaDesde.getTime()) || isNaN(nuevaHasta.getTime()) || nuevaDesde > nuevaHasta) {
    throw new RangoFechasInvalidoError()
  }

  // Regla 3: si esta incidencia es hija de otra (incidenciaPadreId), el
  // rango editado no puede exceder el rango de su padre directo -- mismo
  // criterio que ya se aplica al CREAR una incidencia (crearIncidencia.ts),
  // pero acá faltaba: al no revalidarse en el update, se podía crear una
  // hija bien contenida y después, editándola (si no tiene hijos propios,
  // Regla 1 ya lo permite), estirarle la fecha_hasta más allá de lo que
  // su propio padre permite -- rompiendo la contención de la cadena.
  if (incidencia.incidenciaPadreId) {
    const padre = await incidenciaRepository.obtenerPorId(incidencia.incidenciaPadreId, tenantId)
    if (padre && (nuevaDesde < padre.fecha_desde || nuevaHasta > padre.fecha_hasta)) {
      throw new FechaFueraDePadreError()
    }
  }

  const codigarioItemId =
    body.codigarioItemId !== undefined
      ? Number(body.codigarioItemId)
      : incidencia.codigarioItemId
  if (body.codigarioItemId !== undefined && codigarioItemId !== incidencia.codigarioItemId) {
    const valido = await incidenciaRepository.verificarCodigarioItem(codigarioItemId, tenantId)
    if (!valido) throw new CodigarioItemNoValidoError()
  }

  const conflicto = await incidenciaRepository.verificarSuperposicion(
    incidencia.asignacionId, nuevaDesde, nuevaHasta, tenantId, id
  )
  if (conflicto) throw new SuperposicionError(conflicto)

  const actualizada = await incidenciaRepository.actualizar(id, tenantId, {
    fecha_desde:     nuevaDesde,
    fecha_hasta:     nuevaHasta,
    codigarioItemId,
    observacion:     body.observacion as string | undefined,
  })

  // Si cambió el rango de fechas (desde y/o hasta), desvinculamos TODO lo
  // que tenía esta incidencia antes de re-vincular con el rango nuevo --
  // así una clase que queda afuera al achicar el rango se libera y se
  // resuelve sola a su estado correcto, en vez de quedar pegada a una
  // incidencia que ya no la cubre.
  const rangoCambio =
    nuevaDesde.getTime() !== incidencia.fecha_desde.getTime() ||
    nuevaHasta.getTime() !== incidencia.fecha_hasta.getTime()
  if (rangoCambio) {
    const { ids: idsDesvinculados } = await claseProgramadaService.desvincularIncidencia(id)
    for (const claseId of idsDesvinculados) {
      await resolverClase(claseId, tenantId)
    }
    await resolverClasesIncidencia(id, tenantId)
  }

  return actualizada
}