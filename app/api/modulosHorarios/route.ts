import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ===== POST =====
export async function POST(req: Request) {
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

    const { dia_semana, hora_desde, hora_hasta } = body

    if (dia_semana == null || hora_desde == null || hora_hasta == null) {
      return new Response(
        JSON.stringify({ error: "Faltan datos obligatorios" }),
        { status: 400 }
      )
    }

    try {
      const nuevoModulo = await prisma.moduloHorario.create({
        data: { institucionId: tenantId, dia_semana, hora_desde, hora_hasta, activo: true }
      })
      return Response.json(nuevoModulo)
    } catch (error: any) {
      if (error.code === "P2002") {
        // 👇 buscar y devolver el módulo existente en el body del 409
        const existente = await prisma.moduloHorario.findFirst({
          where: { institucionId: tenantId, dia_semana, hora_desde, hora_hasta }
        })
        return new Response(
          JSON.stringify({ error: "Ya existe un módulo con esos datos", modulo: existente }),
          { status: 409 }
        )
      }
      throw error
    }
  }, req)
}
// ===== GET =====
export async function GET(req: Request) {
  return withTenant(async (tenantId) => {
    const modulos = await prisma.moduloHorario.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null
      },
      orderBy: [
        { dia_semana: "asc" },
        { hora_desde: "asc" }
      ]
    })

    return Response.json(modulos)
  }, req)
}

// ===== PATCH =====
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

    const { id, dia_semana, hora_desde, hora_hasta, activo } = body
    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID del módulo requerido" }),
        { status: 400 }
      )
    }

    // Verificar que exista y pertenezca a la institución
    const modulo = await prisma.moduloHorario.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null }
    })
    if (!modulo) {
      return new Response(
        JSON.stringify({ error: "Módulo no encontrado" }),
        { status: 404 }
      )
    }

    try {
      const actualizado = await prisma.moduloHorario.update({
        where: { id },
        data: {
          dia_semana: dia_semana ?? modulo.dia_semana,
          hora_desde: hora_desde ?? modulo.hora_desde,
          hora_hasta: hora_hasta ?? modulo.hora_hasta,
          activo: activo ?? modulo.activo
        }
      })
      return Response.json(actualizado)
    } catch (error: any) {
      if (error.code === "P2002") {
        return new Response(
          JSON.stringify({ error: "Ya existe un módulo con esos datos" }),
          { status: 409 }
        )
      }
      throw error
    }
  }, req)
}

// ===== DELETE =====
export async function DELETE(req: Request, context: { params: { id: string } }) {
  return withTenant(async (tenantId) => {
    const idNum = Number(context.params.id)
    if (isNaN(idNum)) {
      return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 })
    }

    const modulo = await prisma.moduloHorario.findFirst({
      where: { id: idNum, institucionId: tenantId, deletedAt: null }
    })
    if (!modulo) {
      return new Response(JSON.stringify({ error: "Módulo no encontrado" }), { status: 404 })
    }

    const eliminado = await prisma.moduloHorario.update({
      where: { id: idNum },
      data: { deletedAt: new Date() }
    })
    return Response.json(eliminado)
  }, req)
}