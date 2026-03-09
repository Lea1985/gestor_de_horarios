import prisma from "@/lib/prisma"
import { headers } from "next/headers"

export async function POST() {

  try {

    const headerList = await headers()

    const authHeader = headerList.get("authorization")

    if (!authHeader) {
      return Response.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")

    await prisma.sesion.deleteMany({
      where: { token }
    })

    return Response.json({
      message: "Sesión cerrada"
    })

  } catch (error) {

    console.error(error)

    return Response.json(
      { error: "Error en logout" },
      { status: 500 }
    )

  }

}