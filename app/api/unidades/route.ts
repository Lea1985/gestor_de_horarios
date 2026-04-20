//app/api/unidades/route.ts
import { withContext } from "@/lib/auth/withContext"
import { Prisma } from "@prisma/client"
import { listarUnidades } from "@/lib/usecases/unidades/listarUnidades"
import { crearUnidad, DatosUnidadInvalidosError, TipoUnidadInvalidoError } from "@/lib/usecases/unidades/crearUnidad"

export async function GET(req: Request) {
  return withContext(req, async (ctx) => {
    return Response.json(await listarUnidades(ctx))
  })
}

export async function POST(req: Request) {
  return withContext(req, async (ctx) => {
    let body
    try { body = await req.json() } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }
    try {
      const nueva = await crearUnidad(ctx, body)
      return Response.json(nueva, { status: 201 })
    } catch (error) {
      if (error instanceof DatosUnidadInvalidosError || error instanceof TipoUnidadInvalidoError) {
        return Response.json({ error: (error as Error).message }, { status: 400 })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "Ya existe una unidad con ese código" }, { status: 409 })
      }
      console.error("Error creando unidad:", error)
      return Response.json({ error: "Error creando unidad" }, { status: 500 })
    }
  })
}
