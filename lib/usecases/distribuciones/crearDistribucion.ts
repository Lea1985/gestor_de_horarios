// lib/usecases/distribuciones/crearDistribucion.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import { resolverClasesVencidas } from "@/lib/usecases/clases/resolverClasesVencidas"
import prisma from "@/lib/prisma"

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
// NOTA: SinPeriodoOperativoError y FechaFueraDePeriodoError se ELIMINAN.
// Ya no es un error crear una distribución sin período ACTIVO: simplemente
// no se generan clases todavía (regla de negocio original, punto 2).
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
  const asignacion = await prisma.asignacion.findFirst({
    where: { id: asignacionId, institucionId: tenantId, deletedAt: null },
    select: { id: true, unidadId: true, comisionId: true },
  })
  if (!asignacion) throw new AsignacionNoEncontradaError()
  const conflicto = await distribucionRepository.verificarSolapamiento(
    tenantId, asignacionId, version, desde, hasta
  )
  if (conflicto?.tipo === "version")      throw new VersionDuplicadaError()
  if (conflicto?.tipo === "solapamiento") throw new SolapamientoError()
  const nueva = await distribucionRepository.crear({
    tenantId,
    asignacionId,
    version,
    fecha_vigencia_desde: desde,
    fecha_vigencia_hasta: fecha_vigencia_hasta ? hasta : null,
  })
  // Si hay período ACTIVO y su rango se solapa con el de la distribución,
  // generamos las clases correspondientes ya mismo. Si no hay período ACTIVO,
  // no pasa nada acá: activarPeriodo se encargará cuando exista uno.
  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)
  let clasesCreadas = 0
  if (periodo && desde <= periodo.fecha_hasta) {
    const desdeGenerar = desde > periodo.fecha_desde ? desde : periodo.fecha_desde
    const hastaGenerar = nueva.fecha_vigencia_hasta && nueva.fecha_vigencia_hasta < periodo.fecha_hasta
      ? nueva.fecha_vigencia_hasta
      : periodo.fecha_hasta
    const { creadas } = await claseProgramadaService.generarParaRango({
      institucionId:  tenantId,
      asignacionId:   asignacion.id,
      unidadId:       asignacion.unidadId,
      comisionId:     asignacion.comisionId,
      distribucionId: nueva.id,
      periodoId:      periodo.id,
      desde: desdeGenerar,
      hasta: hastaGenerar,
    })
    clasesCreadas = creadas
    // Una distribución nueva puede cargarse con vigencia retroactiva
    // (desdeGenerar en el pasado) -- sin esto, las clases recién creadas
    // quedan PROGRAMADA hasta la primera request del día siguiente (#83,
    // 24/08/2026). Best-effort: no tumbamos la creación si esto falla.
    try {
      await resolverClasesVencidas(tenantId)
    } catch (error) {
      console.error(`Error en resolverClasesVencidas tras crearDistribucion (institucion ${tenantId}):`, error)
    }
  }
  return { ...nueva, clasesCreadas }
}