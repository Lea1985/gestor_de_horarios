import { headers } from "next/headers"
import prisma from "@/lib/prisma"

export async function getTenantId(): Promise<number> {

  const headerList = await headers()
  const tenant = headerList.get("tenant-id")

  // 🛑 Sanitizar valores inválidos
  if (!tenant || tenant === "undefined" || tenant === "null") {

    // 🧪 fallback en desarrollo / tests
    if (process.env.NODE_ENV !== "production") {
      return 1
    }

    throw new Error("Tenant no definido")
  }

  // ================================
  // 🟢 CASO 1: número (tenant-id = "1")
  // ================================
  const id = Number(tenant)

  if (!Number.isNaN(id)) {
    return id
  }

  // ================================
  // 🟢 CASO 2: dominio (tenant-id = "escuela")
  // ================================
  const institucion = await prisma.institucion.findUnique({
    where: { dominio: tenant.toLowerCase() }
  })

  if (institucion) {
    return institucion.id
  }

  // ❌ Header vino pero no corresponde a nada válido
  throw new Error("Tenant no encontrado")
}