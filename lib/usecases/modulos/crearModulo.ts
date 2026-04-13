import { moduloRepository } from "@/lib/repositories/moduloRepository"
import { Dias } from "@prisma/client"

export class DatosModuloInvalidosError extends Error {
  constructor() { super("dia_semana, hora_desde y hora_hasta son obligatorios") }
}

export class HorasInvalidasError extends Error {
  constructor() { super("hora_desde debe ser menor que hora_hasta") }
}

export class TurnoInvalidoError extends Error {
  constructor() { super("Turno inválido") }
}

export class SolapamientoError extends Error {
  constructor() { super("Horario solapado con otro módulo existente") }
}

export async function crearModulo(tenantId: number, body: {
  dia_semana?: string
  hora_desde?:  number
  hora_hasta?:  number
  turnoId?:     number | null
}) {
  const { dia_semana, hora_desde, hora_hasta, turnoId } = body

  if (!dia_semana || hora_desde == null || hora_hasta == null) {
    throw new DatosModuloInvalidosError()
  }

  if (hora_desde >= hora_hasta) throw new HorasInvalidasError()

  if (turnoId != null) {
    const turno = await moduloRepository.verificarTurno(Number(turnoId), tenantId)
    if (!turno) throw new TurnoInvalidoError()
  }

  const solapa = await moduloRepository.haySolapamiento(tenantId, dia_semana as Dias, hora_desde, hora_hasta)
  if (solapa) throw new SolapamientoError()

  return moduloRepository.crear(tenantId, {
    dia_semana: dia_semana as Dias,
    hora_desde,
    hora_hasta,
    turnoId:    turnoId != null ? Number(turnoId) : null,
  })
}