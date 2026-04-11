// lib/auth/withContext.ts
// Wrapper único que reemplaza withAuth + withTenant.
// Lee los headers inyectados por el proxy — sin queries a DB.
// El proxy ya validó el token y el tenant antes de que el request llegue aquí.
//
// Uso en un handler:
//
//   export async function GET(req: Request) {
//     return withContext(req, async ({ usuarioId, tenantId }) => {
//       // lógica
//     })
//   }

import { RequestContext } from "@/lib/types/context"

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

    return await handler({ usuarioId, tenantId })

  } catch (error) {
    console.error("Error en withContext:", error)
    return Response.json(
      { error: "Error interno" },
      { status: 500 }
    )
  }
}