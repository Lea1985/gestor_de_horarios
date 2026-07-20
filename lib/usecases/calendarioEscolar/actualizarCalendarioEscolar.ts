// lib/usecases/calendarioEscolar/actualizarCalendarioEscolar.ts
import { calendarioEscolarRepository }
  from "@/lib/repositories/calendarioEscolarRepository"
import { periodoOperativoRepository }
  from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"

export class CalendarioEscolarNoEncontradoError extends Error {
  constructor() {
    super("Evento de calendario escolar no encontrado")
  }
}
export class SinCamposParaActualizarError extends Error {
  constructor() {
    super("No hay campos para actualizar")
  }
}
export class FechaFueraDePeriodoError extends Error {
  constructor() {
    super("La fecha no pertenece al período operativo")
  }
}
export class PeriodoCerradoError extends Error {
  constructor() {
    super("El período está CERRADO, no se puede modificar su calendario")
  }
}

export async function actualizarCalendarioEscolar(
  calendarioId: number,
  tenantId: number,
  body: {
    fecha?: Date
    descripcion?: string
    esFeriado?: boolean
    suspendeClases?: boolean
  }
) {
  const registro =
    await calendarioEscolarRepository.obtenerPorId(
      calendarioId,
      tenantId
    )
  if (!registro)
    throw new CalendarioEscolarNoEncontradoError()

  const periodo =
    await periodoOperativoRepository.obtenerPorId(
      registro.periodoOperativoId,
      tenantId,
      true
    )

  // Si el período ya no existe (raro, pero posible con soft-delete), no
  // bloqueamos por esto — el error de fecha ya cubre el caso "sin período".
  if (periodo?.estado === "CERRADO") {
    throw new PeriodoCerradoError()
  }

  const campos = [
    "fecha",
    "descripcion",
    "esFeriado",
    "suspendeClases",
  ]
  const tieneCampos = campos.some(
    c => body[c as keyof typeof body] !== undefined
  )
  if (!tieneCampos)
    throw new SinCamposParaActualizarError()

  // Validar rango del período operativo
  if (body.fecha) {
    if (!periodo) {
      throw new FechaFueraDePeriodoError()
    }
    const fecha = new Date(body.fecha)
    if (
      fecha < periodo.fecha_desde ||
      fecha > periodo.fecha_hasta
    ) {
      throw new FechaFueraDePeriodoError()
    }
  }

  const actualizado = await calendarioEscolarRepository.actualizar(
    calendarioId,
    tenantId,
    body
  )

  // Si el registro quedó (o cambió a) suspendeClases=true/false, recalcular
  // las clases de esa fecha. Usa la fecha final del registro actualizado,
  // no la del body, por si solo se tocó `suspendeClases` sin tocar `fecha`.
  // Pasa calendarioId para que la reversión (suspende: false) solo toque
  // las clases que este evento puntual había suspendido.
  if (actualizado && body.suspendeClases !== undefined) {
    await claseProgramadaService.recalcularSuspendidasPorCalendario({
      institucionId:       tenantId,
      calendarioEscolarId: calendarioId,
      fecha:               actualizado.fecha,
      suspende:            actualizado.suspendeClases,
    })
  }

  return actualizado
}
