// lib/usecases/asignaciones/crearAsignacion.ts

import prisma from "@/lib/prisma"
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export class DatosAsignacionInvalidosError extends Error {}
export class EntidadNoEncontradaError extends Error {}

type Input = {
  agenteId?: number | null
  unidadId: number
  materiaId?: number | null
  comisionId?: number | null
  turnoId: number
  fecha_inicio: string | Date
  fecha_fin?: string | Date | null
  identificadorEstructural: string
}

export async function crearAsignacion(tenantId: number, data: Input) {
  const identificador = data.identificadorEstructural?.trim()

  if (!data.unidadId || !data.turnoId || !identificador) {
    throw new DatosAsignacionInvalidosError("Faltan datos obligatorios")
  }

  const fechaInicio = new Date(data.fecha_inicio)
  const fechaFin = data.fecha_fin ? new Date(data.fecha_fin) : null

  if (isNaN(fechaInicio.getTime())) {
    throw new DatosAsignacionInvalidosError("Fecha inicio inválida")
  }

  if (fechaFin && isNaN(fechaFin.getTime())) {
    throw new DatosAsignacionInvalidosError("Fecha fin inválida")
  }

  if (fechaFin && fechaFin < fechaInicio) {
    throw new DatosAsignacionInvalidosError(
      "La fecha fin no puede ser anterior a la fecha inicio"
    )
  }

  const [agente, unidad, materia, comision, turno] = await Promise.all([
    data.agenteId
      ? asignacionRepository.verificarAgente(data.agenteId, tenantId)
      : Promise.resolve(null),
    asignacionRepository.verificarUnidad(data.unidadId, tenantId),
    data.materiaId
      ? asignacionRepository.verificarMateria(data.materiaId, tenantId)
      : Promise.resolve(null),
    data.comisionId
      ? asignacionRepository.verificarComision(data.comisionId, tenantId)
      : Promise.resolve(null),
    asignacionRepository.verificarTurno(data.turnoId, tenantId),
  ])

  if (data.agenteId && !agente) {
    throw new EntidadNoEncontradaError("Agente no encontrado")
  }

  if (!unidad) {
    throw new EntidadNoEncontradaError("Unidad no encontrada")
  }

  if (data.materiaId && !materia) {
    throw new EntidadNoEncontradaError("Materia no encontrada")
  }

  if (data.comisionId && !comision) {
    throw new EntidadNoEncontradaError("Comisión no encontrada")
  }

  if (!turno) {
    throw new EntidadNoEncontradaError("Turno no encontrado")
  }

  if (comision) {
    if (comision.turnoId !== data.turnoId) {
      throw new DatosAsignacionInvalidosError(
        "El turno no coincide con la comisión"
      )
    }

    if (comision.unidadId && comision.unidadId !== data.unidadId) {
      throw new DatosAsignacionInvalidosError(
        "La unidad no coincide con la comisión"
      )
    }
  }

  return prisma.$transaction(async (tx) => {
    const asignacion = await tx.asignacion.create({
      data: {
        institucionId: tenantId,
        unidadId: data.unidadId,
        identificadorEstructural: identificador,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        materiaId: data.materiaId ?? null,
        comisionId: data.comisionId ?? null,
        turnoId: data.turnoId,
      },
      include: {
        unidad: true,
        materia: true,
        comision: true,
        turno: true,
        titularidades: {
          where: { activo: true, fecha_hasta: null },
          include: { agente: true },
          take: 1,
        },
      },
    })

    // Si se especificó agente, crear el primer registro de titularidad.
    // Un cargo sin agenteId queda vacante hasta que se le asigne titular.
    if (data.agenteId) {
      await tx.titularAsignacion.create({
        data: {
          institucionId: tenantId,
          asignacionId: asignacion.id,
          agenteId: data.agenteId,
          fecha_desde: fechaInicio,
        },
      })
    }

    return asignacion
  })
}