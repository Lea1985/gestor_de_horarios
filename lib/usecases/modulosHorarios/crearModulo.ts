// lib/usecases/modulosHorarios/crearModulo.ts

import { moduloHorarioRepository } from "@/lib/repositories/moduloHorarioRepository"
import { Dias } from "@prisma/client"

export class DatosModuloInvalidosError extends Error {
  constructor() { super("dia_semana, hora_desde y hora_hasta son obligatorios") }
}

export class HorasInvalidasError extends Error {
  constructor() { super("hora_desde debe ser menor que hora_hasta") }
}

export class SolapamientoError extends Error {
  constructor() { super("Horario solapado con otro módulo existente") }
}

const DIAS_VALIDOS = Object.values(Dias)

export class DiaInvalidoError extends Error {
  constructor() { super(`dia_semana inválido. Válidos: ${DIAS_VALIDOS.join(", ")}`) }
}

export async function crearModulo(tenantId: number, body: {
  dia_semana?: string
  hora_desde?: number
  hora_hasta?: number
  turnoId?:    number | null
}) {
  const { dia_semana, hora_desde, hora_hasta, turnoId } = body

  if (!dia_semana || hora_desde == null || hora_hasta == null) {
    throw new DatosModuloInvalidosError()
  }

  if (!DIAS_VALIDOS.includes(dia_semana as Dias)) throw new DiaInvalidoError()
  if (hora_desde >= hora_hasta) throw new HorasInvalidasError()

  if (await moduloHorarioRepository.haySolapamiento(tenantId, dia_semana as Dias, hora_desde, hora_hasta)) {
    throw new SolapamientoError()
  }

  return moduloHorarioRepository.crear({ tenantId, dia_semana: dia_semana as Dias, hora_desde, hora_hasta, turnoId })
}