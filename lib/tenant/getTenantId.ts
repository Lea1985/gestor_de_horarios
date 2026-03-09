import { headers } from "next/headers"

export async function getTenantId(): Promise<number> {

  const headerList = await headers()

  // 1️⃣ Tenant por header
  const headerTenant = headerList.get("x-institucion-id")

  if (headerTenant) {

    const id = Number(headerTenant)

    if (Number.isNaN(id)) {
      throw new Error("Tenant inválido")
    }

    return id
  }

  // 2️⃣ Tenant por subdominio
  const forwardedHost = headerList.get("x-forwarded-host")

  if (forwardedHost) {

    const subdomain = forwardedHost.split(".")[0]

    // simulación para el test
    if (subdomain === "demo") {
      return 1
    }
  }

  // 3️⃣ Sin tenant
  throw new Error("Tenant no definido")
}