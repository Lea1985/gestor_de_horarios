// lib/usecases/distribuciones/asignarModulos.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import prisma from "@/lib/prisma"

export class DistribucionNoEncontradaError extends Error {
  constructor() { super("Distribución no encontrada") }
}
export class ModulosInvalidosError extends Error {
  constructor() { super("Uno o más módulos no pertenecen a esta institución") }
}
export class FormatoModulosInvalidoError extends Error {
  constructor() { super("Se espera un array de IDs de módulos") }
}
export class SinPeriodoActivoError extends Error {
  constructor() { super("No hay período ACTIVO. Activá uno antes de asignar módulos.") }
}

/**
 * Reasigna los módulos de una distribución. Esto es la operación real que
 * dispara la regla de negocio "modificar distribución": el tramo
 * [fecha_vigencia_desde, fin del período ACTIVO] se recalcula por completo.
 *
 * Orden de operaciones (importante, evita corromper datos):
 *  1. Leer qué reemplazo cubre el tramo ANTES de tocar nada (solo lectura).
 *  2. Si hay reemplazo y no vino confirmación -> cortar y preguntar.
 *  3. Borrar las clases viejas del tramo completo (con `hasta` explícito).
 *  4. Asignar los módulos nuevos.
 *  5. Generar las clases nuevas para el mismo tramo.
 *  6. Migrar el reemplazo leído en el paso 1, si el usuario confirmó
 *     mantenerlo y el tramo era 100% migrable.
 *
 * Borrar antes de crear (en vez de al revés) evita que `eliminarEnRango`
 * — que no filtra por moduloId — se lleve puesto lo recién generado.
 */
export async function asignarModulos(
  distribucionId: number,
  tenantId: number,
  body: { modulos?: unknown; mantenerReemplazo?: boolean }
) {
  if (!Array.isArray(body.modulos)) throw new FormatoModulosInvalidoError()

  const distribucion = await prisma.distribucionHoraria.findFirst({
    where: { id: distribucionId, institucionId: tenantId, deletedAt: null },
    include: { asignacion: true },
  })
  if (!distribucion) throw new DistribucionNoEncontradaError()

  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)
  if (!periodo) throw new SinPeriodoActivoError()

  const { asignacion } = distribucion
  const desde = distribucion.fecha_vigencia_desde
  const hasta = periodo.fecha_hasta // límite explícito, siempre

  // 1. Leer cobertura del tramo ANTES de tocar nada
  const tramos = await claseProgramadaService.resolverCoberturaDelTramo({
    asignacionId: asignacion.id, desde, hasta,
  })

  // 2. Si hay reemplazo en juego y todavía no hay confirmación, preguntar
  if (tramos.length > 0 && body.mantenerReemplazo === undefined) {
    return { ok: false, requiereConfirmacion: true, tramos }
  }

  const suplenteAMigrar =
    body.mantenerReemplazo && tramos[0]?.migrable && tramos[0].suplente
      ? tramos[0].suplente
      : null

  // 3. Borrar las clases viejas del tramo completo (excluye DICTADA por
  //    defecto). hasta explícito = fin del período ACTIVO.
  const { eliminadas } = await claseProgramadaService.eliminarEnRango({
    asignacionId: asignacion.id, desde, hasta,
  })

  // 4. Asignar los módulos nuevos
  const result = await distribucionRepository.asignarModulos(
    distribucionId, tenantId, body.modulos as number[]
  )
  if (!result) throw new ModulosInvalidosError()

  // 5. Generar las clases nuevas para el mismo tramo
  const { creadas } = await claseProgramadaService.generarParaRango({
    institucionId:  tenantId,
    asignacionId:   asignacion.id,
    unidadId:       asignacion.unidadId,
    comisionId:     asignacion.comisionId,
    distribucionId,
    periodoId:      periodo.id,
    desde, hasta,
  })

  // 6. Migrar el reemplazo leído en el paso 1, si corresponde
  let migradas = 0
  if (suplenteAMigrar) {
    const r = await claseProgramadaService.migrarReemplazoATramo({
      asignacionId: asignacion.id, desde, hasta,
      asignacionTitularId: suplenteAMigrar.asignacionTitularId,
      agenteSuplenteId:    suplenteAMigrar.agenteSuplenteId,
    })
    migradas = r.migradas
  }

  return {
    ok: true,
    total: result.length,
    clasesEliminadas: eliminadas,
    clasesCreadas: creadas,
    reemplazosMigrados: migradas,
    noMigrable: tramos.length > 0 && !tramos[0].migrable ? tramos[0] : null,
  }
}
