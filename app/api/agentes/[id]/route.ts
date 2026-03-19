import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// Obtener agente por id
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {

  const params = await context.params
  const agenteId = Number(params.id)

  return withTenant(async (tenantId) => {

    const agente = await prisma.agenteInstitucion.findFirst({
      where: {
        agenteId: agenteId,
        institucionId: tenantId,
      },
      include: {
        agente: true,
      },
    })

    if (!agente) {
      return new Response(
        JSON.stringify({ error: "Agente no encontrado" }),
        { status: 404 }
      )
    }

    return Response.json(agente)

  }, req)
}


// Actualizar agente
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {

  const params = await context.params
  const agenteId = Number(params.id)

  return withTenant(async () => {

    const body = await req.json()

    const data: any = {}

    if (body.nombre !== undefined) data.nombre = body.nombre
    if (body.apellido !== undefined) data.apellido = body.apellido
    if (body.documento !== undefined) data.documento = body.documento
    if (body.email !== undefined) data.email = body.email
    if (body.telefono !== undefined) data.telefono = body.telefono
    if (body.domicilio !== undefined) data.domicilio = body.domicilio

    const agenteActualizado = await prisma.agente.update({
      where: { id: agenteId },
      data,
    })

    return Response.json(agenteActualizado)

  }, req)
}


// Eliminar agente (baja lógica)
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {

  const params = await context.params
  const agenteId = Number(params.id)

  return withTenant(async () => {

    const agenteEliminado = await prisma.agente.update({
      where: { id: agenteId },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })

    return Response.json({
      ok: true,
      agenteEliminado,
    })

  }, req)
}