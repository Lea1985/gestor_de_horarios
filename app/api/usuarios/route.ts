// app/api/usuarios/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const usuarios = await prisma.usuarioRol.findMany({
      where: { institucionId: tenantId },
      include: {
        usuario: {
          select: {
            id:        true,
            email:     true,
            nombre:    true,
            estado:    true,
            activo:    true,
            createdAt: true,
            updatedAt: true,
            // passwordHash excluido explícitamente
          },
        },
        rol: true,
      },
    })

    return Response.json(usuarios)
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { nombre, email, password, rolId } = body

    if (!email || !password || !rolId) {
      return Response.json(
        { error: "email, password y rolId son requeridos" },
        { status: 400 }
      )
    }

    const rol = await prisma.rol.findUnique({
      where:  { id: Number(rolId) },
      select: { id: true },
    })

    if (!rol) {
      return Response.json({ error: "Rol no encontrado" }, { status: 404 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    try {
      const result = await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: { nombre, email, passwordHash },
          select: {
            id:        true,
            email:     true,
            nombre:    true,
            estado:    true,
            activo:    true,
            createdAt: true,
          },
        })

        const usuarioRol = await tx.usuarioRol.create({
          data: {
            usuarioId:     usuario.id,
            rolId:         Number(rolId),
            institucionId: tenantId,
          },
        })

        return { usuario, usuarioRol }
      })

      return Response.json(result, { status: 201 })

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json({ error: "El email ya está registrado" }, { status: 409 })
      }

      console.error("Error creando usuario:", error)
      return Response.json({ error: "Error creando usuario" }, { status: 500 })
    }
  })
}

export async function PATCH(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { usuarioId, rolId, nuevoRolId } = body

    if (!usuarioId || !rolId || !nuevoRolId) {
      return Response.json(
        { error: "usuarioId, rolId y nuevoRolId son requeridos" },
        { status: 400 }
      )
    }

    const nuevoRol = await prisma.rol.findUnique({
      where:  { id: Number(nuevoRolId) },
      select: { id: true },
    })

    if (!nuevoRol) {
      return Response.json({ error: "El nuevo rol no existe" }, { status: 404 })
    }

    try {
      // Delete + create en transacción: el PK compuesto incluye rolId,
      // por eso no se puede hacer un simple update del rolId.
      const result = await prisma.$transaction(async (tx) => {
        await tx.usuarioRol.delete({
          where: {
            usuarioId_rolId_institucionId: {
              usuarioId:     Number(usuarioId),
              rolId:         Number(rolId),
              institucionId: tenantId,
            },
          },
        })

        return tx.usuarioRol.create({
          data: {
            usuarioId:     Number(usuarioId),
            rolId:         Number(nuevoRolId),
            institucionId: tenantId,
          },
          include: { rol: true },
        })
      })

      return Response.json(result)

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return Response.json({ error: "Relación usuario-rol no encontrada" }, { status: 404 })
      }

      console.error("Error actualizando rol:", error)
      return Response.json({ error: "Error actualizando rol" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    const { searchParams } = new URL(req.url)
    const usuarioId = Number(searchParams.get("usuarioId"))
    const rolId     = Number(searchParams.get("rolId"))

    if (!usuarioId || !rolId) {
      return Response.json(
        { error: "usuarioId y rolId son requeridos" },
        { status: 400 }
      )
    }

    try {
      await prisma.usuarioRol.delete({
        where: {
          usuarioId_rolId_institucionId: {
            usuarioId,
            rolId,
            institucionId: tenantId,
          },
        },
      })

      return Response.json({ ok: true })

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return Response.json({ error: "Relación usuario-rol no encontrada" }, { status: 404 })
      }

      console.error("Error eliminando usuario-rol:", error)
      return Response.json({ error: "Error eliminando usuario-rol" }, { status: 500 })
    }
  })
}