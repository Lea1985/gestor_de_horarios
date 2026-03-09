import prisma from "@/lib/prisma"
import { headers } from "next/headers"

export async function withAuth(
  handler: (usuarioId: number, req: Request) => Promise<Response>,
  req: Request
) {
  try {

    const headerList = headers()
    const token = headerList.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return Response.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const sesion = await prisma.sesion.findUnique({
      where: { token }
    })

    if (!sesion || sesion.expiresAt < new Date()) {
      return Response.json(
        { error: "Sesión inválida" },
        { status: 401 }
      )
    }

    return handler(sesion.usuarioId, req)

  } catch (error) {

    console.error("Error en auth:", error)

    return Response.json(
      { error: "Error autenticando usuario" },
      { status: 500 }
    )

  }
}