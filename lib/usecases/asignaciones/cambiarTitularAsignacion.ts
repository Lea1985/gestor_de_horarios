// ─────────────────────────────────────────────────────────────────────────────
// lib/usecases/asignaciones/cambiarTitularAsignacion.ts
// ─────────────────────────────────────────────────────────────────────────────

import prisma from "@/lib/prisma"
import { asignacionRepository } from "@/lib/repositories/asignacionRepository"

export class TitularAsignacionError extends Error {}

export async function cambiarTitularAsignacion(
  asignacionId: number,
  tenantId: number,
  agenteId: number,
  fechaDesde?: string
) {
  const asignacion = await asignacionRepository.existeEnTenant(
    asignacionId,
    tenantId
  )

  if (!asignacion) {
    throw new TitularAsignacionError("Asignación no encontrada")
  }

  const agente = await asignacionRepository.verificarAgente(agenteId, tenantId)

  if (!agente) {
    throw new TitularAsignacionError("Agente no encontrado")
  }

  const desde = fechaDesde ? new Date(fechaDesde) : new Date()

  if (isNaN(desde.getTime())) {
    throw new TitularAsignacionError("Fecha inválida")
  }

  const cierreAnterior = new Date(desde)
  cierreAnterior.setDate(cierreAnterior.getDate() - 1)

  return prisma.$transaction(async (tx) => {
    // Cerrar titular vigente si existe
    await tx.titularAsignacion.updateMany({
      where: {
        institucionId: tenantId,
        asignacionId,
        fecha_hasta: null,
        activo: true,
      },
      data: {
        fecha_hasta: cierreAnterior,
        activo: false,
      },
    })

    // Crear nuevo titular
    await tx.titularAsignacion.create({
      data: {
        institucionId: tenantId,
        asignacionId,
        agenteId,
        fecha_desde: desde,
      },
    })

    // Devolver la asignación con el nuevo titular vigente
    return tx.asignacion.findFirst({
      where: { id: asignacionId },
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
  })
}
