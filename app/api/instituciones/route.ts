// app/api/instituciones/route.ts
import { Prisma } from "@prisma/client"
import { listarInstituciones } from "@/lib/usecases/instituciones/listarInstituciones"
import { crearInstitucion, NoAutenticadoError, SesionInvalidaError, NoAutorizadoError, DatosInstitucionInvalidosError } from "@/lib/usecases/instituciones/crearInstitucion"

export async function GET() {
  try {
    return Response.json(await listarInstituciones())
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "")

    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const nueva = await crearInstitucion(token, body)
    return Response.json(nueva, { status: 201 })

  } catch (error) {
    if (error instanceof NoAutenticadoError || error instanceof SesionInvalidaError) {
      return Response.json({ error: (error as Error).message }, { status: 401 })
    }
    if (error instanceof NoAutorizadoError) {
      return Response.json({ error: (error as Error).message }, { status: 403 })
    }
    if (error instanceof DatosInstitucionInvalidosError) {
      return Response.json({ error: (error as Error).message }, { status: 400 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[]) ?? []
      if (target.includes("dominio")) return Response.json({ error: "El dominio ya está registrado" }, { status: 409 })
      if (target.includes("cuit"))    return Response.json({ error: "El CUIT ya está registrado" }, { status: 409 })
      return Response.json({ error: "Dato duplicado" }, { status: 409 })
    }
    console.error(error)
    return Response.json({ error: "Error interno" }, { status: 500 })
  }
}