import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"
import { Dias } from "@prisma/client"
// Función para chequear solapamiento
async function haySolapamiento(
  tenantId: number,
  dia_semana: Dias,
  hora_desde: number,
  hora_hasta: number,
  excludeId?: number
) {
  const donde = {
    institucionId: tenantId,
    dia_semana,
    deletedAt: null,
    AND: [
      { hora_desde: { lt: hora_hasta } }, // empieza antes de que termine el nuevo
      { hora_hasta: { gt: hora_desde } }  // termina después de que empiece el nuevo
    ]
  }

  if (excludeId) {
    Object.assign(donde, { id: { not: excludeId } })
  }

  const count = await prisma.moduloHorario.count({ where: donde })
  return count > 0
}

// ===== GET =====
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const id = Number((await params).id)

  return withTenant(async (tenantId) => {
    if (isNaN(id)) return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 })

    const modulo = await prisma.moduloHorario.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null }
    })

    if (!modulo) return new Response(JSON.stringify({ error: "Módulo no encontrado" }), { status: 404 })

    return Response.json(modulo)
  }, req)
}

// ===== PATCH =====
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const id = Number((await params).id)

  return withTenant(async (tenantId) => {
    if (isNaN(id)) return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 })

    let body
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 }) }

    const { dia_semana, hora_desde, hora_hasta, activo } = body

    const modulo = await prisma.moduloHorario.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null }
    })
    if (!modulo) return new Response(JSON.stringify({ error: "Módulo no encontrado" }), { status: 404 })

    const nuevoDia = dia_semana ?? modulo.dia_semana
    const nuevoDesde = hora_desde ?? modulo.hora_desde
    const nuevoHasta = hora_hasta ?? modulo.hora_hasta

    // Validación de solapamiento
    if (await haySolapamiento(tenantId, nuevoDia, nuevoDesde, nuevoHasta, id)) {
      return new Response(JSON.stringify({ error: "Horario solapado con otro módulo" }), { status: 409 })
    }

    try {
      const actualizado = await prisma.moduloHorario.update({
        where: { id },
        data: {
          dia_semana: nuevoDia,
          hora_desde: nuevoDesde,
          hora_hasta: nuevoHasta,
          activo: activo ?? modulo.activo
        }
      })
      return Response.json(actualizado)
    } catch (error: any) {
      if (error.code === "P2002") {
        return new Response(JSON.stringify({ error: "Ya existe un módulo con esos datos" }), { status: 409 })
      }
      throw error
    }
  }, req)
}

// ===== DELETE =====
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const id = Number((await params).id)

  return withTenant(async (tenantId) => {
    if (isNaN(id)) return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 })

    const modulo = await prisma.moduloHorario.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null }
    })

    if (!modulo) return Response.json({ ok: true, deleted: false })

    await prisma.moduloHorario.update({ where: { id }, data: { deletedAt: new Date() } })
    return Response.json({ ok: true, deleted: true })
  }, req)
}

// ===== POST =====
export async function POST(req: Request) {
  return withTenant(async (tenantId) => {
    let body
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 }) }

    const { dia_semana, hora_desde, hora_hasta } = body
    if (!dia_semana || hora_desde == null || hora_hasta == null) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 })
    }

    // Validación de solapamiento
    if (await haySolapamiento(tenantId, dia_semana, hora_desde, hora_hasta)) {
      return new Response(JSON.stringify({ error: "Horario solapado con otro módulo" }), { status: 409 })
    }

    try {
      const nuevoModulo = await prisma.moduloHorario.create({
        data: { institucionId: tenantId, dia_semana, hora_desde, hora_hasta, activo: true }
      })
      return Response.json(nuevoModulo)
    } catch (error: any) {
      if (error.code === "P2002") {
        // 👇 Buscar y devolver el módulo existente en el body del 409
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