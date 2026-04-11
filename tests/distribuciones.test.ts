import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import {
  cleanupAgente,
  cleanupUnidad,
  cleanupAsignacion,
  cleanupModulo,
  cleanupDistribucion,
  cleanupAgenteByDocumento,
  cleanupUnidadByCodigo,
} from "./helpers/cleanup"

let headers: Record<string, string>
let agenteId: number
let unidadId: number
let asignacionId: number
let distribucionId: number
let moduloId: number

// 🔥 ID único real
const TEST_ID = `DIST_${Date.now()}_${Math.random().toString(36).slice(2)}`
const codigoUnidad = Math.floor(Math.random() * 1000000)

beforeAll(async () => {
  // ✅ FIX CLAVE
  headers = await authHeaders("1")

  // limpiar antes
  await cleanupAgenteByDocumento(`${TEST_ID}_DOC`)
  await cleanupUnidadByCodigo(codigoUnidad)

  // Agente
  const aRes = await fetch(`${BASE_URL}/agentes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nombre: "Test",
      apellido: "Dist",
      documento: `${TEST_ID}_DOC`,
    }),
  })
  agenteId = (await aRes.json()).agente.id

  // Unidad
  const uRes = await fetch(`${BASE_URL}/unidades`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      codigoUnidad,
      nombre: `Unidad ${TEST_ID}`,
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
      identificadorEstructural: `${TEST_ID}_ASIG`,
      fecha_inicio: new Date().toISOString(),
    }),
  })
  asignacionId = (await asRes.json()).id

  // Módulo
  const mRes = await fetch(`${BASE_URL}/modulosHorarios`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      dia_semana: "DOMINGO",
      hora_desde: 3,
      hora_hasta: 4,
    }),
  })

  const mData = await mRes.json()
  moduloId = mRes.status === 409 ? mData.modulo.id : mData.id
})

afterAll(async () => {
  if (distribucionId) await cleanupDistribucion(distribucionId)
  if (asignacionId) await cleanupAsignacion(asignacionId)
  if (unidadId) await cleanupUnidad(unidadId)
  if (agenteId) await cleanupAgente(agenteId)
  if (moduloId) await cleanupModulo(moduloId)
})

describe("POST /api/distribuciones", () => {
  it("crea una distribución", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        asignacionId,
        version: 1,
        fecha_vigencia_desde: "2026-01-01T00:00:00.000Z",
      }),
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.asignacionId).toBe(asignacionId)
    distribucionId = data.id
  })

  it("rechaza versión duplicada", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        asignacionId,
        version: 1,
        fecha_vigencia_desde: "2026-06-01T00:00:00.000Z",
      }),
    })

    expect(res.status).toBe(409)
  })

  it("rechaza solapamiento", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        asignacionId,
        version: 2,
        fecha_vigencia_desde: "2026-03-01T00:00:00.000Z",
      }),
    })

    expect(res.status).toBe(409)
  })
})

describe("GET /api/distribuciones", () => {
  it("incluye la creada", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones`, { headers })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.some((d: any) => d.id === distribucionId)).toBe(true)
  })
})

describe("POST /api/distribuciones/[id]/modulos", () => {
  it("asigna módulos", async () => {
    const res = await fetch(`${BASE_URL}/distribuciones/${distribucionId}/modulos`, {
      method: "POST",
      headers,
      body: JSON.stringify({ modulos: [moduloId] }),
    })

    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.total).toBe(1)
  })
})

describe("DELETE /api/distribuciones/[id]", () => {
  it("soft delete + idempotencia", async () => {
    const res1 = await fetch(`${BASE_URL}/distribuciones/${distribucionId}`, {
      method: "DELETE",
      headers,
    })

    const res2 = await fetch(`${BASE_URL}/distribuciones/${distribucionId}`, {
      method: "DELETE",
      headers,
    })

    const d1 = await res1.json()
    const d2 = await res2.json()

    expect(d1.deleted).toBe(true)
    expect(d2.deleted).toBe(false)
  })
})