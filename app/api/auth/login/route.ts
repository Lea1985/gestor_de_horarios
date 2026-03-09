import prisma from "@/lib/prisma"
import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {

    const body = await req.json()
    const { email, password } = body

    const usuario = await prisma.usuario.findUnique({
      where: { email }
    })

    if (!usuario) {
      return Response.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    const passwordValida = await bcrypt.compare(
      password,
      usuario.passwordHash
    )

    if (!passwordValida) {
      return Response.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    const token = randomUUID()

    const sesion = await prisma.sesion.create({
      data: {
        token,
        usuarioId: usuario.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 días
      }
    })

    return Response.json({
      token: sesion.token,
      usuarioId: usuario.id
    })

  } catch (error) {

    console.error(error)

    return Response.json(
      { error: "Error en login" },
      { status: 500 }
    )

  }
}