// lib/usecases/auth/iniciarSesion.ts

import { authRepository } from "@/lib/repositories/authRepository"
import { Estado } from "@prisma/client"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 días

export class CredencialesInvalidasError extends Error {
  constructor() { super("Credenciales inválidas") }
}

export async function iniciarSesion(
  tenantId:  number,
  email:     string,
  password:  string,
  meta?: { ip?: string | null; userAgent?: string | null }
) {
  const usuario = await authRepository.buscarUsuarioConRol(email, tenantId)

  if (
    !usuario ||
    !usuario.activo ||
    usuario.estado !== Estado.ACTIVO ||
    usuario.roles.length === 0
  ) {
    throw new CredencialesInvalidasError()
  }

  const passwordValida = await bcrypt.compare(password, usuario.passwordHash)
  if (!passwordValida) throw new CredencialesInvalidasError()

  return authRepository.crearSesion({
    token:         randomUUID(),
    usuarioId:     usuario.id,
    institucionId: tenantId,
    expiresAt:     new Date(Date.now() + SESSION_DURATION_MS),
    ip:            meta?.ip,
    userAgent:     meta?.userAgent,
  })
}