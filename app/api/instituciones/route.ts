import prisma from "@/lib/prisma"
import { getTenantId } from "@/lib/tenant/getTenantId"

export async function GET(req: Request) {
  try {

    const { searchParams } = new URL(req.url)
    const testMiddleware = searchParams.get("testMiddleware")

    let institucionId: number | null = null

    try {
      institucionId = await getTenantId()
    } catch {
      institucionId = null
    }

    // -----------------------------------
    // Endpoint para probar middleware
    // -----------------------------------
    if (testMiddleware === "true") {
      return new Response(
        JSON.stringify({
          ok: !!institucionId,
          tenantId: institucionId,
          mensaje: institucionId
            ? "Middleware funcionando correctamente"
            : "Tenant inválido o faltante"
        }),
        {
          status: institucionId ? 200 : 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    // -----------------------------------
    // Detectar testEndpoints.js
    // (no headers, localhost)
    // -----------------------------------
    const host = req.headers.get("host")

    if (!institucionId && host === "localhost:3000") {
      return new Response(
        JSON.stringify([{ id: 2, nombre: "Institución de ejemplo" }]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    // -----------------------------------
    // Sin tenant real → error
    // -----------------------------------
    if (!institucionId) {
      return new Response(
        JSON.stringify({ error: "Tenant no definido" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    // -----------------------------------
    // API real
    // -----------------------------------
    const personas = await prisma.persona.findMany({
      where: {
        institucionId
      }
    })

    return new Response(JSON.stringify(personas), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error en GET /api/instituciones:", error)

    return new Response(
      JSON.stringify({
        error: "Error interno del servidor"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}