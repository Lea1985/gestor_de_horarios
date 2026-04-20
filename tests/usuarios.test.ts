// tests/usuarios.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:       Record<string, string>
let institucionId: number
let rolId:         number
let rolId2:        number
let usuarioId:     number

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  // Crear dos roles para los tests de PATCH
  const rol1 = await prisma.rol.upsert({
    where:  { id: 3 },
    update: {},
    create: { nombre: "DOCENTE", descripcion: "Docente" },
  })
  const rol2 = await prisma.rol.upsert({
    where:  { id: 2 },
    update: {},
    create: { nombre: "DIRECTIVO", descripcion: "Directivo" },
  })
  rolId  = rol1.id
  rolId2 = rol2.id
})

afterAll(async () => {
  await destroyInstitucion(institucionId)
})

function buildUsuario(overrides?: Record<string, unknown>) {
  const uid = randomUUID()
  return {
    nombre:   "Usuario Test",
    email:    `user-${uid}@test.dev`,
    password: "password123",
    rolId,
    ...overrides,
  }
}

async function crearUsuario(overrides?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/usuarios`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(buildUsuario(overrides)),
  })
  if (res.status !== 201) throw new Error(`Error creando usuario: ${res.status}`)
  return res.json()
}

// ─── POST /api/usuarios ───────────────────────────────────────────────────────

describe("POST /api/usuarios", () => {
  it("crea un usuario y lo asigna al tenant", async () => {
    const body = buildUsuario()
    const res  = await fetch(`${BASE_URL}/usuarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.usuario.email).toBe(body.email)
    expect(data.usuario).not.toHaveProperty("passwordHash")
    expect(data.usuarioRol.institucionId).toBe(institucionId)
    usuarioId = data.usuario.id
  })

  it("rechaza email duplicado (409)", async () => {
    const body = buildUsuario()
    await crearUsuario(body)
    const res  = await fetch(`${BASE_URL}/usuarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza sin email (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ password: "password123", rolId }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin password (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ email: `x-${randomUUID()}@test.dev`, rolId }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin rolId (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ email: `x-${randomUUID()}@test.dev`, password: "password123" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza rol inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ email: `x-${randomUUID()}@test.dev`, password: "password123", rolId: 999999 }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildUsuario()),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": String(institucionId) },
      body:    JSON.stringify(buildUsuario()),
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/usuarios ────────────────────────────────────────────────────────

describe("GET /api/usuarios", () => {
  it("devuelve usuarios del tenant", async () => {
    const res  = await fetch(`${BASE_URL}/usuarios`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((u: { usuario: { id: number } }) => u.usuario.id === usuarioId)).toBe(true)
    data.forEach((u: { usuario: Record<string, unknown> }) => {
      expect(u.usuario.passwordHash).toBeUndefined()
    })
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

// ─── PATCH /api/usuarios ──────────────────────────────────────────────────────

describe("PATCH /api/usuarios", () => {
  it("cambia el rol del usuario", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({
        usuarioId,
        rolId,
        nuevoRolId: rolId2,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.rolId).toBe(rolId2)
  })

  it("rechaza sin usuarioId (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ rolId, nuevoRolId: rolId2 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin rolId (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ usuarioId, nuevoRolId: rolId2 }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin nuevoRolId (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ usuarioId, rolId }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza nuevoRolId inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ usuarioId, rolId: rolId2, nuevoRolId: 999999 }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza relación inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ usuarioId, rolId: 999999, nuevoRolId: rolId }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/usuarios ─────────────────────────────────────────────────────

describe("DELETE /api/usuarios", () => {
  it("elimina la relación usuario-rol", async () => {
    const res = await fetch(
      `${BASE_URL}/usuarios?usuarioId=${usuarioId}&rolId=${rolId2}`,
      { method: "DELETE", headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it("devuelve 404 si la relación ya no existe", async () => {
    const res = await fetch(
      `${BASE_URL}/usuarios?usuarioId=${usuarioId}&rolId=${rolId2}`,
      { method: "DELETE", headers }
    )
    expect(res.status).toBe(404)
  })

  it("rechaza sin usuarioId (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/usuarios?rolId=${rolId}`,
      { method: "DELETE", headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin rolId (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/usuarios?usuarioId=${usuarioId}`,
      { method: "DELETE", headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/usuarios?usuarioId=${usuarioId}&rolId=${rolId}`
    )
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(
      `${BASE_URL}/usuarios?usuarioId=${usuarioId}&rolId=${rolId}`,
      { headers: { "x-tenant-id": String(institucionId) } }
    )
    expect(res.status).toBe(401)
  })
})