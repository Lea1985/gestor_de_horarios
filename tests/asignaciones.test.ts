import { describe, it, expect, beforeEach } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { randomUUID } from "crypto"

let headers: Record<string, string>

beforeEach(async () => {
  headers = await authHeaders("1")
})

async function createAgente() {
  const unique = randomUUID()

  const res = await fetch(`${BASE_URL}/agentes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nombre: "Test",
      apellido: "Asig",
      documento: `DOC-${unique}`,
    }),
  })

  const data = await res.json()
  return data.agente
}

async function createUnidad() {
  const unique = Math.floor(Math.random() * 1000000)

  const res = await fetch(`${BASE_URL}/unidades`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      codigoUnidad: unique,
      nombre: `Unidad ${unique}`,
    }),
  })

  const data = await res.json()
  return data
}

async function createAsignacion(agenteId: number, unidadId: number) {
  const unique = randomUUID()

  const res = await fetch(`${BASE_URL}/asignaciones`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agenteId,
      unidadId,
      identificadorEstructural: `ASIG-${unique}`,
      fecha_inicio: new Date().toISOString(),
    }),
  })

  const data = await res.json()
  return data
}

describe("POST /api/asignaciones", () => {
  it("crea una asignación", async () => {
    const agente = await createAgente()
    const unidad = await createUnidad()

    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        agenteId: agente.id,
        unidadId: unidad.id,
        identificadorEstructural: `ASIG-${randomUUID()}`,
        fecha_inicio: new Date().toISOString(),
      }),
    })

    expect(res.status).toBe(201)
  })

  it("rechaza identificador estructural duplicado", async () => {
    const agente = await createAgente()
    const unidad = await createUnidad()
    const ident = `ASIG-${randomUUID()}`

    await fetch(`${BASE_URL}/asignaciones`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        agenteId: agente.id,
        unidadId: unidad.id,
        identificadorEstructural: ident,
        fecha_inicio: new Date().toISOString(),
      }),
    })

    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        agenteId: agente.id,
        unidadId: unidad.id,
        identificadorEstructural: ident,
        fecha_inicio: new Date().toISOString(),
      }),
    })

    expect(res.status).toBe(409)
  })

  it("rechaza sin campos obligatorios", async () => {
    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
  })

  it("rechaza agente inexistente", async () => {
    const unidad = await createUnidad()

    const res = await fetch(`${BASE_URL}/asignaciones`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        agenteId: 999999,
        unidadId: unidad.id,
        identificadorEstructural: `ASIG-${randomUUID()}`,
        fecha_inicio: new Date().toISOString(),
      }),
    })

    expect(res.status).toBe(404)
  })
})

describe("GET /api/asignaciones/[id]", () => {
  it("devuelve la asignación con relaciones", async () => {
    const agente = await createAgente()
    const unidad = await createUnidad()
    const asignacion = await createAsignacion(agente.id, unidad.id)

    const res = await fetch(`${BASE_URL}/asignaciones/${asignacion.id}`, { headers })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.id).toBe(asignacion.id)
    expect(data.agente).toBeDefined()
    expect(data.unidad).toBeDefined()
  })
})

describe("PATCH /api/asignaciones/[id]", () => {
  it("actualiza fecha_fin", async () => {
    const agente = await createAgente()
    const unidad = await createUnidad()
    const asignacion = await createAsignacion(agente.id, unidad.id)

    const res = await fetch(`${BASE_URL}/asignaciones/${asignacion.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        fecha_fin: "2026-12-31T00:00:00.000Z",
      }),
    })

    expect(res.status).toBe(200)
  })
})

describe("DELETE /api/asignaciones/[id]", () => {
  it("hace soft delete", async () => {
    const agente = await createAgente()
    const unidad = await createUnidad()
    const asignacion = await createAsignacion(agente.id, unidad.id)

    const res = await fetch(`${BASE_URL}/asignaciones/${asignacion.id}`, {
      method: "DELETE",
      headers,
    })

    expect(res.status).toBe(200)
  })
})