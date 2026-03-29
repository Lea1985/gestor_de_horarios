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

const {
  asignacionId,
  fecha_desde,
  fecha_hasta,
  codigarioItemId,
  incidenciaPadreId,
  observacion
} = body

// 🔴 Validación básica
if (!asignacionId || !fecha_desde || !fecha_hasta || !codigarioItemId) {
  return new Response(
    JSON.stringify({ error: "Faltan datos obligatorios" }),
    { status: 400 }
  )
}

const fechaDesde = new Date(fecha_desde)
const fechaHasta = new Date(fecha_hasta)

if (fechaDesde > fechaHasta) {
  return new Response(
    JSON.stringify({ error: "fecha_desde no puede ser mayor a fecha_hasta" }),
    { status: 400 }
  )
}

// 🔒 Validar asignación (multi-tenant + activa)
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
    JSON.stringify({ error: "Asignación no encontrada o inactiva" }),
    { status: 404 }
  )
}

// 🔒 Validar codigarioItem
const item = await prisma.codigarioItem.findUnique({
  where: { id: codigarioItemId }
})

if (!item) {
  return new Response(
    JSON.stringify({ error: "codigarioItemId inválido" }),
    { status: 400 }
  )
}

// 🔗 Validar incidencia padre (si viene)
if (incidenciaPadreId) {
  const padre = await prisma.incidencia.findFirst({
    where: {
      id: incidenciaPadreId,
      asignacionId,
      deletedAt: null
    }
  })

  if (!padre) {
    return new Response(
      JSON.stringify({ error: "Incidencia padre inválida" }),
      { status: 400 }
    )
  }
}

// 🔥 VALIDACIÓN DE SUPERPOSICIÓN (por tipo también)
const conflicto = await prisma.incidencia.findFirst({
  where: {
    asignacionId,
    codigarioItemId,
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
    JSON.stringify({ error: "Ya existe una incidencia en ese rango de fechas para ese tipo" }),
    { status: 409 }
  )
}

// 🚀 Crear incidencia
const nueva = await prisma.incidencia.create({
  data: {
    asignacionId,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    codigarioItemId,
    incidenciaPadreId: incidenciaPadreId || null,
    observacion
  },
  include: {
    codigarioItem: true
  }
})

return Response.json(nueva)


}, req)
}

// ===== GET =====
export async function GET(req: Request) {
return withTenant(async (tenantId) => {


const { searchParams } = new URL(req.url)

const asignacionId = searchParams.get("asignacionId")

const where: any = {
  activo: true,
  deletedAt: null,
  asignacion: {
    institucionId: tenantId
  }
}

// filtro opcional
if (asignacionId) {
  where.asignacionId = Number(asignacionId)
}

const items = await prisma.incidencia.findMany({
  where,
  include: {
    padre: true,
    hijos: true,
    codigarioItem: true
  },
  orderBy: {
    fecha_desde: "desc"
  }
})

return Response.json(items)


}, req)
}
