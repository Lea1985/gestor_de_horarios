
// lib/usecases/instituciones/crearInstitucion.ts
import { institucionRepository } from "@/lib/repositories/institucionRepository"

export class NoAutenticadoError extends Error {
  constructor() { super("No autenticado") }
}

export class SesionInvalidaError extends Error {
  constructor() { super("Sesión inválida o expirada") }
}

export class NoAutorizadoError extends Error {
  constructor() { super("No autorizado") }
}

export class DatosInstitucionInvalidosError extends Error {
  constructor(msg: string) { super(msg) }
}

export async function crearInstitucion(token: string | null | undefined, body: {
  nombre?:    string
  dominio?:   string
  domicilio?: string
  telefono?:  string
  email?:     string
  cuit?:      string
}) {
  if (!token) throw new NoAutenticadoError()

  const sesion = await institucionRepository.verificarSesionSuperAdmin(token)
  if (!sesion || sesion.expiresAt < new Date()) throw new SesionInvalidaError()
  if (!sesion.usuario.esSuperAdmin) throw new NoAutorizadoError()

  const nombre  = body.nombre?.trim()
  const dominio = body.dominio?.trim().toLowerCase()

  if (!nombre)  throw new DatosInstitucionInvalidosError("nombre es obligatorio")
  if (!dominio) throw new DatosInstitucionInvalidosError("dominio es obligatorio")
  if (body.email && !body.email.includes("@")) {
    throw new DatosInstitucionInvalidosError("Email inválido")
  }

  return institucionRepository.crear({
    nombre,
    dominio,
    domicilio: body.domicilio,
    telefono:  body.telefono,
    email:     body.email,
    cuit:      body.cuit,
  })
}