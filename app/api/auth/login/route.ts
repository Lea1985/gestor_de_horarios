// app/api/auth/login/route.ts
// Flujo:
//   1. Resolver tenant desde header o subdominio (resolveTenant)
//   2. Verificar que la institución esté activa
//   3. Buscar usuario por email y verificar estado
//   4. Verificar password
//   5. Verificar que el usuario pertenece al tenant (UsuarioRol)
//   6. Crear sesión con institucionId

import prisma from "@/lib/prisma"
import { resolveTenant, TenantResolveError } from "@/lib/tenant/resolveTenant"
import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { Estado } from "@prisma/client"

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 días

export async function POST(req: Request) {
  try {

    // ── 1. Resolver tenant ───────────────────────────────────────────────────
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
        return Response.json(
          { error: error.message },
          { status: error.status }
        )
      }
      throw error
    }

    // ── 2. Validar body ──────────────────────────────────────────────────────
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

    // ── 3. Buscar usuario ────────────────────────────────────────────────────
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    })

    // Mismo mensaje para inexistente, inactivo o password incorrecta
    // — evita user enumeration
    if (!usuario || !usuario.activo || usuario.estado !== Estado.ACTIVO) {
      return Response.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    // ── 4. Verificar password ────────────────────────────────────────────────
    const passwordValida = await bcrypt.compare(password, usuario.passwordHash)

    if (!passwordValida) {
      return Response.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    // ── 5. Verificar pertenencia al tenant ───────────────────────────────────
    // El usuario debe tener al menos un rol en esta institución
    const pertenece = await prisma.usuarioRol.findFirst({
      where: {
        usuarioId:     usuario.id,
        institucionId: tenantId,
      },
      select: { rolId: true },
    })

    if (!pertenece) {
      // Mismo mensaje genérico — no revelar que el usuario existe pero
      // no pertenece a esta institución
      return Response.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    // ── 6. Crear sesión con institucionId ────────────────────────────────────
    const token = randomUUID()

    const sesion = await prisma.sesion.create({
      data: {
        token,
        usuarioId:     usuario.id,
        institucionId: tenantId,
        expiresAt:     new Date(Date.now() + SESSION_DURATION_MS),
        ip:        req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
        userAgent: req.headers.get("user-agent") ?? null,
      },
      select: { token: true },
    })

    return Response.json(
      { token: sesion.token },
      { status: 201 }
    )

  } catch (error) {
    console.error("Error en login:", error)
    return Response.json({ error: "Error en login" }, { status: 500 })
  }
}