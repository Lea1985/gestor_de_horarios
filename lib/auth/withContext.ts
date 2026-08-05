// lib/auth/withContext.ts
// Wrapper único que reemplaza withAuth + withTenant.
// Lee los headers inyectados por el proxy — sin queries a DB.
// El proxy ya validó el token y el tenant antes de que el request llegue aquí.
//
// Además, dispara resolverClasesVencidas una vez por día por institución
// -- es el único "reloj" que tiene el sistema: sin infraestructura de cron,
// la primera request de cada día para cada institución es lo que hace que
// las clases PROGRAMADA vencidas pasen a DICTADA. El updateMany atómico
// evita que dos requests simultáneas al arrancar el día disparen la
// resolución dos veces (gana la primera, las demás ven count=0 y siguen).
//
// Uso en un handler:
//
//   export async function GET(req: Request) {
//     return withContext(req, async ({ usuarioId, tenantId }) => {
//       // lógica
//     })
//   }
import prisma from "@/lib/prisma"
import { RequestContext } from "@/lib/types/context"
import { resolverClasesVencidas } from "@/lib/usecases/clases/resolverClasesVencidas"

async function resolverClasesVencidasSiCorresponde(tenantId: number) {
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const { count } = await prisma.institucion.updateMany({
    where: {
      id: tenantId,
      OR: [
        { ultimaResolucionClases: null },
        { ultimaResolucionClases: { lt: hoy } },
      ],
    },
    data: { ultimaResolucionClases: hoy },
  })
  if (count === 0) return // otra request ya se encargó hoy para esta institución
  try {
    await resolverClasesVencidas(tenantId)
  } catch (error) {
    console.error(`Error en resolverClasesVencidas (institucion ${tenantId}):`, error)
    // no relanzamos -- que un fallo acá no tumbe el request real
  }
}

export async function withContext(
  req: Request,
  handler: (ctx: RequestContext) => Promise<Response>
): Promise<Response> {
  try {
    const usuarioIdRaw = req.headers.get("x-user-id")
    const tenantIdRaw  = req.headers.get("x-tenant-id")
    if (!usuarioIdRaw || !tenantIdRaw) {
      return Response.json(
        { error: "Contexto de request incompleto" },
        { status: 401 }
      )
    }
    const usuarioId = Number(usuarioIdRaw)
    const tenantId  = Number(tenantIdRaw)
    if (Number.isNaN(usuarioId) || Number.isNaN(tenantId)) {
      return Response.json(
        { error: "Contexto de request inválido" },
        { status: 401 }
      )
    }
    await resolverClasesVencidasSiCorresponde(tenantId)
    return await handler({ usuarioId, tenantId })
  } catch (error) {
    console.error("Error en withContext:", error)
    return Response.json(
      { error: "Error interno" },
      { status: 500 }
    )
  }
}