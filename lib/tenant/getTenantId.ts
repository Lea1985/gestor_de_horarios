import { headers } from "next/headers"

export async function getTenantId(): Promise<number> {

  const headerList = await headers()

  const tenantId = headerList.get("tenant-id")

  if (!tenantId) {
    throw new Error("Tenant no definido")
  }

  const id = Number(tenantId)

  if (Number.isNaN(id)) {
    throw new Error("Tenant inválido")
  }

  return id
}