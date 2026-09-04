// lib/usecases/calendarioEscolar/reactivarCalendarioEscolar.ts
import { calendarioEscolarRepository } from "@/lib/repositories/calendarioEscolarRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
export class CalendarioEscolarNoEncontradoError extends Error {
  constructor() {
    super("Evento de calendario escolar no encontrado")
  }
}
export class PeriodoCerradoError extends Error {
  constructor() {
    super("El período está CERRADO, no se puede modificar su calendario")
  }
}
export async function reactivarCalendarioEscolar(
  calendarioId: number,
  tenantId: number
) {
  const existe = await calendarioEscolarRepository.existeEliminado(
    calendarioId,
    tenantId
  )
  if (!existe)
    throw new CalendarioEscolarNoEncontradoError()
  const periodo = await periodoOperativoRepository.obtenerPorId(
    existe.periodoOperativoId,
    tenantId,
    true
  )
  if (periodo?.estado === "CERRADO") {
    throw new PeriodoCerradoError()
  }
  await calendarioEscolarRepository.reactivar(
    calendarioId,
    tenantId
  )
  // Si este evento suspende clases, reactivarlo debe volver a suspenderlas.
  let clasesActualizadas = 0
  if (existe.suspendeClases) {
    const r = await claseProgramadaService.resolverClasesPorCalendario({
      institucionId: tenantId,
      fecha:         existe.fecha,
    })
    clasesActualizadas = r.actualizadas
  }
  // UX-PER-009: propagar el conteo real en vez de descartarlo.
  return { ok: true, clasesActualizadas }
}