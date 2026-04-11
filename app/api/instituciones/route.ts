// app/api/instituciones/route.ts
// Ruta pública — el proxy la bypassea.
// GET: listado reducido, sin autenticación.
// POST: solo superAdmin (verifica esSuperAdmin en sesión manualmente).

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function GET() {
  try {
    const instituciones = await prisma.institucion.findMany({
      where:   { deletedAt: null, activo: true },
      orderBy: { id: "asc" },
      select: {
        id:      true,
        nombre:  true,
        dominio: true,
        email:   true,
        telefono: true,
      },
    })

    return Response.json(instituciones)

  } catch (error) {
    console.error(error)
    return Response.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {

    // ── Verificar sesión y superAdmin ────────────────────────────────────────
    // Esta ruta bypasea el proxy, así que leemos el token manualmente.
    const token = req.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return Response.json({ error: "No autenticado" }, { status: 401 })
    }

    const sesion = await prisma.sesion.findUnique({
      where:  { token },
      select: {
        expiresAt: true,
        usuario: {
          select: { esSuperAdmin: true },
        },
      },
    })

    if (!sesion || sesion.expiresAt < new Date()) {
      return Response.json({ error: "Sesión inválida o expirada" }, { status: 401 })
    }

    if (!sesion.usuario.esSuperAdmin) {
      return Response.json({ error: "No autorizado" }, { status: 403 })
    }

    // ── Validar body ─────────────────────────────────────────────────────────
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    let { nombre, domicilio, telefono, email, cuit, dominio } = body

    nombre  = nombre?.trim()
    dominio = dominio?.trim().toLowerCase()

    if (!nombre) {
      return Response.json({ error: "nombre es obligatorio" }, { status: 400 })
    }

    if (!dominio) {
      return Response.json({ error: "dominio es obligatorio" }, { status: 400 })
    }

    if (email && !email.includes("@")) {
      return Response.json({ error: "Email inválido" }, { status: 400 })
    }

    // ── Crear institución ────────────────────────────────────────────────────
    const nueva = await prisma.institucion.create({
      data: { nombre, domicilio, telefono, email, cuit, dominio },
      select: {
        id:        true,
        nombre:    true,
        dominio:   true,
        email:     true,
        telefono:  true,
        domicilio: true,
        cuit:      true,
        estado:    true,
        createdAt: true,
      },
    })

    return Response.json(nueva, { status: 201 })

  } catch (error) {

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[]) ?? []

      if (target.includes("dominio")) {
        return Response.json({ error: "El dominio ya está registrado" }, { status: 409 })
      }
      if (target.includes("cuit")) {
        return Response.json({ error: "El CUIT ya está registrado" }, { status: 409 })
      }

      return Response.json({ error: "Dato duplicado" }, { status: 409 })
    }

    console.error(error)
    return Response.json({ error: "Error interno" }, { status: 500 })
  }
}