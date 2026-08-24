// lib/usecases/distribuciones/asignarModulos.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { claseProgramadaService } from "@/lib/services/claseProgramadaService"
import { resolverClasesVencidas } from "@/lib/usecases/clases/resolverClasesVencidas"
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
// Ya NO se lanza — asignar módulos ahora funciona sin período ACTIVO.
// Se deja exportada porque app/api/distribuciones/[id]/modulos/route.ts
// todavía la importa; si la borrás de acá, borrá también esa importación.
export class SinPeriodoActivoError extends Error {
  constructor() { super("No hay período ACTIVO.") }
}
/**
 * Reasigna los módulos de una distribución.
 *
 * Asignar módulos SIEMPRE es posible, haya o no período ACTIVO — es el paso
 * que completa la distribución (sin esto, no es una distribución real, es
 * una cáscara vacía). La gestión de ClaseProgramada (detectar reemplazo,
 * suspender tramo viejo, generar tramo nuevo) es una consecuencia CONDICIONAL:
 * solo aplica si hay un período ACTIVO al que referenciar. Sin período
 * activo, se guardan los módulos y no se toca ninguna clase — quedará
 * pendiente para cuando activarPeriodo() recorra las distribuciones
 * vigentes y genere lo que corresponda.
 *
 * Orden de operaciones cuando SÍ hay período activo (evita corromper datos):
 *  1. Leer qué reemplazo cubre el tramo ANTES de tocar nada (solo lectura).
 *  2. Si hay reemplazo y no vino confirmación -> cortar y preguntar.
 *  3. Traer los módulos nuevos completos y SUSPENDER (causa CAMBIO_DISTRIBUCION)
 *     las clases del tramo que ya no corresponden a la nueva distribución.
 *     Las que siguen coincidiendo (misma fecha+módulo) quedan intactas.
 *  4. Asignar los módulos nuevos.
 *  5. Generar las clases nuevas para el mismo tramo (idempotente: no
 *     duplica las que ya quedaron intactas en el paso 3). Si el tramo cae
 *     total o parcialmente en el pasado, resolver de inmediato las clases
 *     recién generadas que ya vencieron (#83, 24/08/2026) -- sin esto,
 *     quedan PROGRAMADA hasta el gate diario del día siguiente.
 *  6. Migrar el reemplazo leído en el paso 1, si el usuario confirmó
 *     mantenerlo y el tramo era 100% migrable.
 *
 * Nunca se elimina ninguna ClaseProgramada en este flujo — la historia y
 * la identidad de cada clase se preservan, solo cambia su Estado/Causa.
 *
 * El tramo a revisar/reconciliar/generar SIEMPRE se acota a la intersección
 * entre la vigencia de la distribución y el período ACTIVO — nunca se
 * excede el rango del período, aunque la distribución tenga una vigencia
 * más amplia (mismo criterio que crearDistribucion.ts).
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
  // ── Sin período ACTIVO: solo guardamos los módulos, sin tocar clases ──
  if (!periodo) {
    const result = await distribucionRepository.asignarModulos(
      distribucionId, tenantId, body.modulos as number[]
    )
    if (!result) throw new ModulosInvalidosError()
    return {
      ok: true,
      total: result.length,
      clasesSuspendidas: 0,
      clasesCreadas: 0,
      reemplazosMigrados: 0,
      noMigrable: null,
      avisoSinPeriodoActivo: true, // el frontend puede mostrar un aviso informativo
    }
  }
  // ── Con período ACTIVO: flujo completo de reemplazo de clases ──
  const { asignacion } = distribucion
  // Clampeado: nunca antes del inicio del período ACTIVO, aunque la
  // distribución tenga una vigencia anterior (mismo criterio que
  // crearDistribucion.ts — bug corregido acá).
  const desde = distribucion.fecha_vigencia_desde > periodo.fecha_desde
    ? distribucion.fecha_vigencia_desde
    : periodo.fecha_desde
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
  // 3a. Traer los módulos nuevos completos (necesitamos dia_semana para
  //     poder calcular qué fecha+módulo corresponde con la nueva distribución)
  const modulosNuevos = await prisma.moduloHorario.findMany({
    where: { id: { in: body.modulos as number[] }, institucionId: tenantId },
    select: { id: true, dia_semana: true },
  })
  // 3b. Suspender (causa CAMBIO_DISTRIBUCION) las clases que ya no
  //     corresponden a la nueva lista de módulos. Las que siguen
  //     coincidiendo quedan intactas para ser reutilizadas en el paso 5.
  const { suspendidas } = await claseProgramadaService.suspenderNoVigentes({
    institucionId: tenantId,
    asignacionId:  asignacion.id,
    unidadId:      asignacion.unidadId,
    comisionId:    asignacion.comisionId,
    modulosNuevos,
    desde, hasta,
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
  // Best-effort: no tumbamos la asignación de módulos si esto falla (#83).
  try {
    await resolverClasesVencidas(tenantId)
  } catch (error) {
    console.error(`Error en resolverClasesVencidas tras asignarModulos (institucion ${tenantId}):`, error)
  }
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
    clasesSuspendidas: suspendidas,
    clasesCreadas: creadas,
    reemplazosMigrados: migradas,
    noMigrable: tramos.length > 0 && !tramos[0].migrable ? tramos[0] : null,
  }
}