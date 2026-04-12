import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export class DatosAsignacionInvalidosError extends Error {
  constructor() { super("agenteId, unidadId, identificadorEstructural y fecha_inicio son requeridos") }
}

export class EntidadNoEncontradaError extends Error {
  constructor(public readonly entidad: string) {
    super(`${entidad} no encontrada en esta institución`)
  }
}

export async function crearAsignacion(tenantId: number, body: {
  agenteId?:                number
  unidadId?:                number
  identificadorEstructural?: string
  fecha_inicio?:            string
  fecha_fin?:               string
  materiaId?:               number
  cursoId?:                 number
  comisionId?:              number
  turnoId?:                 number
}) {
  const { agenteId, unidadId, identificadorEstructural, fecha_inicio, fecha_fin, materiaId, cursoId, comisionId, turnoId } = body

  if (!agenteId || !unidadId || !identificadorEstructural || !fecha_inicio) {
    throw new DatosAsignacionInvalidosError()
  }

  if (!await asignacionRepository.verificarAgente(agenteId, tenantId)) {
    throw new EntidadNoEncontradaError("Agente")
  }
  if (!await asignacionRepository.verificarUnidad(unidadId, tenantId)) {
    throw new EntidadNoEncontradaError("Unidad")
  }
  if (materiaId && !await asignacionRepository.verificarMateria(materiaId, tenantId)) {
    throw new EntidadNoEncontradaError("Materia")
  }
  if (cursoId && !await asignacionRepository.verificarCurso(cursoId, tenantId)) {
    throw new EntidadNoEncontradaError("Curso")
  }
  if (comisionId && !await asignacionRepository.verificarComision(comisionId, tenantId)) {
    throw new EntidadNoEncontradaError("Comisión")
  }
  if (turnoId && !await asignacionRepository.verificarTurno(turnoId, tenantId)) {
    throw new EntidadNoEncontradaError("Turno")
  }

  return asignacionRepository.crear({
    tenantId,
    agenteId,
    unidadId,
    identificadorEstructural,
    fecha_inicio: new Date(fecha_inicio),
    fecha_fin:    fecha_fin ? new Date(fecha_fin) : null,
    materiaId:    materiaId  ?? null,
    cursoId:      cursoId    ?? null,
    comisionId:   comisionId ?? null,
    turnoId:      turnoId    ?? null,
  })
}