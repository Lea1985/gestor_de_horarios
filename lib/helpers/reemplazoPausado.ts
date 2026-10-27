// lib/helpers/reemplazoPausado.ts
//
// Reemplazo "en pausa" (Fase 4, B): activo = false y deletedAt = NULL.
//
// Licencias encadenadas: X está de licencia (padre) y Lelli lo reemplaza. Si
// Lelli falta un día D, se carga una licencia hija y la clase de D pasa a la
// hija. El reemplazo de Lelli en D NO se quita: queda en pausa. Sigue siendo
// cierto que Lelli reemplaza a X ese día (la padre lo muestra), pero Lelli no
// está cubriendo la clase: un pausado no cuenta como cobertura (el motor, el
// Dashboard y los reportes solo cuentan activo = true), ni como clase dada por
// el suplente, ni como "quitado". Quién cubre a Lelli en D es el reemplazo de
// la hija (o nadie: la clase queda SUSPENDIDA).
//
// Las demás desactivaciones (Quitar, reasignar, anulación de la
// reconciliación) ponen siempre deletedAt: esas sí son bajas.
//
// - Al pasar clases a una licencia hija se pausan los reemplazos activos de
//   esas clases que no son de la hija (los de la padre o, en una nieta, los de
//   la hija).
// - Cuando una clase vuelve a una licencia (se elimina la hija o se achica su
//   rango), se reanuda el pausado de esa licencia, solo si la clase sigue viva
//   y no tiene otro reemplazo activo.
//
// Límite conocido (sin implementar): si la reconciliación crea una clase nueva
// dentro del rango de una hija con "mantener suplente", la cubre el suplente
// de la hija, pero no se crea el pausado de la padre: la padre muestra ese día
// sin su reemplazante. Ver docs/reemplazos-en-pausa.md.
import { Causa, Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import type { Db } from "@/lib/types/db"

export const REEMPLAZO_PAUSADO = { activo: false, deletedAt: null } satisfies Prisma.ReemplazoWhereInput

export function esPausado(r: { activo: boolean; deletedAt: Date | string | null }): boolean {
  return !r.activo && r.deletedAt === null
}

/** Pausa los reemplazos activos de las clases que no pertenecen a licenciaId. */
export async function pausarReemplazosDeOtrasLicencias(
  claseIds: number[],
  licenciaId: number,
  db: Db = prisma
): Promise<number> {
  if (claseIds.length === 0) return 0
  const { count } = await db.reemplazo.updateMany({
    where: {
      claseId: { in: claseIds },
      activo:  true,
      OR:      [{ incidenciaId: null }, { incidenciaId: { not: licenciaId } }],
    },
    data: { activo: false, deletedAt: null },
  })
  return count
}

/**
 * Reanuda, en cada clase, el pausado de la licencia que hoy la tiene
 * (clase.incidenciaId). No actúa si la clase está dada de baja
 * (FIN_ASIGNACION, CAMBIO_DISTRIBUCION) o ya tiene otro reemplazo activo.
 * El llamador vuelve a resolver las clases después.
 */
export async function reanudarEnClases(claseIds: number[], db: Db = prisma): Promise<number> {
  if (claseIds.length === 0) return 0
  const clases = await db.claseProgramada.findMany({
    where:  { id: { in: claseIds } },
    select: {
      id: true, incidenciaId: true, causa: true,
      reemplazos: { where: { activo: true }, take: 1, select: { id: true } },
    },
  })
  let reanudados = 0
  for (const clase of clases) {
    if (clase.incidenciaId === null || clase.reemplazos.length > 0) continue
    if (clase.causa === Causa.FIN_ASIGNACION || clase.causa === Causa.CAMBIO_DISTRIBUCION) continue
    const pausado = await db.reemplazo.findFirst({
      where:   { claseId: clase.id, incidenciaId: clase.incidenciaId, ...REEMPLAZO_PAUSADO },
      orderBy: { id: "desc" },
      select:  { id: true },
    })
    if (!pausado) continue
    await db.reemplazo.update({ where: { id: pausado.id }, data: { activo: true } })
    reanudados++
  }
  return reanudados
}
