//lib/usecases/distribuciones/asignarModulos.ts
import { distribucionRepository } from "@/lib/repositories/distribucionRepository"
import { claseProgramadaRepository } from "@/lib/repositories/claseProgramadaRepository"
import { periodoOperativoRepository } from "@/lib/repositories/periodoOperativoRepository"
import { generarClases } from "@/lib/helpers/clases"
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
export class SinPeriodoOperativoError extends Error {
  constructor() { super("No hay período operativo vigente. Establecé uno antes de asignar módulos.") }
}

export async function asignarModulos(
  distribucionId: number,
  tenantId: number,
  body: { modulos?: unknown }
) {
  if (!Array.isArray(body.modulos)) throw new FormatoModulosInvalidoError()

  const distribucion = await prisma.distribucionHoraria.findFirst({
    where: { id: distribucionId, institucionId: tenantId, deletedAt: null },
    include: {
      asignacion: true,
      distribucionModulos: { include: { moduloHorario: true } },
    },
  })
  if (!distribucion) throw new DistribucionNoEncontradaError()

  // Obtener período operativo vigente
  const periodo = await periodoOperativoRepository.obtenerVigente(tenantId)
  if (!periodo) throw new SinPeriodoOperativoError()

  const result = await distribucionRepository.asignarModulos(
    distribucionId,
    tenantId,
    body.modulos as number[]
  )
  if (!result) throw new ModulosInvalidosError()

  const modulosAsignados = await prisma.distribucionModulo.findMany({
    where: { distribucionHorariaId: distribucionId },
    include: { moduloHorario: true },
  })

  const { asignacion } = distribucion
  const desde = distribucion.fecha_vigencia_desde
  const hasta = periodo.fecha_hasta  // ← límite del período operativo vigente

  await claseProgramadaRepository.eliminarFuturas(asignacion.id, desde)

  const diasSuspendidos = await claseProgramadaRepository.listarFeriados(
    tenantId,
    periodo.id,  // ← filtra por período operativo
    desde,
    hasta
  )

  const clases = generarClases({
    institucionId: tenantId,
    asignacionId:  asignacion.id,
    unidadId:      asignacion.unidadId,
    comisionId:    asignacion.comisionId,
    modulos:       modulosAsignados.map(m => ({
      id:         m.moduloHorario.id,
      dia_semana: m.moduloHorario.dia_semana,
    })),
    desde,
    hasta,
    diasSuspendidos,
  })

  await claseProgramadaRepository.generarParaDistribucion(clases)

  return { ok: true, total: result.length, clases: clases.length, data: result }
}