// tests/reemplazos.test.ts
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

let headers:          Record<string, string>
let agenteId:         number
let suplenteId:       number
let unidadId:         number
let asignacionId:     number
let asigSuplenteId:   number
let distribucionId:   number
let moduloId:         number
let claseId:          number
let reemplazoId:      number

const TENANT_ID = "1"
const ts = Date.now()

beforeAll(async () => {
  headers = await authHeaders(TENANT_ID)

  // 🔥 limpiar residuos
  await cleanupAgenteByDocumento(`${ts}RT`)
  await cleanupAgenteByDocumento(`${ts}RS`)
  await cleanupUnidadByCodigo((ts % 1000000) + 4)

  // Agente titular
  const aRes = await fetch(`${BASE_URL}/agentes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nombre: "Titular",
      apellido: "Reemplazo",
      documento: `${ts}RT`,
    }),
  })
  agenteId = (await aRes.json()).agente.id

  // Agente suplente
  const sRes = await fetch(`${BASE_URL}/agentes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nombre: "Suplente",
      apellido: "Reemplazo",
      documento: `${ts}RS`,
    }),
  })
  suplenteId = (await sRes.json()).agente.id

  // Unidad
  const uRes = await fetch(`${BASE_URL}/unidades`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      codigoUnidad: (ts % 1000000) + 4,
      nombre: `Unidad Reemp ${ts}`,
    }),
  })
  unidadId = (await uRes.json()).id

  // Asignación titular
  const asRes = await fetch(`${BASE_URL}/asignaciones`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agenteId,
      unidadId,
      identificadorEstructural: `REEMP_TIT_${ts}`,
      fecha_inicio: "2026-01-01T00:00:00.000Z",
    }),
  })
  asignacionId = (await asRes.json()).id

  // Asignación suplente
  const asSupRes = await fetch(`${BASE_URL}/asignaciones`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agenteId: suplenteId,
      unidadId,
      identificadorEstructural: `REEMP_SUP_${ts}`,
      fecha_inicio: "2026-01-01T00:00:00.000Z",
    }),
  })
  asigSuplenteId = (await asSupRes.json()).id

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
      hora_desde: 9,
      hora_hasta: 10,
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

  // Generar clases
  await fetch(`${BASE_URL}/clases/generar`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      distribucionHorariaId: distribucionId,
      fecha_desde: "2026-04-01",
      fecha_hasta: "2026-04-30",
    }),
  })

  // Obtener clase
  const clasesRes = await fetch(
    `${BASE_URL}/clases?asignacionId=${asignacionId}&fecha_desde=2026-04-01&fecha_hasta=2026-04-30`,
    { headers }
  )

  const clases = await clasesRes.json()

  expect(clases.length).toBeGreaterThan(0) // 🔥 clave para evitar undefined
  claseId = clases[0].id
})

afterAll(async () => {
  if (asignacionId)     await cleanupClases(asignacionId)
  if (distribucionId)   await cleanupDistribucion(distribucionId)
  if (asignacionId)     await cleanupAsignacion(asignacionId)
  if (asigSuplenteId)   await cleanupAsignacion(asigSuplenteId)
  if (unidadId)         await cleanupUnidad(unidadId)
  if (agenteId)         await cleanupAgente(agenteId)
  if (suplenteId)       await cleanupAgente(suplenteId)
  if (moduloId)         await cleanupModulo(moduloId)
})

describe("POST /api/reemplazos", () => {
  it("crea un reemplazo y marca la clase como REEMPLAZADA", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        claseId,
        asignacionTitularId: asignacionId,
        asignacionSuplenteId: asigSuplenteId,
        observacion: "Test reemplazo",
      }),
    })

    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data.claseId).toBe(claseId)

    reemplazoId = data.id

    // verificar estado clase
    const claseRes = await fetch(`${BASE_URL}/clases/${claseId}`, { headers })
    const clase = await claseRes.json()

    expect(clase.estado).toBe("REEMPLAZADA")
  })

  it("rechaza duplicado", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        claseId,
        asignacionTitularId: asignacionId,
        asignacionSuplenteId: asigSuplenteId,
      }),
    })

    expect(res.status).toBe(409)
  })

  it("rechaza titular igual a suplente", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        claseId,
        asignacionTitularId: asignacionId,
        asignacionSuplenteId: asignacionId,
      }),
    })

    expect(res.status).toBe(400)
  })
})

describe("GET /api/reemplazos", () => {
  it("filtra por clase", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos?claseId=${claseId}`, { headers })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((r: any) => r.id === reemplazoId)).toBe(true)
  })

  it("rechaza sin filtros", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, { headers })
    expect(res.status).toBe(400)
  })
})

describe("GET /api/reemplazos/[id]", () => {
  it("devuelve reemplazo", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/${reemplazoId}`, { headers })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.id).toBe(reemplazoId)
  })

  it("404 si no existe", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/999999`, { headers })
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/reemplazos/[id]", () => {
  it("soft delete + revierte clase", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/${reemplazoId}`, {
      method: "DELETE",
      headers,
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.deleted).toBe(true)

    const claseRes = await fetch(`${BASE_URL}/clases/${claseId}`, { headers })
    const clase = await claseRes.json()

    expect(clase.estado).toBe("PROGRAMADA")
  })
})