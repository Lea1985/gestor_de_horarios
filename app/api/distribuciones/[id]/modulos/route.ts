import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const distribucionId = Number(id)

  if (isNaN(distribucionId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  return withContext(req, async ({ tenantId }) => {
console.log(`POST /api/distribuciones/${distribucionId} - tenantId: ${tenantId}`, await req.clone().text()) // log para debugging
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { modulos } = body

    if (!Array.isArray(modulos)) {
      return Response.json(
        { error: "Se espera un array de IDs de módulos" },
        { status: 400 }
      )
    }

    // limpiar duplicados y asegurar números
    const modulosUnicos = [...new Set(modulos.map((m: any) => Number(m)))]

    if (modulosUnicos.some(isNaN)) {
      return Response.json(
        { error: "Todos los IDs de módulos deben ser numéricos" },
        { status: 400 }
      )
    }

    // ✅ SOLO validar existencia + tenant (NO activo)
    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: {
        id:            distribucionId,
        institucionId: tenantId,
        deletedAt:     null,
      },
      select: { id: true },
    })

    if (!distribucion) {
      return Response.json(
        { error: "Distribución no encontrada" },
        { status: 404 }
      )
    }

    // ✅ validar módulos SOLO por tenant
    if (modulosUnicos.length > 0) {
      const modulosValidos = await prisma.moduloHorario.findMany({
        where: {
          id:            { in: modulosUnicos },
          institucionId: tenantId,
          deletedAt:     null,
        },
        select: { id: true },
      })

      if (modulosValidos.length !== modulosUnicos.length) {
        return Response.json(
          { error: "Uno o más módulos no pertenecen a esta institución" },
          { status: 400 }
        )
      }
    }

    // 🔥 transacción limpia (replace total)
    const result = await prisma.$transaction(async (tx) => {

      await tx.distribucionModulo.deleteMany({
        where: { distribucionHorariaId: distribucionId },
      })

      if (modulosUnicos.length > 0) {
        await tx.distribucionModulo.createMany({
          data: modulosUnicos.map((moduloHorarioId: number) => ({
            distribucionHorariaId: distribucionId,
            moduloHorarioId,
          })),
        })
      }

      return tx.distribucionModulo.findMany({
        where: { distribucionHorariaId: distribucionId },
        include: { moduloHorario: true },
      })
    })

    return Response.json({
      ok:    true,
      total: result.length,
      data:  result,
    })
  })
}