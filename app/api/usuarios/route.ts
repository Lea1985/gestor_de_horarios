import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"
import bcrypt from "bcryptjs"

export async function GET(req: Request) {
  return withTenant(async (tenantId) => {

    const usuarios = await prisma.usuarioRol.findMany({
      where: {
        institucionId: tenantId
      },
      include: {
        usuario: true,
        rol: true
      }
    })

    return Response.json(usuarios)

  }, req)
}

export async function POST(req: Request) {
  return withTenant(async (tenantId) => {
    try {
      const body = await req.json()

      const passwordHash = await bcrypt.hash(body.password, 10)

      const usuario = await prisma.usuario.create({
        data: {
          nombre: body.nombre,
          email: body.email,
          passwordHash
        }
      })

      const usuarioRol = await prisma.usuarioRol.create({
        data: {
          usuarioId: usuario.id,
          rolId: Number(body.rolId),
          institucionId: tenantId
        }
      })

      return Response.json({
        usuario,
        usuarioRol
      })
    } catch (error) {
      console.error(error)

      return Response.json(
        { error: "Error creando usuario" },
        { status: 500 }
      )
    }
  }, req)
}

export async function PATCH(req: Request) {
  return withTenant(async (tenantId) => {

    const body = await req.json()

    const usuarioRol = await prisma.usuarioRol.update({
      where: {
        usuarioId_rolId_institucionId: {
          usuarioId: Number(body.usuarioId),
          rolId: Number(body.rolId),
          institucionId: tenantId
        }
      },
      data: {
        rolId: Number(body.nuevoRolId)
      }
    })

    return Response.json(usuarioRol)

  }, req)
}


export async function DELETE(req: Request) {
  return withTenant(async (tenantId) => {

    const { searchParams } = new URL(req.url)

    const usuarioId = Number(searchParams.get("usuarioId"))
    const rolId = Number(searchParams.get("rolId"))

    await prisma.usuarioRol.delete({
      where: {
        usuarioId_rolId_institucionId: {
          usuarioId,
          rolId,
          institucionId: tenantId
        }
      }
    })

    return Response.json({ ok: true })

  }, req)
}