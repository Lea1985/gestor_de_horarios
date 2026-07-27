// tests/reemplazos.test.ts
//
// NOTA: no usa createTestAgente/destroyInstitucion de tests/helpers/factories.ts:
// ese helper quedó desincronizado del schema actual (Asignacion ya no tiene
// agenteId, AgenteInstitucion ya no existe -- Agente ahora cuelga directo de
// institucionId). Mismo criterio que tests/generacion-clases.test.ts: fixtures
// propios y autocontenidos, sin tocar esa deuda preexistente.

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:         Record<string, string>
let institucionId:   number
let asignacionId:    number
let asigSuplenteId:  number
let agenteSuplenteId: number
let claseId:         number
let reemplazoId:     number

async function destroyTestTenant(institucionId: number) {
  await prisma.reemplazo.deleteMany({ where: { clase: { institucionId } } })
  await prisma.claseProgramada.deleteMany({ where: { institucionId } })
  await prisma.asignacion.deleteMany({ where: { institucionId } })
  await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
  await prisma.moduloHorario.deleteMany({ where: { institucionId } })
  await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
  await prisma.turno.deleteMany({ where: { institucionId } })
  await prisma.agente.deleteMany({ where: { institucionId } })

  const usuariosVinculados = await prisma.usuarioRol.findMany({
    where: { institucionId }, select: { usuarioId: true },
  })
  const usuarioIds = usuariosVinculados.map(u => u.usuarioId)
  await prisma.usuarioRol.deleteMany({ where: { institucionId } })
  await prisma.sesion.deleteMany({ where: { institucionId } })
  if (usuarioIds.length > 0) {
    await prisma.usuario.deleteMany({
      where: { id: { in: usuarioIds }, roles: { none: {} }, sesiones: { none: {} } },
    })
  }
  await prisma.institucion.delete({ where: { id: institucionId } })
}

beforeAll(async () => {
  const tenant  = await createTestTenant()
  institucionId = tenant.institucionId
  headers       = authHeaders(String(institucionId), tenant.token)

  const turno = await prisma.turno.create({
    data: { institucionId, nombre: "Turno Reemp Test", horaInicio: 480, horaFin: 720 },
  })

  const agenteSuplente = await prisma.agente.create({
    data: {
      institucionId,
      nombre:    "Suplente",
      apellido:  "Reemp Test",
      documento: `DOC-${randomUUID()}`,
      email:     `sup-${randomUUID()}@test.dev`,
      estado:    "ACTIVO",
    },
  })
  agenteSuplenteId = agenteSuplente.id

  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula Reemp Test" },
  })

  const asignacionTitular = await prisma.asignacion.create({
    data: {
      institucionId,
      unidadId:                 unidad.id,
      turnoId:                  turno.id,
      identificadorEstructural: `REEMP-TIT-${randomUUID()}`,
      fecha_inicio:             new Date("2026-01-01"),
    },
  })
  asignacionId = asignacionTitular.id

  const asignacionSuplente = await prisma.asignacion.create({
    data: {
      institucionId,
      unidadId:                 unidad.id,
      turnoId:                  turno.id,
      identificadorEstructural: `REEMP-SUP-${randomUUID()}`,
      fecha_inicio:             new Date("2026-01-01"),
    },
  })
  asigSuplenteId = asignacionSuplente.id

  const modulo = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "DOMINGO", hora_desde: 480, hora_hasta: 520 },
  })

  // Cubre la fecha de la clase para que, sin incidencia, la resolución dé
  // PROGRAMADA/NINGUNA en vez de SUSPENDIDA/PERIODO_OPERATIVO.
  await prisma.periodoOperativo.create({
    data: {
      institucionId,
      nombre:      `Periodo Reemp Test ${randomUUID()}`,
      fecha_desde: new Date("2026-01-01"),
      fecha_hasta: new Date("2027-12-31"),
      estado:      "ACTIVO",
    },
  })

  const clase = await prisma.claseProgramada.create({
    data: {
      institucionId,
      asignacionId,
      moduloId: modulo.id,
      unidadId: unidad.id,
      fecha:    new Date("2026-08-05T12:00:00.000Z"),
      estado:   "PROGRAMADA",
    },
  })
  claseId = clase.id
})

afterAll(async () => {
  await destroyTestTenant(institucionId)
})

// ─── POST /api/reemplazos ─────────────────────────────────────────────────────

describe("POST /api/reemplazos", () => {
  it("crea un reemplazo sobre una clase sin incidencia — el reemplazo queda registrado pero el estado de la clase no cambia", async () => {
    // REEMPLAZADA solo es alcanzable a través de la rama INCIDENCIA de la
    // tabla de precedencia (ver resolucionClaseService.ts). Un reemplazo
    // creado sobre una clase sin incidencia activa no tiene, hoy, forma de
    // llegar a ese estado: resolverClase() se ejecuta después de crear el
    // reemplazo y re-evalúa la clase sin encontrar incidencia.
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
        agenteSuplenteId,
        observacion:          "Test reemplazo",
      }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.claseId).toBe(claseId)
    reemplazoId = data.id

    const claseRes = await fetch(`${BASE_URL}/clases/${claseId}`, { headers })
    const clase    = await claseRes.json()
    expect(clase.estado).toBe("PROGRAMADA")
  })

  it("rechaza duplicado (409)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
        agenteSuplenteId,
      }),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza sin claseId (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
        agenteSuplenteId,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin asignacionTitularId (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId,
        asignacionSuplenteId: asigSuplenteId,
        agenteSuplenteId,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin agenteSuplenteId (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId,
        asignacionTitularId: asignacionId,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza clase inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId:              999999,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
        agenteSuplenteId,
      }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        claseId,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
        agenteSuplenteId,
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": String(institucionId) },
      body:    JSON.stringify({
        claseId,
        asignacionTitularId:  asignacionId,
        asignacionSuplenteId: asigSuplenteId,
        agenteSuplenteId,
      }),
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/reemplazos ──────────────────────────────────────────────────────

describe("GET /api/reemplazos", () => {
  it("filtra por claseId", async () => {
    const res  = await fetch(`${BASE_URL}/reemplazos?claseId=${claseId}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((r: { id: number }) => r.id === reemplazoId)).toBe(true)
  })

  it("rechaza sin filtros (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, { headers })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos?claseId=${claseId}`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos?claseId=${claseId}`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/reemplazos/[id] ─────────────────────────────────────────────────

describe("GET /api/reemplazos/[id]", () => {
  it("devuelve el reemplazo por id", async () => {
    const res  = await fetch(`${BASE_URL}/reemplazos/${reemplazoId}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(reemplazoId)
    expect(data.claseId).toBe(claseId)
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/reemplazos/[id] ──────────────────────────────────────────────

describe("DELETE /api/reemplazos/[id]", () => {
  it("elimina (soft delete) el reemplazo y la clase permanece PROGRAMADA", async () => {
    const res  = await fetch(`${BASE_URL}/reemplazos/${reemplazoId}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(true)

    const claseRes = await fetch(`${BASE_URL}/clases/${claseId}`, { headers })
    const clase    = await claseRes.json()
    expect(clase.estado).toBe("PROGRAMADA")
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/999999`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(404)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/abc`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(400)
  })
})
