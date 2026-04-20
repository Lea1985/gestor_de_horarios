// app/api/auth/logout/route.ts

import { cerrarSesion, SesionNoEncontradaError } from "@/lib/usecases/auth/cerrarSesion"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()

    if (!token) {
      return Response.json({ error: "No autenticado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const cerrarTodas      = searchParams.get("all") === "true"

    await cerrarSesion(token, cerrarTodas)

    return Response.json({ ok: true })

  } catch (error) {
    if (error instanceof SesionNoEncontradaError) {
      return Response.json({ error: error.message }, { status: 404 })
    }
    console.error("Error en logout:", error)
    return Response.json({ error: "Error en logout" }, { status: 500 })
  }
}