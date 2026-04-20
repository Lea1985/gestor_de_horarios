// lib/usecases/auth/cerrarSesion.ts

import { authRepository } from "@/lib/repositories/authRepository"

export class SesionNoEncontradaError extends Error {
  constructor() { super("Sesión no encontrada") }
}

export async function cerrarSesion(token: string, cerrarTodas: boolean) {
  const sesion = await authRepository.buscarSesion(token)
  if (!sesion) throw new SesionNoEncontradaError()

  if (cerrarTodas) {
    await authRepository.eliminarTodasLasSesiones(sesion.usuarioId)
  } else {
    await authRepository.eliminarSesion(token)
  }
}