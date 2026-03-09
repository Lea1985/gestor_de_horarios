import { getTenantId } from "./getTenantId"

export async function withTenant(
  handler: (tenantId: number, req: Request) => Promise<Response>,
  req: Request
) {
  try {

    const tenantId = await getTenantId()

    if (!tenantId) {
      return Response.json(
        { error: "Tenant no definido" },
        { status: 400 }
      )
    }

    return handler(tenantId, req)

  } catch (error) {

    console.error("Error resolviendo tenant:", error)

    return Response.json(
      { error: "Error resolviendo tenant" },
      { status: 500 }
    )

  }
}