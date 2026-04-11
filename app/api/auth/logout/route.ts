// app/api/auth/logout/route.ts
// Ruta pública — el proxy la bypassea (/api/auth).
// Leemos el token manualmente desde el header Authorization.
// ?all=true invalida todas las sesiones del usuario en todas las instituciones.

import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()

    if (!token) {
      return Response.json({ error: "No autenticado" }, { status: 401 })
    }

    const sesion = await prisma.sesion.findUnique({
      where:  { token },
      select: { usuarioId: true },
    })

    if (!sesion) {
      return Response.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const cerrarTodas = searchParams.get("all") === "true"

    if (cerrarTodas) {
      await prisma.sesion.deleteMany({
        where: { usuarioId: sesion.usuarioId },
      })
    } else {
      await prisma.sesion.delete({
        where: { token },
      })
    }

    return Response.json({ ok: true })

  } catch (error) {
    console.error("Error en logout:", error)
    return Response.json({ error: "Error en logout" }, { status: 500 })
  }
}