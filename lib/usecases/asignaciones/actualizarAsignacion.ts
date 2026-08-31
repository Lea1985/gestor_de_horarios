// lib/usecases/asignaciones/actualizarAsignacion.ts
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"
import { Estado } from "@prisma/client"

export class AsignacionNoEncontradaError extends Error {
  constructor() { super("Asignación no encontrada") }
}
export class SinCamposParaActualizarError extends Error {
  constructor() { super("No hay campos para actualizar") }
}
export class DatosAsignacionInvalidosError extends Error {
  constructor(message: string) { super(message) }
}
export class EdicionRestringidaError extends Error {
  constructor(campos: string[]) {
    super(
      `No se puede modificar [${campos.join(", ")}] en una asignación con historial. ` +
      `Solo se permite actualizar fecha_fin y estado.`
    )
  }
}
export class IdentificadorDuplicadoError extends Error {
  constructor() { super("Ya existe una asignación con ese identificador estructural") }
}

const CAMPOS_ESTRUCTURALES = new Set([
  "unidadId",
  "identificadorEstructural",
  "fecha_inicio",
  "materiaId",
  "comisionId",
  "turnoId",
])

type Data = {
  unidadId?:                  number
  identificadorEstructural?:  string
  fecha_inicio?:              Date
  fecha_fin?:                 Date | null
  estado?:                    Estado
  materiaId?:                 number | null
  comisionId?:                number | null
  turnoId?:                   number
}

export async function actualizarAsignacion(
  id:       number,
  tenantId: number,
  body:     Record<string, unknown>
) {
  const existe = await asignacionRepository.existeEnTenant(id, tenantId)
  if (!existe) throw new AsignacionNoEncontradaError()
  if (body.agenteId !== undefined) {
    throw new DatosAsignacionInvalidosError(
      "El titular debe modificarse desde la operación de cambio de titular"
    )
  }
  const camposEstructuralesSolicitados = Object.keys(body).filter(
    (k) => body[k] !== undefined && CAMPOS_ESTRUCTURALES.has(k)
  )
  if (camposEstructuralesSolicitados.length > 0) {
    const tieneRelaciones = await asignacionRepository.tieneEntidadesRelacionadas(id)
    if (tieneRelaciones) throw new EdicionRestringidaError(camposEstructuralesSolicitados)
  }
  const data: Data = {}
  if (body.unidadId !== undefined) {
    if (!body.unidadId) throw new DatosAsignacionInvalidosError("Unidad inválida")
    data.unidadId = Number(body.unidadId)
  }
  if (body.identificadorEstructural !== undefined) {
    const identificador = String(body.identificadorEstructural).trim()
    if (!identificador) throw new DatosAsignacionInvalidosError("Identificador estructural inválido")
    // Verificar duplicado excluyendo la propia asignación
    const duplicado = await asignacionRepository.verificarIdentificador(identificador, tenantId, id)
    if (duplicado) throw new IdentificadorDuplicadoError()
    data.identificadorEstructural = identificador
  }
  if (body.fecha_inicio !== undefined) {
    const fechaInicio = new Date(body.fecha_inicio as string)
    if (isNaN(fechaInicio.getTime())) throw new DatosAsignacionInvalidosError("Fecha inicio inválida")
    data.fecha_inicio = fechaInicio
  }
  if (body.fecha_fin !== undefined) {
    if (body.fecha_fin === null || body.fecha_fin === "") {
      data.fecha_fin = null
    } else {
      const fechaFin = new Date(body.fecha_fin as string)
      if (isNaN(fechaFin.getTime())) throw new DatosAsignacionInvalidosError("Fecha fin inválida")
      data.fecha_fin = fechaFin
    }
  }
  if (data.fecha_inicio && data.fecha_fin && data.fecha_fin < data.fecha_inicio) {
    throw new DatosAsignacionInvalidosError("La fecha fin no puede ser anterior a la fecha inicio")
  }
  if (body.estado !== undefined) {
    data.estado = body.estado as Estado
  }
  if (body.materiaId !== undefined) {
    data.materiaId = body.materiaId ? Number(body.materiaId) : null
  }
  if (body.comisionId !== undefined) {
    data.comisionId = body.comisionId ? Number(body.comisionId) : null
  }
  if (body.turnoId !== undefined) {
    if (!body.turnoId) throw new DatosAsignacionInvalidosError("Turno inválido")
    data.turnoId = Number(body.turnoId)
  }

  // UX-ASG-008: misma validación cruzada que ya existe en crearAsignacion --
  // si se especifica una comisión, su turno y su unidad tienen que coincidir
  // con los valores que se están guardando. Solo se compara contra los
  // campos que efectivamente vienen en este PATCH: si turnoId o unidadId no
  // se están tocando en esta edición puntual, no hay con qué comparar acá.
  if (data.comisionId) {
    const comision = await asignacionRepository.verificarComision(data.comisionId, tenantId)
    if (!comision) {
      throw new DatosAsignacionInvalidosError("Comisión no encontrada")
    }
    if (data.turnoId !== undefined && comision.turnoId !== data.turnoId) {
      throw new DatosAsignacionInvalidosError("El turno no coincide con la comisión")
    }
    if (data.unidadId !== undefined && comision.unidadId && comision.unidadId !== data.unidadId) {
      throw new DatosAsignacionInvalidosError("La unidad no coincide con la comisión")
    }
  }

  if (Object.keys(data).length === 0) throw new SinCamposParaActualizarError()
  return asignacionRepository.actualizar(id, tenantId, data)
}