// lib/tenant/getTenantId.ts
// Resuelve el tenantId desde el header x-tenant-id inyectado por el proxy.
// El proxy ya garantizó que el tenant es válido, así que aquí solo leemos.
// El fallback a DB se mantiene para el caso en que se llame fuera del proxy
// (tests, scripts, etc.) con un dominio en lugar de un id numérico.

import prisma from "@/lib/prisma"

export async function getTenantId(req: Request): Promise<number> {
  // ✅ Nombre de header unificado con el proxy: x-tenant-id
  const tenant = req.headers.get("x-tenant-id")

  if (!tenant) {
    throw new Error("Tenant no definido")
  }

  // Caso numérico (flujo normal: viene del proxy)
  const id = Number(tenant)
  if (!Number.isNaN(id)) {
    return id
  }

  // Caso dominio (fallback para contextos fuera del proxy)
  const institucion = await prisma.institucion.findUnique({
    where: { dominio: tenant.toLowerCase() },
    select: { id: true },
  })

  if (institucion) {
    return institucion.id
  }

  throw new Error("Tenant no encontrado")
}