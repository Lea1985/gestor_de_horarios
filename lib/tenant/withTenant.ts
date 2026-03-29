import { getTenantId } from "./getTenantId"

export async function withTenant(
  handler: (tenantId: number, req: Request) => Promise<Response>,
  req: Request
) {
  try {

    const tenantId = await getTenantId()

    return await handler(tenantId, req)

  } catch (error) {

    console.error("Error resolviendo tenant:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Error resolviendo tenant"

    return Response.json(
      { error: message },
      { status: 400 }
    )
  }
}