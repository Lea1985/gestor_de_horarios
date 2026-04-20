// lib/usecases/modulosHorarios/actualizarModulo.ts

import { moduloHorarioRepository } from "@/lib/repositories/moduloHorarioRepository"
import { Dias, Prisma } from "@prisma/client"

export class ModuloNoEncontradoError extends Error {
  constructor() { super("Módulo no encontrado") }
}

export class SinCamposError extends Error {
  constructor() { super("No hay campos para actualizar") }
}

export class HorasInvalidasError extends Error {
  constructor() { super("hora_desde debe ser menor que hora_hasta") }
}

export class SolapamientoError extends Error {
  constructor() { super("Horario solapado con otro módulo existente") }
}

export async function actualizarModulo(id: number, tenantId: number, body: Record<string, unknown>) {
  const modulo = await moduloHorarioRepository.obtenerPorId(id, tenantId)
  if (!modulo) throw new ModuloNoEncontradoError()

  if (Object.keys(body).length === 0) throw new SinCamposError()

  const nuevoDia   = (body.dia_semana as Dias)   ?? modulo.dia_semana
  const nuevoDesde = (body.hora_desde as number) ?? modulo.hora_desde
  const nuevoHasta = (body.hora_hasta as number) ?? modulo.hora_hasta

  if (nuevoDesde >= nuevoHasta) throw new HorasInvalidasError()

  if (await moduloHorarioRepository.haySolapamiento(tenantId, nuevoDia, nuevoDesde, nuevoHasta, id)) {
    throw new SolapamientoError()
  }

  const data: Prisma.ModuloHorarioUpdateInput = {
    dia_semana: nuevoDia,
    hora_desde: nuevoDesde,
    hora_hasta: nuevoHasta,
  }

  if (body.activo  !== undefined) data.activo = body.activo as boolean
  if (body.turnoId !== undefined) {
    data.turno = body.turnoId ? { connect: { id: body.turnoId as number } } : { disconnect: true }
  }

  return moduloHorarioRepository.actualizar(id, data)
}