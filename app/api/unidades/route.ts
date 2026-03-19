import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

    const unidades = await prisma.unidadOrganizativa.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null
      }
    })

    return Response.json(unidades)

  }, req)
}

export async function POST(req: Request) {
  return withTenant(async (tenantId) => {

    let body

    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 })
    }

    const { codigoUnidad, nombre, tipo } = body

    if (codigoUnidad == null || !nombre) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 })
    }

    try {

      const nueva = await prisma.unidadOrganizativa.create({
        data: {
          institucionId: tenantId,
          codigoUnidad,
          nombre,
          tipo
        }
      })

      return Response.json(nueva)

    } catch (error: any) {

      console.error("🔥 ERROR POST UNIDADES:", error)

      if (error.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Ya existe una unidad con ese código" }),
          { status: 409 }
        )
      }

      return new Response(
        JSON.stringify({ error: "Error al crear unidad" }),
        { status: 500 }
      )
    }

  }, req)
}