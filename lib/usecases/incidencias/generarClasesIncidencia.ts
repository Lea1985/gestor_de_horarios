// lib/usecases/incidencias/generarClasesIncidencia.ts
import prisma from "@/lib/prisma"
import { generarClases } from "@/lib/helpers/clases"
import { claseProgramadaRepository } from "@/lib/repositories/claseProgramadaRepository"

/**
 * Dado el id de una incidencia, busca la asignación con su distribución
 * vigente y genera las ClaseProgramada faltantes en el rango de la incidencia.
 * Es idempotente: skipDuplicates evita duplicados.
 */
export async function generarClasesIncidencia(
  incidenciaId: number,
  tenantId:     number
): Promise<{ count: number }> {

  // 1. Obtener incidencia con rango de fechas y asignacionId
  const incidencia = await prisma.incidencia.findFirst({
    where: { id: incidenciaId, deletedAt: null, asignacion: { institucionId: tenantId } },
    select: {
      fecha_desde:  true,
      fecha_hasta:  true,
      asignacionId: true,
    },
  })

  if (!incidencia) return { count: 0 }

  // 2. Obtener asignación con distribución vigente y módulos
  const asignacion = await prisma.asignacion.findFirst({
    where: { id: incidencia.asignacionId, institucionId: tenantId, deletedAt: null },
    select: {
      id:        true,
      unidadId:  true,
      comisionId: true,
      distribuciones: {
        where: {
          activo:    true,
          deletedAt: null,
          fecha_vigencia_desde: { lte: incidencia.fecha_hasta },
          OR: [
            { fecha_vigencia_hasta: null },
            { fecha_vigencia_hasta: { gte: incidencia.fecha_desde } },
          ],
        },
        orderBy: { version: "desc" },
        take: 1,
        select: {
          distribucionModulos: {
            select: {
              moduloHorario: {
                select: { id: true, dia_semana: true },
              },
            },
          },
        },
      },
    },
  })

  if (!asignacion) return { count: 0 }

  const distribucion = asignacion.distribuciones[0]
  if (!distribucion) return { count: 0 }

  const modulos = distribucion.distribucionModulos.map(dm => dm.moduloHorario)

  // 3. Obtener feriados en el rango
  const feriados = await claseProgramadaRepository.listarFeriados(
    tenantId,
    incidencia.fecha_desde,
    incidencia.fecha_hasta
  )

  // 4. Generar clases con el helper existente
  const clases = generarClases({
    institucionId: tenantId,
    asignacionId:  incidencia.asignacionId,
    unidadId:      asignacion.unidadId,
    comisionId:    asignacion.comisionId ?? null,
    modulos,
    desde:         incidencia.fecha_desde,
    hasta:         incidencia.fecha_hasta,
    diasSuspendidos: feriados,
  })

  if (clases.length === 0) return { count: 0 }

  // 5. Insertar con skipDuplicates — idempotente
  return prisma.claseProgramada.createMany({
    data: clases,
    skipDuplicates: true,
  })
}