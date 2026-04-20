// tests/instituciones.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { BASE_URL } from "./helpers/auth"
import { createTestInstitucion, createTestSuperAdmin, destroyInstitucion, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let superAdminHeaders: Record<string, string>
let superAdminUserId:  number
let superAdminSesionId: number
let instBase: { id: number }

beforeAll(async () => {
  instBase = await createTestInstitucion()

  const { usuario, sesion } = await createTestSuperAdmin(instBase.id)
  superAdminUserId   = usuario.id
  superAdminSesionId = sesion.id

  superAdminHeaders = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${sesion.token}`,
  }
})

afterAll(async () => {
  await prisma.sesion.deleteMany({ where: { id: superAdminSesionId } })
  await prisma.usuario.deleteMany({ where: { id: superAdminUserId } })
  await destroyInstitucion(instBase.id)
  await prisma.$disconnect()
})

function buildInstitucion() {
  const uid = randomUUID()
  return {
    nombre:  `Institución Test ${uid}`,
    dominio: `inst-${uid}.dev`,
    cuit:    `30-${uid.replace(/-/g, "").slice(0, 8)}-0`,
    email:   `info@inst-${uid}.dev`,
  }
}

async function crearInstitucion(overrides?: Record<string, string>) {
  const body = { ...buildInstitucion(), ...overrides }
  const res  = await fetch(`${BASE_URL}/instituciones`, {
    method:  "POST",
    headers: superAdminHeaders,
    body:    JSON.stringify(body),
  })
  if (res.status !== 201) throw new Error(`Error creando institución: ${res.status}`)
  return res.json()
}

describe("GET /api/instituciones", () => {
  it("devuelve un array", async () => {
    const res = await fetch(`${BASE_URL}/instituciones`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("cada item tiene los campos esperados", async () => {
    const res  = await fetch(`${BASE_URL}/instituciones`)
    const data = await res.json()
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("id")
      expect(data[0]).toHaveProperty("nombre")
      expect(data[0]).toHaveProperty("dominio")
    }
  })
})

describe("POST /api/instituciones", () => {
  it("crea una institución con datos válidos", async () => {
    const body = buildInstitucion()
    const res  = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: superAdminHeaders,
      body:    JSON.stringify(body),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.nombre).toBe(body.nombre)
    expect(data.dominio).toBe(body.dominio.toLowerCase())
    expect(data).toHaveProperty("id")
    expect(data).toHaveProperty("estado")
    expect(data).toHaveProperty("createdAt")
    await destroyInstitucion(data.id)
  })

  it("rechaza sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildInstitucion()),
    })
    expect(res.status).toBe(401)
  })

  it("rechaza token de sesión expirada (401)", async () => {
    const sesion = await prisma.sesion.create({
      data: {
        usuarioId:     superAdminUserId,
        institucionId: instBase.id,
        token:         `token-expirado-${randomUUID()}`,
        expiresAt:     new Date(Date.now() - 1000),
      },
    })
    const res = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sesion.token}` },
      body:    JSON.stringify(buildInstitucion()),
    })
    expect(res.status).toBe(401)
    await prisma.sesion.delete({ where: { id: sesion.id } })
  })

  it("rechaza usuario sin esSuperAdmin (403)", async () => {
    const usuario = await prisma.usuario.create({
      data: {
        email:        `normal-${randomUUID()}@test.dev`,
        passwordHash: "$2b$10$placeholderHashForTests000000000000000000000000000000",
        nombre:       "Normal User",
        esSuperAdmin: false,
      },
    })
    const sesion = await prisma.sesion.create({
      data: {
        usuarioId:     usuario.id,
        institucionId: instBase.id,
        token:         `token-normal-${randomUUID()}`,
        expiresAt:     new Date(Date.now() + 1000 * 60 * 60),
      },
    })
    const res = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sesion.token}` },
      body:    JSON.stringify(buildInstitucion()),
    })
    expect(res.status).toBe(403)
    await prisma.sesion.delete({ where: { id: sesion.id } })
    await prisma.usuario.delete({ where: { id: usuario.id } })
  })

  it("rechaza sin nombre (400)", async () => {
    const { nombre: _, ...sinNombre } = buildInstitucion()
    const res = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: superAdminHeaders,
      body:    JSON.stringify(sinNombre),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin dominio (400)", async () => {
    const { dominio: _, ...sinDominio } = buildInstitucion()
    const res = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: superAdminHeaders,
      body:    JSON.stringify(sinDominio),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza email inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: superAdminHeaders,
      body:    JSON.stringify({ ...buildInstitucion(), email: "no-es-un-email" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza dominio duplicado (409)", async () => {
    const body  = buildInstitucion()
    const first = await crearInstitucion(body)
    const res   = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: superAdminHeaders,
      body:    JSON.stringify({ ...buildInstitucion(), dominio: body.dominio }),
    })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/dominio/i)
    await destroyInstitucion(first.id)
  })

  it("rechaza CUIT duplicado (409)", async () => {
    const body  = buildInstitucion()
    const first = await crearInstitucion(body)
    const res   = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: superAdminHeaders,
      body:    JSON.stringify({ ...buildInstitucion(), cuit: body.cuit }),
    })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/cuit/i)
    await destroyInstitucion(first.id)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/instituciones`, {
      method:  "POST",
      headers: superAdminHeaders,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})