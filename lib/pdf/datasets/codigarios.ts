// lib/pdf/datasets/codigarios.ts
import prisma from "@/lib/prisma"

export type FilaCodigario = {
  codigarioId:     number
  codigarioNombre: string
  items: {
    codigo:      string
    nombre:      string
    descripcion: string | null
    activo:      boolean
  }[]
}

/**
 * Si se pasa codigarioId, filtra solo ese codigario.
 * Si no, devuelve todos los codigarios activos de la institución.
 */
export async function obtenerDatosCodigarios(
  tenantId:    number,
  codigarioId?: number | null
): Promise<FilaCodigario[]> {
  const codigarios = await prisma.codigario.findMany({
    where: {
      institucionId: tenantId,
      activo:        true,
      deletedAt:     null,
      ...(codigarioId ? { id: codigarioId } : {}),
    },
    orderBy: { nombre: "asc" },
    select: {
      id:     true,
      nombre: true,
      items: {
        orderBy: { codigo: "asc" },
        select: {
          codigo:      true,
          nombre:      true,
          descripcion: true,
          activo:      true,
        },
      },
    },
  })

  return codigarios.map(c => ({
    codigarioId:     c.id,
    codigarioNombre: c.nombre,
    items:           c.items,
  }))
}