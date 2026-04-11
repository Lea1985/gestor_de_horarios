import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import {
  cleanupAgente,
  cleanupUnidad,
  cleanupAsignacion,
  cleanupCodigario,
  cleanupAgenteByDocumento,
  cleanupUnidadByCodigo,
} from "./helpers/cleanup"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

let headers:      Record<string, string>
let agenteId:     number
let unidadId:     number
let asignacionId: number
let codigarioId:  number
let itemId:       number
let incidenciaId: number

// 🔒 TS único
const ts = `${Date.now()}_${Math.random()}`

beforeAll(async () => {
  // ✅ FIX CLAVE
  headers = await authHeaders("1")

  await cleanupAgenteByDocumento(`${ts}I`)
  await cleanupUnidadByCodigo(Number(ts.split("_")[0]) % 1000000 + 3)

  // Agente
  const aRes = await fetch(`${BASE_URL}/agentes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nombre: "Test",
      apellido: "Incid",
      documento: `${ts}I`
    }),
  })
  agenteId = (await aRes.json()).agente.id

  // Unidad
  const codigoUnidad = Number(ts.split("_")[0]) % 1000000 + 3

  const uRes = await fetch(`${BASE_URL}/unidades`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      codigoUnidad,
      nombre: `Unidad Incid ${ts}`
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
      identificadorEstructural: `INCID_TEST_${ts}`,
      fecha_inicio: "2026-01-01T00:00:00.000Z",
    }),
  })
  asignacionId = (await asRes.json()).id

  // Codigario
  const cRes = await fetch(`${BASE_URL}/codigarios`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nombre: `COD_INCID_${ts}`,
      descripcion: "Test"
    }),
  })
  codigarioId = (await cRes.json()).id

  // Item
  const iRes = await fetch(`${BASE_URL}/codigarios/${codigarioId}/items`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      codigo: `ENF_${ts}`,
      nombre: "Enfermedad test"
    }),
  })
  itemId = (await iRes.json()).id
})

afterAll(async () => {
  // 🔥 cleanup controlado

  if (asignacionId) {
    await prisma.incidencia.deleteMany({ where: { asignacionId } })
  }

  if (codigarioId) {
    await prisma.codigarioItem.deleteMany({ where: { codigarioId } })
  }

  if (asignacionId) await cleanupAsignacion(asignacionId)
  if (unidadId)     await cleanupUnidad(unidadId)
  if (agenteId)     await cleanupAgente(agenteId)
  if (codigarioId)  await cleanupCodigario(codigarioId)

  await prisma.$disconnect()
})

describe("POST /api/incidencias", () => {
  it("crea una incidencia", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        asignacionId,
        codigarioItemId: itemId,
        fecha_desde: "2026-04-01T00:00:00.000Z",
        fecha_hasta: "2026-04-03T00:00:00.000Z",
        observacion: "Test incidencia",
      }),
    })

    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data.asignacionId).toBe(asignacionId)

    incidenciaId = data.id
  })

  it("rechaza superposición", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        asignacionId,
        codigarioItemId: itemId,
        fecha_desde: "2026-04-02T00:00:00.000Z",
        fecha_hasta: "2026-04-05T00:00:00.000Z",
      }),
    })

    expect(res.status).toBe(409)
  })

  it("rechaza fechas inválidas", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        asignacionId,
        codigarioItemId: itemId,
        fecha_desde: "2026-05-10T00:00:00.000Z",
        fecha_hasta: "2026-05-01T00:00:00.000Z",
      }),
    })

    expect(res.status).toBe(400)
  })
})