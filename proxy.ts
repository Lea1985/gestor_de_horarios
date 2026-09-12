// middleware.ts (proxy)
// Una sola query por request en el flujo normal (sesión por token).
// La resolución de tenant se delega a resolveTenant — lógica híbrida
// header + subdominio compartida con el login.
//
// Control de licencia (12/09/2026): si la institución está inactiva o
// suspendida, se bloquea acá -- es el primer punto del pipeline que conoce
// el tenant, antes de cualquier route handler. Es la ÚNICA fuente de verdad
// para este check -- withContext no lo repite.
//
// Dos niveles de excepción:
//   1. RUTAS_EXENTAS_DE_LICENCIA -- las rutas de reportes en sí. Exentas
//      siempre, cualquier método, para que la institución pueda seguir
//      exportando/respaldando su propia información.
//   2. RUTAS_SOPORTE_SOLO_LECTURA -- endpoints compartidos (agentes,
//      comisiones, codigarios, periodos-operativos) que los reportes
//      necesitan para poblar sus filtros, pero que TAMBIÉN se usan para
//      gestión (crear/editar/borrar) desde otras pantallas. Exentos SOLO
//      en GET -- así los reportes pueden leer las listas, pero la
//      institución suspendida no puede seguir gestionando agentes,
//      comisiones, codigarios ni períodos operativos.

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { resolveTenant, TenantResolveError } from "@/lib/tenant/resolveTenant"

const RUTAS_EXENTAS_DE_LICENCIA = [
  "/api/reportes/ausencias",
  "/api/reportes/horarios",
  "/api/reportes/codigarios",
  "/api/reportes/modulos-computables",
  "/api/reportes/jornadas",
  "/api/reportes/profesores",
  "/api/reportes/asignaciones",
  "/api/reportes/profesor/",
]

const RUTAS_SOPORTE_SOLO_LECTURA = [
  "/api/comisiones",
  "/api/agentes",
  "/api/codigarios",
  "/api/periodos-operativos",
]

function esExento(pathname: string, method: string): boolean {
  if (RUTAS_EXENTAS_DE_LICENCIA.some((ruta) => pathname.startsWith(ruta))) {
    return true
  }
  if (method === "GET" && RUTAS_SOPORTE_SOLO_LECTURA.some((ruta) => pathname.startsWith(ruta))) {
    return true
  }
  return false
}

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
      if (!esExento(pathname, request.method)) {
        return NextResponse.json(
          {
            error: "El servicio está suspendido para esta institución. Contactá al proveedor para regularizarlo.",
            code: "LICENCIA_INACTIVA",
          },
          { status: 403 }
        )
      }
      // Ruta exenta: seguimos el flujo normal (token, sesión, headers)
      // pese a la institución inactiva.
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
