import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ===== POST (reemplazo total de módulos) =====
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const distribucionId = Number(params.id)

  return withTenant(async (tenantId) => {

    if (isNaN(distribucionId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      )
    }

    let body

    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400 }
      )
    }

    const { modulos } = body

    if (!Array.isArray(modulos)) {
      return new Response(
        JSON.stringify({ error: "Se espera un array de módulos" }),
        { status: 400 }
      )
    }

    // 🧹 limpiar duplicados
    const modulosUnicos = [...new Set(modulos.map(Number))]

    if (modulosUnicos.some(isNaN)) {
      return new Response(
        JSON.stringify({ error: "IDs de módulos inválidos" }),
        { status: 400 }
      )
    }

    // 🔒 validar distribución (multi-tenant + estado)
    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: {
        id: distribucionId,
        institucionId: tenantId,
        deletedAt: null,
        activo: true
      }
    })

    if (!distribucion) {
      return new Response(
        JSON.stringify({ error: "Distribución no válida" }),
        { status: 404 }
      )
    }

    // 🚀 TRANSACCIÓN (clave)
    const result = await prisma.$transaction(async (tx) => {

      // 1. borrar existentes
      await tx.distribucionModulo.deleteMany({
        where: {
          distribucionHorariaId: distribucionId
        }
      })

      // 2. insertar nuevos (si hay)
      if (modulosUnicos.length > 0) {

        await tx.distribucionModulo.createMany({
          data: modulosUnicos.map((moduloHorarioId: number) => ({
            distribucionHorariaId: distribucionId,
            moduloHorarioId
          })),
          skipDuplicates: true
        })
      }

      // 3. devolver estado actualizado
      return tx.distribucionModulo.findMany({
        where: {
          distribucionHorariaId: distribucionId
        },
        include: {
          moduloHorario: true
        }
      })
    })

    return Response.json({
      ok: true,
      total: result.length,
      data: result
    })

  }, req)
}