// lib/usecases/asignaciones/cambiarTitularAsignacion.ts
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
  desde.setUTCHours(0, 0, 0, 0)
  if (isNaN(desde.getTime())) {
    throw new TitularAsignacionError("Fecha inválida")
  }
  const cierreAnterior = new Date(desde)
  cierreAnterior.setUTCDate(cierreAnterior.getUTCDate() - 1)

  // No se puede cambiar el titular de una asignación mientras haya una
  // incidencia activa que todavía no terminó: mientras el titular está de
  // licencia, sigue siendo el titular del cargo (alguien más lo cubre
  // temporalmente vía Reemplazo). Un cambio de titular real solo tiene
  // sentido si la incidencia ya terminó -- si se permitiera acá, quedaría
  // un estado contradictorio (dos personas "siendo titular" del mismo
  // cargo en el mismo momento, una de licencia y otra activa) que ningún
  // reporte podría representar de forma consistente.
  const incidenciaActivaSolapada = await prisma.incidencia.findFirst({
    where: {
      asignacionId,
      activo:      true,
      deletedAt:   null,
      fecha_hasta: { gte: desde },
    },
    select: { id: true, fecha_hasta: true },
  })
  if (incidenciaActivaSolapada) {
    const fechaFin = incidenciaActivaSolapada.fecha_hasta.toISOString().split("T")[0]
    throw new TitularAsignacionError(
      `No se puede cambiar el titular: la incidencia #${incidenciaActivaSolapada.id} está activa hasta el ${fechaFin}. Esperá a que finalice o edítala antes de cambiar el titular.`
    )
  }

  const titularVigente = await prisma.titularAsignacion.findFirst({
    where: {
      institucionId: tenantId,
      asignacionId,
      fecha_hasta: null,
      activo: true,
    },
    select: { id: true, fecha_desde: true, agenteId: true },
  })

  // UX-ASG-004: si el agente elegido ya es el titular vigente, no tiene
  // sentido cerrar el registro actual y abrir uno idéntico -- eso
  // fragmenta el historial con un corte artificial sin que haya habido
  // ningún cambio real de persona.
  if (titularVigente && titularVigente.agenteId === agenteId) {
    throw new TitularAsignacionError(
      "Ese agente ya es el titular actual de esta asignación. No se registró ningún cambio."
    )
  }

  // UX-ASG-001: ahora que la fecha de vigencia es un campo editable desde la
  // UI, hay que evitar que el operador elija una fecha anterior (o igual) al
  // inicio de la titularidad vigente: eso cerraría ese registro con
  // fecha_hasta < fecha_desde, un rango inválido en el historial.
  if (titularVigente && desde <= titularVigente.fecha_desde) {
    const inicioVigente = titularVigente.fecha_desde.toISOString().split("T")[0]
    throw new TitularAsignacionError(
      `La fecha elegida (${fechaDesde ?? desde.toISOString().split("T")[0]}) es anterior o igual al inicio de la titularidad actual (${inicioVigente}). Elegí una fecha posterior.`
    )
  }

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