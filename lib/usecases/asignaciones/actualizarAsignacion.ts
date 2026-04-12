import { asignacionRepository } from "@/lib/repositories/asignacionRepository"
import { Prisma, Estado } from "@prisma/client"

export class AsignacionNoEncontradaError extends Error {
  constructor() { super("Asignación no encontrada") }
}

export class SinCamposParaActualizarError extends Error {
  constructor() { super("No hay campos para actualizar") }
}

export async function actualizarAsignacion(id: number, tenantId: number, body: Record<string, unknown>) {
  const existe = await asignacionRepository.existeEnTenant(id, tenantId)
  if (!existe) throw new AsignacionNoEncontradaError()

  const data: Prisma.AsignacionUpdateInput = {}

  if (body.identificadorEstructural !== undefined) data.identificadorEstructural = body.identificadorEstructural as string
  if (body.fecha_inicio             !== undefined) data.fecha_inicio             = new Date(body.fecha_inicio as string)
  if (body.fecha_fin                !== undefined) data.fecha_fin                = body.fecha_fin ? new Date(body.fecha_fin as string) : null
  if (body.estado                   !== undefined) data.estado                   = body.estado as Estado
  if (body.materiaId  !== undefined) data.materia  = body.materiaId  ? { connect: { id: body.materiaId  as number } } : { disconnect: true }
  if (body.cursoId    !== undefined) data.curso    = body.cursoId    ? { connect: { id: body.cursoId    as number } } : { disconnect: true }
  if (body.comisionId !== undefined) data.comision = body.comisionId ? { connect: { id: body.comisionId as number } } : { disconnect: true }
  if (body.turnoId    !== undefined) data.turno    = body.turnoId    ? { connect: { id: body.turnoId    as number } } : { disconnect: true }

  if (Object.keys(data).length === 0) throw new SinCamposParaActualizarError()

  return asignacionRepository.actualizar(id, data)
}