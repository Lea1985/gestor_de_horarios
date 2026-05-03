import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export class DatosAsignacionInvalidosError extends Error {}
export class EntidadNoEncontradaError extends Error {}

type Input = {
  agenteId: number
  unidadId: number
  materiaId?: number | null
  cursoId?: number | null
  comisionId?: number | null
  turnoId?: number | null
  fecha_inicio: string | Date
  fecha_fin?: string | Date | null
  identificadorEstructural: string
}

export async function crearAsignacion(
  tenantId: number,
  data: Input
) {
  if (!data.agenteId || !data.unidadId || !data.identificadorEstructural) {
    throw new DatosAsignacionInvalidosError("Faltan datos obligatorios")
  }

  // 🔥 parse fechas
  const fechaInicio = new Date(data.fecha_inicio)
  const fechaFin = data.fecha_fin ? new Date(data.fecha_fin) : null

  if (isNaN(fechaInicio.getTime())) {
    throw new DatosAsignacionInvalidosError("Fecha inicio inválida")
  }

  // 🔥 VALIDACIONES EN PARALELO (performance + consistencia)
  const [
    agente,
    unidad,
    materia,
    curso,
    comision,
    turno,
  ] = await Promise.all([
    asignacionRepository.verificarAgente(data.agenteId, tenantId),
    asignacionRepository.verificarUnidad(data.unidadId, tenantId),
    data.materiaId
      ? asignacionRepository.verificarMateria(data.materiaId, tenantId)
      : Promise.resolve(true),
    data.cursoId
      ? asignacionRepository.verificarCurso(data.cursoId, tenantId)
      : Promise.resolve(true),
    data.comisionId
      ? asignacionRepository.verificarComision(data.comisionId, tenantId)
      : Promise.resolve(true),
    data.turnoId
      ? asignacionRepository.verificarTurno(data.turnoId, tenantId)
      : Promise.resolve(true),
  ])

  // 🔥 validaciones críticas
  if (!agente) throw new EntidadNoEncontradaError("Agente no encontrado")
  if (!unidad) throw new EntidadNoEncontradaError("Unidad no encontrada")

  if (data.materiaId && !materia)
    throw new EntidadNoEncontradaError("Materia no encontrada")

  if (data.cursoId && !curso)
    throw new EntidadNoEncontradaError("Curso no encontrado")

  if (data.comisionId && !comision)
    throw new EntidadNoEncontradaError("Comisión no encontrada")

  if (data.turnoId && !turno)
    throw new EntidadNoEncontradaError("Turno no encontrado")

  // 🔥 CREACIÓN FINAL
  return asignacionRepository.crear({
    tenantId,
    agenteId: data.agenteId,
    unidadId: data.unidadId,
    identificadorEstructural: data.identificadorEstructural,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    materiaId: data.materiaId ?? null,
    cursoId: data.cursoId ?? null,
    comisionId: data.comisionId ?? null,
    turnoId: data.turnoId ?? null,
  })
}