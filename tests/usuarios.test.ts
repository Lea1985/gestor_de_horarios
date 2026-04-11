import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { cleanupUsuario } from "./helpers/cleanup"

let headers: Record<string, string>
let usuarioId: number
let rolId: number

const TENANT_ID = "1"
const ts = Date.now()
const email = `usuario${ts}@test.com`

// Roles del seed
const ROL_DOCENTE = 3
const ROL_DIRECTIVO = 2

beforeAll(async () => {
  headers = await authHeaders(TENANT_ID)

  // usamos rol existente del seed
  rolId = ROL_DOCENTE
})

afterAll(async () => {
  if (usuarioId) await cleanupUsuario(usuarioId, Number(TENANT_ID))
})

describe("POST /api/usuarios", () => {
  it("crea un usuario y lo asigna al tenant", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        nombre: "Usuario Test",
        email,
        password: "password123",
        rolId,
      }),
    })

    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data.usuario.email).toBe(email)

    usuarioId = data.usuario.id
  })

  it("rechaza email duplicado", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        password: "password123",
        rolId,
      }),
    })

    expect(res.status).toBe(409)
  })

  it("rechaza datos incompletos", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: `otro${ts}@test.com`,
      }),
    })

    expect(res.status).toBe(400)
  })

  it("rechaza rol inexistente", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: `fake${ts}@test.com`,
        password: "password123",
        rolId: 999999,
      }),
    })

    expect(res.status).toBe(404)
  })
})

describe("GET /api/usuarios", () => {
  it("devuelve usuarios del tenant", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, { headers })

    expect(res.status).toBe(200)

    const data = await res.json()

    expect(Array.isArray(data)).toBe(true)

    expect(data.some((u: any) => u.usuario.id === usuarioId)).toBe(true)

    data.forEach((u: any) => {
      expect(u.usuario.passwordHash).toBeUndefined()
    })
  })
})

describe("PATCH /api/usuarios", () => {
  it("cambia el rol del usuario", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        usuarioId,
        rolId: ROL_DOCENTE,
        nuevoRolId: ROL_DIRECTIVO,
      }),
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.rolId).toBe(ROL_DIRECTIVO)
  })

  it("rechaza datos incompletos", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ usuarioId }),
    })

    expect(res.status).toBe(400)
  })

  it("rechaza rol inexistente", async () => {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        usuarioId,
        rolId: ROL_DIRECTIVO,
        nuevoRolId: 999999,
      }),
    })

    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/usuarios", () => {
  it("elimina la relación usuario-rol", async () => {
    const res = await fetch(
      `${BASE_URL}/usuarios?usuarioId=${usuarioId}&rolId=${ROL_DIRECTIVO}`,
      {
        method: "DELETE",
        headers,
      }
    )

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it("devuelve 404 si no existe", async () => {
    const res = await fetch(
      `${BASE_URL}/usuarios?usuarioId=${usuarioId}&rolId=${ROL_DIRECTIVO}`,
      {
        method: "DELETE",
        headers,
      }
    )

    expect(res.status).toBe(404)
  })
})