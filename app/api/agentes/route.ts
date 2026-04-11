// app/api/agentes/route.ts

import prisma from "@/lib/prisma"
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  return withContext(req, async ({ tenantId }) => {
    const agentes = await prisma.agenteInstitucion.findMany({
      where: {
        institucionId: tenantId,
        agente: {
          activo: true,
          deletedAt: null,
        },
      },
      include: {
        agente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            documento: true,
            email: true,
            telefono: true,
            domicilio: true,
            estado: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        agente: { apellido: "asc" },
      },
    })

    return Response.json(agentes)
  })
}

export async function POST(req: Request) {
  return withContext(req, async ({ tenantId }) => {

    console.log("🔥 TENANT RAW:", tenantId, typeof tenantId)

    const safeTenantId =
      typeof tenantId === "string" ? parseInt(tenantId, 10) : tenantId

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { nombre, apellido, documento, email, telefono, domicilio } = body

    if (!nombre || !apellido || !documento) {
      return Response.json(
        { error: "nombre, apellido y documento son requeridos" },
        { status: 400 }
      )
    }

    // 🔥 FIX CLAVE: normalización de tipos
    const safeDocumento = String(documento).trim()

    const safeEmail = email ?? null
    const safeTelefono = telefono ?? null
    const safeDomicilio = domicilio ?? null

    try {
      const result = await prisma.$transaction(async (tx) => {

        const agente = await tx.agente.create({
          data: {
            nombre,
            apellido,
            documento: safeDocumento, // 🔥 FIX CRÍTICO
            email: safeEmail,
            telefono: safeTelefono,
            domicilio: safeDomicilio,
          },
          select: {
            id: true,
            nombre: true,
            apellido: true,
            documento: true,
            email: true,
            telefono: true,
            domicilio: true,
            estado: true,
            createdAt: true,
          },
        })

        const agenteInstitucion = await tx.agenteInstitucion.create({
          data: {
            agenteId: agente.id,
            institucionId: safeTenantId,
            documento: safeDocumento, // 🔥 CONSISTENCIA TOTAL
          },
        })

        return { agente, agenteInstitucion }
      })

      return Response.json(result, { status: 201 })

    } catch (error) {

      console.error("🔥 ERROR REAL CREANDO AGENTE:", error)

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return Response.json(
          { error: "El documento ya está registrado en esta institución" },
          { status: 409 }
        )
      }

      return Response.json(
        {
          error: "Error creando agente",
          details: error instanceof Error ? error.message : error,
        },
        { status: 500 }
      )
    }
  })
}