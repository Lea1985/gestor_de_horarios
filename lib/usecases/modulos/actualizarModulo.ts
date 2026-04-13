import { moduloRepository } from "@/lib/repositories/moduloRepository"
import { Dias, Prisma } from "@prisma/client"

export class ModuloNoEncontradoError extends Error {
  constructor() { super("Módulo no encontrado") }
}

export class HorasInvalidasError extends Error {
  constructor() { super("hora_desde debe ser menor que hora_hasta") }
}

export class SolapamientoError extends Error {
  constructor() { super("Horario solapado con otro módulo existente") }
}

export async function actualizarModulo(id: number, tenantId: number, body: Record<string, unknown>) {
  const modulo = await moduloRepository.obtenerPorId(id, tenantId)
  if (!modulo) throw new ModuloNoEncontradoError()

  const nuevoDia   = (body.dia_semana as Dias)   ?? modulo.dia_semana
  const nuevoDesde = (body.hora_desde as number) ?? modulo.hora_desde
  const nuevoHasta = (body.hora_hasta as number) ?? modulo.hora_hasta

  if (nuevoDesde >= nuevoHasta) throw new HorasInvalidasError()

  if (await moduloRepository.haySolapamiento(tenantId, nuevoDia, nuevoDesde, nuevoHasta, id)) {
    throw new SolapamientoError()
  }

  const data: Prisma.ModuloHorarioUpdateInput = {
    dia_semana: nuevoDia,
    hora_desde: nuevoDesde,
    hora_hasta: nuevoHasta,
    activo:     body.activo != null ? (body.activo as boolean) : modulo.activo,
  }

  if (body.turnoId !== undefined) {
    data.turno = body.turnoId ? { connect: { id: body.turnoId as number } } : { disconnect: true }
  }

  return moduloRepository.actualizar(id, data)
}