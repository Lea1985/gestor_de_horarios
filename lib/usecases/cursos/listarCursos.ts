// lib/usecases/cursos/listarCursos.ts
import { cursoRepository } from "@/lib/repositories/cursoRepository"
import prisma from "@/lib/prisma"

export async function listarCursos(tenantId: number, incluirInactivos = false) {
  const cursos = await cursoRepository.listar(tenantId, incluirInactivos)

  // Detectar cursos con materias o comisiones activas
  const [materias, comisiones] = await Promise.all([
    prisma.materia.findMany({
      where: { institucionId: tenantId, activo: true, deletedAt: null, cursoId: { not: null } },
      select: { cursoId: true },
    }),
    prisma.comision.findMany({
      where: { institucionId: tenantId, activo: true, deletedAt: null },
      select: { cursoId: true },
    }),
  ])

  const idsConMaterias   = new Set(materias.map(m => m.cursoId))
  const idsConComisiones = new Set(comisiones.map(c => c.cursoId))

  return cursos.map(c => ({
    ...c,
    tieneMaterias:   idsConMaterias.has(c.id),
    tieneComisiones: idsConComisiones.has(c.id),
    puedeEliminar:   !idsConMaterias.has(c.id) && !idsConComisiones.has(c.id),
  }))
}