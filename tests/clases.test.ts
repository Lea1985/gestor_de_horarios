import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import {
  cleanupAgente,
  cleanupUnidad,
  cleanupAsignacion,
  cleanupModulo,
  cleanupDistribucion,
  cleanupClases,
  cleanupAgenteByDocumento,
  cleanupUnidadByCodigo,
} from "./helpers/cleanup"

let headers: Record<string, string>
let agenteId: number
let unidadId: number
let asignacionId: number
let distribucionId: number
let moduloId: number
let claseId: number | null = null
let clasesCreadas = 0

// 🔥 ID realmente único
const unique = `${Date.now()}_${Math.random()}`

beforeAll(async () => {
  headers = await authHeaders("1")

  await cleanupAgenteByDocumento(`${unique}_C`)
  await cleanupUnidadByCodigo(Number(unique.split("_")[0].slice(-6)))

  // Agente
  const aRes = await fetch(`${BASE_URL}/agentes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nombre: "Test",
      apellido: "Clase",
      documento: `${unique}_C`,
    }),
  })
  agenteId = (await aRes.json()).agente.id

  // Unidad
  const codigoUnidad = Number(unique.split("_")[0].slice(-6))
  const uRes = await fetch(`${BASE_URL}/unidades`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      codigoUnidad,
      nombre: `Unidad Clase ${unique}`,
    }),
  })
  unidadId = (await uRes.json()).id

  // Asignación
  const asRes = await fetch(`${BASE_URL}/asignaciones`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agenteId,
      unidadId,
      identificadorEstructural: `CLASE_TEST_${unique}`,
      fecha_inicio: "2026-01-01T00:00:00.000Z",
    }),
  })
  asignacionId = (await asRes.json()).id

  // Distribución
  const dRes = await fetch(`${BASE_URL}/distribuciones`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      asignacionId,
      version: 1,
      fecha_vigencia_desde: "2026-01-01T00:00:00.000Z",
    }),
  })
  distribucionId = (await dRes.json()).id

  // Módulo
  const mRes = await fetch(`${BASE_URL}/modulosHorarios`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      dia_semana: "DOMINGO",
      hora_desde: 5,
      hora_hasta: 6,
    }),
  })

  const mData = await mRes.json()
  moduloId = mRes.status === 409 ? mData.modulo.id : mData.id

  // Vincular módulo
  await fetch(`${BASE_URL}/distribuciones/${distribucionId}/modulos`, {
    method: "POST",
    headers,
    body: JSON.stringify({ modulos: [moduloId] }),
  })
})

afterAll(async () => {
  if (asignacionId) await cleanupClases(asignacionId)
  if (distribucionId) await cleanupDistribucion(distribucionId)
  if (asignacionId) await cleanupAsignacion(asignacionId)
  if (unidadId) await cleanupUnidad(unidadId)
  if (agenteId) await cleanupAgente(agenteId)
  if (moduloId) await cleanupModulo(moduloId)
})

describe("POST /api/clases/generar", () => {
  it("genera clases para el rango indicado", async () => {
    const res = await fetch(`${BASE_URL}/clases/generar`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        distribucionHorariaId: distribucionId,
        fecha_desde: "2026-04-01",
        fecha_hasta: "2026-04-30",
      }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.ok).toBe(true)
    expect(data.creadas).toBeGreaterThan(0)

    clasesCreadas = data.creadas
  })

  it("es idempotente", async () => {
    const res = await fetch(`${BASE_URL}/clases/generar`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        distribucionHorariaId: distribucionId,
        fecha_desde: "2026-04-01",
        fecha_hasta: "2026-04-30",
      }),
    })

    const data = await res.json()
    expect(data.creadas).toBe(0)
    expect(data.omitidas).toBe(clasesCreadas)
  })
})

describe("GET /api/clases", () => {
  it("devuelve clases válidas", async () => {
    const res = await fetch(
      `${BASE_URL}/clases?asignacionId=${asignacionId}&fecha_desde=2026-04-01&fecha_hasta=2026-04-30`,
      { headers }
    )

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    claseId = data[0]?.id ?? null
    expect(claseId).not.toBeNull()
  })
})

describe("GET /api/clases/[id]", () => {
  it("devuelve la clase", async () => {
    expect(claseId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/clases/${claseId}`, { headers })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.id).toBe(claseId)
  })
})

describe("PATCH /api/clases/[id]", () => {
  it("cambia estado", async () => {
    expect(claseId).not.toBeNull()

    const res = await fetch(`${BASE_URL}/clases/${claseId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ estado: "DICTADA" }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.estado).toBe("DICTADA")
  })
})