// tests/auth.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { BASE_URL } from "./helpers/auth"
import { createTestTenant, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"
import bcrypt from "bcrypt"

let institucionId: number
let usuarioId:     number
let usuarioEmail:  string
let token:         string

const usuarioPassword = "password123"

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  usuarioId     = tenant.usuario.id
  usuarioEmail  = tenant.usuario.email
  token         = tenant.token
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

function loginHeaders() {
  return {
    "Content-Type": "application/json",
    "x-tenant-id":  String(institucionId),
  }
}

describe("POST /api/auth/login", () => {
  it("login exitoso devuelve token", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: loginHeaders(),
      body:    JSON.stringify({ email: usuarioEmail, password: usuarioPassword }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toHaveProperty("token")
    expect(typeof data.token).toBe("string")
  })

  it("rechaza password incorrecta (401)", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: loginHeaders(),
      body:    JSON.stringify({ email: usuarioEmail, password: "wrongpassword" }),
    })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Credenciales inválidas")
  })

  it("rechaza email inexistente (401)", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: loginHeaders(),
      body:    JSON.stringify({ email: `noexiste-${randomUUID()}@test.dev`, password: usuarioPassword }),
    })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Credenciales inválidas")
  })

  it("rechaza usuario que no pertenece al tenant (401)", async () => {
    const passwordHash = await bcrypt.hash(usuarioPassword, 10)
    const otroUsuario  = await prisma.usuario.create({
      data: {
        email:        `otro-${randomUUID()}@test.dev`,
        passwordHash,
        nombre:       "Otro Usuario",
      },
    })

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: loginHeaders(),
      body:    JSON.stringify({ email: otroUsuario.email, password: usuarioPassword }),
    })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Credenciales inválidas")

    await prisma.usuario.delete({ where: { id: otroUsuario.id } })
  })

  it("rechaza sin email (400)", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: loginHeaders(),
      body:    JSON.stringify({ password: usuarioPassword }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin password (400)", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: loginHeaders(),
      body:    JSON.stringify({ email: usuarioEmail }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: usuarioEmail, password: usuarioPassword }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza tenant inexistente (400)", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": "999999" },
      body:    JSON.stringify({ email: usuarioEmail, password: usuarioPassword }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: loginHeaders(),
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("institución inactiva devuelve 403", async () => {
    await prisma.institucion.update({
      where: { id: institucionId },
      data:  { activo: false },
    })

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  "POST",
      headers: loginHeaders(),
      body:    JSON.stringify({ email: usuarioEmail, password: usuarioPassword }),
    })
    expect(res.status).toBe(403)

    await prisma.institucion.update({
      where: { id: institucionId },
      data:  { activo: true },
    })
  })
})

describe("POST /api/auth/logout", () => {
  it("logout exitoso elimina la sesión", async () => {
    const sesion = await prisma.sesion.create({
      data: {
        usuarioId,
        institucionId,
        token:     `token-logout-${randomUUID()}`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    })

    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${sesion.token}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)

    const sesionEliminada = await prisma.sesion.findUnique({
      where: { token: sesion.token },
    })
    expect(sesionEliminada).toBeNull()
  })

  it("logout con ?all=true elimina todas las sesiones del usuario", async () => {
    const s1 = await prisma.sesion.create({
      data: {
        usuarioId,
        institucionId,
        token:     `token-all-1-${randomUUID()}`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    })
    const s2 = await prisma.sesion.create({
      data: {
        usuarioId,
        institucionId,
        token:     `token-all-2-${randomUUID()}`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    })

    const res = await fetch(`${BASE_URL}/auth/logout?all=true`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${s1.token}` },
    })
    expect(res.status).toBe(200)

    const sesiones = await prisma.sesion.findMany({
      where: { token: { in: [s1.token, s2.token] } },
    })
    expect(sesiones).toHaveLength(0)

    // Recrear token principal para que afterAll pueda limpiar
    await prisma.sesion.create({
      data: {
        usuarioId,
        institucionId,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8),
      },
    })
  })

  it("rechaza sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
    })
    expect(res.status).toBe(401)
  })

  it("rechaza token inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method:  "POST",
      headers: { "Authorization": `Bearer token-inexistente-${randomUUID()}` },
    })
    expect(res.status).toBe(404)
  })
})