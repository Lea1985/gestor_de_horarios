// middleware.ts (proxy)
// Una sola query por request en el flujo normal (sesión por token).
// La resolución de tenant se delega a resolveTenant — lógica híbrida
// header + subdominio compartida con el login.

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { resolveTenant, TenantResolveError } from "@/lib/tenant/resolveTenant"

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rutas públicas — sin autenticación ni tenant
  if (
    pathname.startsWith("/api/instituciones") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next()
  }

  // ── Resolver tenant ────────────────────────────────────────────────────────
  let tenantId: number

  try {
    const tenant = await resolveTenant(request as unknown as Request)

    if (!tenant.activo || tenant.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "Institución inactiva o suspendida" },
        { status: 403 }
      )
    }

    tenantId = tenant.id

  } catch (error) {
    if (error instanceof TenantResolveError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }

  // ── Validar token ──────────────────────────────────────────────────────────
  const token = request.headers.get("authorization")?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // ── Una sola query: sesión + validación de tenant ──────────────────────────
  const sesion = await prisma.sesion.findUnique({
    where:  { token },
    select: {
      usuarioId:     true,
      institucionId: true,
      expiresAt:     true,
    },
  })

  if (!sesion || sesion.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Sesión inválida o expirada" },
      { status: 401 }
    )
  }

  // El tenant de la sesión debe coincidir con el tenant del request
  if (sesion.institucionId !== tenantId) {
    return NextResponse.json(
      { error: "No autorizado para este tenant" },
      { status: 403 }
    )
  }

  // ── Inyectar contexto en headers ───────────────────────────────────────────
  const headers = new Headers(request.headers)
  headers.set("x-user-id",   String(sesion.usuarioId))
  headers.set("x-tenant-id", String(tenantId))

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ["/api/:path*"],
}