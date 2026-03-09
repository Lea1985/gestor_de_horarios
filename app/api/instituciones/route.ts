import prisma from "@/lib/prisma"
import { withTenant } from "../../../lib/tenant/withTenant"

export async function GET(req: Request) {

  return withTenant(async (tenantId) => {

    const institucion = await prisma.institucion.findUnique({
      where: { id: tenantId }
    })

    return Response.json(institucion)

  }, req)

}

export async function PATCH(req: Request) {

  return withTenant(async (tenantId) => {

    let body

    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400 }
      )
    }

    try {

      const data: any = {}

      if (body.nombre !== undefined) data.nombre = body.nombre
      if (body.domicilio !== undefined) data.domicilio = body.domicilio
      if (body.telefono !== undefined) data.telefono = body.telefono
      if (body.configuracion !== undefined) data.configuracion = body.configuracion

      if (Object.keys(data).length === 0) {
        return new Response(
          JSON.stringify({ error: "No hay datos para actualizar" }),
          { status: 400 }
        )
      }

      const institucionActualizada = await prisma.institucion.update({
        where: { id: tenantId },
        data
      })

      return Response.json(institucionActualizada)

    } catch (error) {

      console.error("Error PATCH institucion:", error)

      return new Response(
        JSON.stringify({ error: "Error al actualizar institución" }),
        { status: 500 }
      )
    }

  }, req)

}