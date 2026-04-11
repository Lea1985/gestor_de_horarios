// lib/tenant/resolveTenant.ts
// Resuelve el tenant desde header x-tenant-id o subdominio (fallback).
// Usado por el proxy y el login — contextos donde el tenant no fue inyectado aún.
//
// Devuelve { id, estado, activo } — mínimo necesario para validar el tenant
// en ambos contextos sin traer datos innecesarios.
//
// Lanza TenantResolveError si no puede resolver o el tenant no existe.

import prisma from "@/lib/prisma"
import { Estado } from "@prisma/client"

export type TenantResolved = {
  id:     number
  estado: Estado
  activo: boolean
}

export class TenantResolveError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = "TenantResolveError"
    this.status = status
  }
}

export async function resolveTenant(req: Request): Promise<TenantResolved> {
  // ── 1. Intentar desde header ───────────────────────────────────────────────
  const rawTenant =
    req.headers.get("x-tenant-id") ||
    req.headers.get("x-institucion-id") ||
    resolveFromHost(req)

  if (!rawTenant) {
    throw new TenantResolveError("Tenant no definido", 400)
  }

  // ── 2. Caso numérico — id directo, sin query ───────────────────────────────
  const numericId = Number(rawTenant)
  if (!Number.isNaN(numericId)) {
    const institucion = await prisma.institucion.findUnique({
      where:  { id: numericId },
      select: { id: true, estado: true, activo: true },
    })

    if (!institucion) {
      throw new TenantResolveError("Tenant no encontrado", 400)
    }

    return institucion
  }

  // ── 3. Caso dominio/subdominio — buscar por dominio ────────────────────────
  const institucion = await prisma.institucion.findUnique({
    where:  { dominio: rawTenant.toLowerCase() },
    select: { id: true, estado: true, activo: true },
  })

  if (!institucion) {
    throw new TenantResolveError("Tenant no encontrado", 400)
  }

  return institucion
}

// ── Helper: extrae subdominio del header Host ──────────────────────────────
function resolveFromHost(req: Request): string | null {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""

  const hostname  = host.split(":")[0]
  const subdomain = hostname.split(".")[0]

  // Ignorar localhost y IPs — no tienen subdominio de tenant
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  ) {
    return null
  }

  // Subdominio único (ej: "escuela12") → usarlo como dominio a buscar
  // Subdominio compuesto (ej: "escuela12.gestor.com") → tomar solo el primero
  return subdomain || null
}