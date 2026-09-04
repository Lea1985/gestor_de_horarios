// lib/usecases/calendarioEscolar/crearCalendarioEscolar.ts
import { calendarioEscolarRepository } from "@/lib/repositories/calendarioEscolarRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
export class DatosCalendarioEscolarInvalidosError extends Error {
  constructor() {
    super("fecha y descripcion son requeridos")
  }
}
export class PeriodoOperativoNoEncontradoError extends Error {
  constructor() {
    super("El período operativo no existe o no pertenece a la institución")
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
export async function crearCalendarioEscolar(
  tenantId: number,
  body: {
    periodoOperativoId?: number
    fecha?: string
    descripcion?: string
    esFeriado?: boolean
    suspendeClases?: boolean
  }
) {
  const {
    periodoOperativoId,
    fecha,
    descripcion,
    esFeriado,
    suspendeClases,
  } = body
  if (!fecha || !descripcion || !periodoOperativoId) {
    throw new DatosCalendarioEscolarInvalidosError()
  }
  // Verificar período operativo
  const periodo =
    await periodoOperativoRepository.obtenerPorId(
      periodoOperativoId,
      tenantId,
      true
    )
  if (!periodo) {
    throw new PeriodoOperativoNoEncontradoError()
  }
  if (periodo.estado === "CERRADO") {
    throw new PeriodoCerradoError()
  }
  const fechaDate = new Date(fecha)
  // Validar rango del período
  if (
    fechaDate < periodo.fecha_desde ||
    fechaDate > periodo.fecha_hasta
  ) {
    throw new FechaFueraDePeriodoError()
  }
  // UX-PER-011: un día representa un solo evento de calendario (feriado
  // y/o suspensión de clases) -- no tiene sentido cargar dos para la
  // misma fecha.
  const duplicado = await calendarioEscolarRepository.verificarDuplicado(
    tenantId,
    periodoOperativoId,
    fechaDate
  )
  if (duplicado) {
    throw new EventoDuplicadoError(duplicado.descripcion)
  }
  const creado = await calendarioEscolarRepository.crear({
    tenantId,
    periodoOperativoId,
    fecha: fechaDate,
    descripcion: descripcion.trim(),
    esFeriado: esFeriado ?? false,
    suspendeClases: suspendeClases ?? false,
  })
  // Si marca "suspende clases", revisitar las clases ya generadas en esa
  // fecha (si las hay) y pasarlas de PROGRAMADA a SUSPENDIDA, dejando
  // registrada la causa y el evento que la originó. No hace nada si el
  // período todavía no generó clases para esa fecha.
  let clasesActualizadas = 0
  if (creado.suspendeClases) {
    const r = await claseProgramadaService.resolverClasesPorCalendario({
      institucionId: tenantId,
      fecha:         fechaDate,
    })
    clasesActualizadas = r.actualizadas
  }
  // UX-PER-009: el conteo real de clases afectadas se descartaba -- ahora
  // se propaga en la respuesta para que el frontend lo pueda mostrar.
  return { ...creado, clasesActualizadas }
}