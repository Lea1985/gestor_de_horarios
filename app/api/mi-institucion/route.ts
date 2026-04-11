// app/api/mi-institucion/route.ts
// Endpoint autenticado — opera sobre el tenant activo de la sesión.
// GET:   devuelve los datos de la institución del tenant (incluye configuracion).
// PATCH: actualiza campos permitidos (no permite cambiar dominio ni cuit).

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

export const GET = (req: Request) =>
  withContext(req, async ({ tenantId }) => {

    const institucion = await prisma.institucion.findFirst({
      where: {
        id:        tenantId,
        deletedAt: null,
      },
      select: {
        id:            true,
        nombre:        true,
        dominio:       true,
        domicilio:     true,
        telefono:      true,
        email:         true,
        cuit:          true,
        estado:        true,
        configuracion: true, // expuesto: útil para el admin de la institución
        createdAt:     true,
        // deletedAt, updatedAt omitidos — son internos
      },
    })

    if (!institucion) {
      return Response.json(
        { error: "Institución no encontrada" },
        { status: 404 }
      )
    }

    return Response.json(institucion)
  })

export const PATCH = (req: Request) =>
  withContext(req, async ({ tenantId }) => {

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const data: Prisma.InstitucionUpdateInput = {}

    // Solo campos permitidos — dominio y cuit no se pueden cambiar desde acá
    if (body.nombre        !== undefined) data.nombre        = body.nombre.trim()
    if (body.domicilio     !== undefined) data.domicilio     = body.domicilio
    if (body.telefono      !== undefined) data.telefono      = body.telefono
    if (body.email         !== undefined) data.email         = body.email
    if (body.configuracion !== undefined) data.configuracion = body.configuracion

    if (Object.keys(data).length === 0) {
      return Response.json(
        { error: "No hay datos para actualizar" },
        { status: 400 }
      )
    }

    if (data.email && !String(data.email).includes("@")) {
      return Response.json({ error: "Email inválido" }, { status: 400 })
    }

    try {
      const actualizada = await prisma.institucion.update({
        where: { id: tenantId },
        data,
        select: {
          id:            true,
          nombre:        true,
          dominio:       true,
          domicilio:     true,
          telefono:      true,
          email:         true,
          cuit:          true,
          estado:        true,
          configuracion: true,
          createdAt:     true,
        },
      })

      return Response.json(actualizada)

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return Response.json(
          { error: "Institución no encontrada" },
          { status: 404 }
        )
      }

      console.error(error)
      return Response.json({ error: "Error interno" }, { status: 500 })
    }
  })