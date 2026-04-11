// lib/auth/getSession.ts
// Helper liviano que devuelve el contexto autenticado leyendo los headers
// inyectados por el proxy. Sin queries a DB.
//
// Útil fuera de handlers (Server Components, layouts, etc.)
// donde withContext no aplica pero el contexto ya fue validado por el proxy.
//
// Devuelve null si los headers no están presentes (request no pasó por el proxy).

import { headers } from "next/headers"
import { RequestContext } from "@/lib/types/context"

export async function getSession(): Promise<RequestContext | null> {
  const headerList = await headers()

  const usuarioIdRaw = headerList.get("x-user-id")
  const tenantIdRaw  = headerList.get("x-tenant-id")

  if (!usuarioIdRaw || !tenantIdRaw) {
    return null
  }

  const usuarioId = Number(usuarioIdRaw)
  const tenantId  = Number(tenantIdRaw)

  if (Number.isNaN(usuarioId) || Number.isNaN(tenantId)) {
    return null
  }

  return { usuarioId, tenantId }
}