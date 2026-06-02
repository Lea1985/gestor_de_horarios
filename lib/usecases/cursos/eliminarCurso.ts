// lib/usecases/cursos/eliminarCurso.ts
import { cursoRepository } from "@/lib/repositories/cursoRepository"
import prisma from "@/lib/prisma"

export class CursoNoEncontradoError extends Error {}

export class TieneMateriasActivasError extends Error {
  constructor() { super("No se puede eliminar un curso con materias activas") }
}

export class TieneComisionesActivasError extends Error {
  constructor() { super("No se puede eliminar un curso con comisiones activas") }
}

export async function eliminarCurso(id: number, tenantId: number) {
  const existe = await cursoRepository.existeEnTenant(id, tenantId)
  if (!existe) throw new CursoNoEncontradoError("Curso no encontrado")

  // Regla 1: no eliminar si tiene materias activas
  const tieneMaterias = await prisma.materia.count({
    where: { cursoId: id, institucionId: tenantId, activo: true, deletedAt: null },
  })
  if (tieneMaterias > 0) throw new TieneMateriasActivasError()

  // Regla 2: no eliminar si tiene comisiones activas
  const tieneComisiones = await prisma.comision.count({
    where: { cursoId: id, institucionId: tenantId, activo: true, deletedAt: null },
  })
  if (tieneComisiones > 0) throw new TieneComisionesActivasError()

  await cursoRepository.eliminar(id, tenantId)
  return { ok: true }
}