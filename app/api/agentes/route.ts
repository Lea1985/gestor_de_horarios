import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// Obtener todos los agentes de la institución
export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

  const agentes = await prisma.agenteInstitucion.findMany({
  where: {
    institucionId: tenantId,
    agente: {
      activo: true,
      deletedAt: null
    }
  },
  include: {
    agente: true,
  },
  orderBy: {
    agente: {
      apellido: "asc",
    },
  },
})

    return Response.json(agentes)

  }, req)
}

// Crear un nuevo agente y asignarlo a la institución
export async function POST(req: Request) {
  return withTenant(async (tenantId) => {

    let body
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 })
    }

    if (!body.nombre || !body.apellido) {
      return new Response(JSON.stringify({ error: "Faltan campos obligatorios" }), { status: 400 })
    }

    try {

      const agente = await prisma.agente.create({
        data: {
          nombre: body.nombre,
          apellido: body.apellido,
          documento: body.documento,
          email: body.email,
          telefono: body.telefono,
          domicilio: body.domicilio,
        },
      })

      const agenteInstitucion = await prisma.agenteInstitucion.create({
        data: {
          agenteId: agente.id,
          institucionId: tenantId,
          documento: body.documento,
        },
      })

      return Response.json({
        agente,
        agenteInstitucion,
      })

    } catch (error) {
      console.error("Error creando agente:", error)

      return new Response(
        JSON.stringify({ error: "Error creando agente" }),
        { status: 500 }
      )
    }

  }, req)
}