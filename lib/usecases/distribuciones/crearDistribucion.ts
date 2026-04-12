import { distribucionRepository } from "@/lib/repositories/distribucionRepository"

export class DatosDistribucionInvalidosError extends Error {
  constructor() { super("asignacionId, version y fecha_vigencia_desde son obligatorios") }
}

export class FechaInvalidaError extends Error {
  constructor() { super("fecha_vigencia_desde inválida") }
}

export class RangoFechasInvalidoError extends Error {
  constructor() { super("fecha_vigencia_desde debe ser menor o igual a fecha_vigencia_hasta") }
}

export class AsignacionNoEncontradaError extends Error {
  constructor() { super("Asignación no encontrada") }
}

export class VersionDuplicadaError extends Error {
  constructor() { super("Ya existe esa versión para la asignación") }
}

export class SolapamientoError extends Error {
  constructor() { super("Existe una distribución activa en ese rango de fechas") }
}

export async function crearDistribucion(tenantId: number, body: {
  asignacionId?:         number
  version?:              number
  fecha_vigencia_desde?: string
  fecha_vigencia_hasta?: string
}) {
  const { asignacionId, version, fecha_vigencia_desde, fecha_vigencia_hasta } = body

  if (!asignacionId || version == null || !fecha_vigencia_desde) {
    throw new DatosDistribucionInvalidosError()
  }

  const desde = distribucionRepository.parseDate(fecha_vigencia_desde)
  if (!desde) throw new FechaInvalidaError()

  const hasta = distribucionRepository.parseDate(fecha_vigencia_hasta) ?? new Date("9999-12-31")
  if (desde > hasta) throw new RangoFechasInvalidoError()

  // Verificar asignación pertenece al tenant
  const { default: prisma } = await import("@/lib/prisma")
  const asignacion = await prisma.asignacion.findFirst({
    where: { id: asignacionId, institucionId: tenantId, deletedAt: null },
    select: { id: true },
  })
  if (!asignacion) throw new AsignacionNoEncontradaError()

  const conflicto = await distribucionRepository.verificarSolapamiento(asignacionId, version, desde, hasta)
  if (conflicto?.tipo === "version") throw new VersionDuplicadaError()
  if (conflicto?.tipo === "solapamiento") throw new SolapamientoError()

  return distribucionRepository.crear({
    tenantId,
    asignacionId,
    version,
    fecha_vigencia_desde: desde,
    fecha_vigencia_hasta: fecha_vigencia_hasta ? hasta : null,
  })
}