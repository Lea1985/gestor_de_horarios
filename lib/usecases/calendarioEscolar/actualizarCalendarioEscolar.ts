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
export class EventoDuplicadoError extends Error {
  constructor(descripcionExistente: string) {
    super(`Ya existe un evento para esta fecha: "${descripcionExistente}". Un día solo puede tener un evento de calendario.`)
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
    // UX-PER-011: un día representa un solo evento de calendario -- solo
    // hace falta chequear duplicado si la fecha realmente cambia.
    const duplicado = await calendarioEscolarRepository.verificarDuplicado(
      tenantId,
      registro.periodoOperativoId,
      fecha,
      calendarioId
    )
    if (duplicado) {
      throw new EventoDuplicadoError(duplicado.descripcion)
    }
  }
  const actualizado = await calendarioEscolarRepository.actualizar(
    calendarioId,
    tenantId,
    body
  )
  // Si el registro quedó (o cambió a) suspendeClases=true/false, re-resolver
  // las clases de esa fecha. Usa la fecha final del registro actualizado,
  // no la del body, por si solo se tocó `suspendeClases` sin tocar `fecha`.
  // resolverClasesPorCalendario re-resuelve TODAS las clases de la
  // institución en esa fecha delegando en resolverClase (consulta en vivo
  // contra CalendarioEscolar y respeta la tabla de precedencia completa) --
  // no necesita que le indiquemos calendarioEscolarId ni la dirección del
  // cambio, el motor la deduce solo a partir del estado actual de la base
  // (fix 24/08/2026: el nombre/firma vieja de este método ya no existía en
  // el service, quedó un caller huérfano de un refactor anterior).
  let clasesActualizadas = 0
  if (actualizado && body.suspendeClases !== undefined) {
    const r = await claseProgramadaService.resolverClasesPorCalendario({
      institucionId: tenantId,
      fecha:         actualizado.fecha,
    })
    clasesActualizadas = r.actualizadas
  }
  // UX-PER-009: propagar el conteo real en vez de descartarlo.
  return { ...actualizado, clasesActualizadas }
}