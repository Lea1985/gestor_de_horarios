import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

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

const {
  asignacionId,
  fecha_desde,
  fecha_hasta,
  codigarioItemId,
  incidenciaPadreId,
  observacion
} = body

// ================================
// 🔴 VALIDACIÓN BÁSICA
// ================================

if (!asignacionId || !fecha_desde || !fecha_hasta || !codigarioItemId) {
  return new Response(
    JSON.stringify({ error: "Faltan datos obligatorios" }),
    { status: 400 }
  )
}

// 🔒 VALIDAR ASIGNACIÓN (multi-tenant)
const asignacion = await prisma.asignacion.findFirst({
  where: {
    id: asignacionId,
    institucionId: tenantId,
    activo: true,
    deletedAt: null
  }
})

if (!asignacion) {
  return new Response(
    JSON.stringify({ error: "Asignación no válida" }),
    { status: 404 }
  )
}

const fechaDesde = new Date(fecha_desde)
const fechaHasta = new Date(fecha_hasta)

if (fechaDesde > fechaHasta) {
  return new Response(
    JSON.stringify({ error: "Rango de fechas inválido" }),
    { status: 400 }
  )
}

// ================================
// 🔥 VALIDAR SUPERPOSICIÓN
// ================================

const conflicto = await prisma.incidencia.findFirst({
  where: {
    asignacionId,
    activo: true,
    deletedAt: null,
    AND: [
      { fecha_desde: { lte: fechaHasta } },
      { fecha_hasta: { gte: fechaDesde } }
    ]
  }
})

if (conflicto) {
  return new Response(
    JSON.stringify({ error: "Superposición de fechas" }),
    { status: 409 }
  )
}

// ================================
// 🔗 VALIDAR PADRE
// ================================

if (incidenciaPadreId) {
  const padre = await prisma.incidencia.findFirst({
    where: {
      id: incidenciaPadreId,
      deletedAt: null
    }
  })

  if (!padre) {
    return new Response(
      JSON.stringify({ error: "Incidencia padre no encontrada" }),
      { status: 404 }
    )
  }
}

// ================================
// 🧱 CREAR INCIDENCIA
// ================================

const nueva = await prisma.incidencia.create({
  data: {
    asignacionId,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    codigarioItemId,
    incidenciaPadreId,
    observacion
  },
  include: {
    codigarioItem: true
  }
})

return Response.json(nueva)


}, req)
}
