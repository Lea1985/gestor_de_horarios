// lib/usecases/calendarioEscolar/eliminarCalendarioEscolar.ts
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
export async function eliminarCalendarioEscolar(
  calendarioId: number,
  tenantId: number
) {
  const registro = await calendarioEscolarRepository.obtenerPorId(
    calendarioId,
    tenantId
  )
  if (!registro)
    throw new CalendarioEscolarNoEncontradoError()
  const periodo = await periodoOperativoRepository.obtenerPorId(
    registro.periodoOperativoId,
    tenantId,
    true
  )
  if (periodo?.estado === "CERRADO") {
    throw new PeriodoCerradoError()
  }
  await calendarioEscolarRepository.eliminar(
    calendarioId,
    tenantId
  )
  // Si este evento suspendía clases, borrarlo debe revertirlas -- si no,
  // quedan SUSPENDIDA por un evento de calendario que ya no existe.
  let clasesActualizadas = 0
  if (registro.suspendeClases) {
    const r = await claseProgramadaService.resolverClasesPorCalendario({
      institucionId: tenantId,
      fecha:         registro.fecha,
    })
    clasesActualizadas = r.actualizadas
  }
  // UX-PER-009: propagar el conteo real en vez de descartarlo.
  return { ok: true, clasesActualizadas }
}