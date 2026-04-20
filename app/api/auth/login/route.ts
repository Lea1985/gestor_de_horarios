// app/api/auth/login/route.ts

import { resolveTenant, TenantResolveError } from "@/lib/tenant/resolveTenant"
import { iniciarSesion, CredencialesInvalidasError } from "@/lib/usecases/auth/iniciarSesion"
import { Estado } from "@prisma/client"

export async function POST(req: Request) {
  try {
    // ── 1. Resolver tenant ─────────────────────────────────────────────────
    let tenantId: number

    try {
      const tenant = await resolveTenant(req)

      if (!tenant.activo || tenant.estado !== Estado.ACTIVO) {
        return Response.json(
          { error: "Institución inactiva o suspendida" },
          { status: 403 }
        )
      }

      tenantId = tenant.id

    } catch (error) {
      if (error instanceof TenantResolveError) {
        return Response.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    // ── 2. Validar body ────────────────────────────────────────────────────
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 })
    }

    const { email, password } = body

    if (!email || !password) {
      return Response.json(
        { error: "email y password son requeridos" },
        { status: 400 }
      )
    }

    // ── 3. Iniciar sesión ──────────────────────────────────────────────────
    const sesion = await iniciarSesion(tenantId, email, password, {
      ip:        req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    })

    return Response.json({ token: sesion.token }, { status: 201 })

  } catch (error) {
    if (error instanceof CredencialesInvalidasError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Error en login:", error)
    return Response.json({ error: "Error en login" }, { status: 500 })
  }
}