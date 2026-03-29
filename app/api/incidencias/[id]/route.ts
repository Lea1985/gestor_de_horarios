import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

// ================================
// GET BY ID
// ================================

export async function GET(req: Request, context: any) {
return withTenant(async (tenantId) => {


const params = await context.params
const id = Number(params.id)

if (!id) {
  return new Response(
    JSON.stringify({ error: "ID inválido" }),
    { status: 400 }
  )
}

const item = await prisma.incidencia.findFirst({
  where: {
    id,
    deletedAt: null,
    asignacion: {
      institucionId: tenantId
    }
  },
  include: {
    padre: true,
    hijos: true,
    codigarioItem: true
  }
})

if (!item) {
  return new Response(
    JSON.stringify({ error: "Incidencia no encontrada" }),
    { status: 404 }
  )
}

return Response.json(item)


}, req)
}

// ================================
// PATCH
// ================================

export async function PATCH(req: Request, context: any) {
return withTenant(async (tenantId) => {


const params = await context.params
const id = Number(params.id)

if (!id) {
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

const {
  fecha_desde,
  fecha_hasta,
  codigarioItemId,
  observacion
} = body

const incidencia = await prisma.incidencia.findFirst({
  where: {
    id,
    deletedAt: null,
    asignacion: {
      institucionId: tenantId
    }
  }
})

if (!incidencia) {
  return new Response(
    JSON.stringify({ error: "Incidencia no encontrada" }),
    { status: 404 }
  )
}

const nuevaDesde = fecha_desde ? new Date(fecha_desde) : incidencia.fecha_desde
const nuevaHasta = fecha_hasta ? new Date(fecha_hasta) : incidencia.fecha_hasta

if (nuevaDesde > nuevaHasta) {
  return new Response(
    JSON.stringify({ error: "Rango de fechas inválido" }),
    { status: 400 }
  )
}

// 🔥 Validar superposición (por tipo también)
const conflicto = await prisma.incidencia.findFirst({
  where: {
    asignacionId: incidencia.asignacionId,
    codigarioItemId: codigarioItemId ?? incidencia.codigarioItemId,
    id: { not: id },
    activo: true,
    deletedAt: null,
    AND: [
      { fecha_desde: { lte: nuevaHasta } },
      { fecha_hasta: { gte: nuevaDesde } }
    ]
  }
})

if (conflicto) {
  return new Response(
    JSON.stringify({ error: "Conflicto de fechas con otra incidencia" }),
    { status: 409 }
  )
}

const updated = await prisma.incidencia.update({
  where: { id },
  data: {
    fecha_desde: nuevaDesde,
    fecha_hasta: nuevaHasta,
    codigarioItemId: codigarioItemId ?? incidencia.codigarioItemId,
    observacion
  },
  include: {
    codigarioItem: true
  }
})

return Response.json(updated)


}, req)
}

// ================================
// DELETE (soft)
// ================================

export async function DELETE(req: Request, context: any) {
return withTenant(async (tenantId) => {


const params = await context.params
const id = Number(params.id)

if (!id) {
  return new Response(
    JSON.stringify({ error: "ID inválido" }),
    { status: 400 }
  )
}

const incidencia = await prisma.incidencia.findFirst({
  where: {
    id,
    asignacion: {
      institucionId: tenantId
    }
  }
})

if (!incidencia) {
  return new Response(
    JSON.stringify({ error: "Incidencia no encontrada" }),
    { status: 404 }
  )
}

await prisma.incidencia.update({
  where: { id },
  data: {
    activo: false,
    deletedAt: new Date()
  }
})

return Response.json({ ok: true })


}, req)
}
