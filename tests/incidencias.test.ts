// tests/incidencias.test.ts
//
// NOTA: no usa createTestAgente/destroyInstitucion de tests/helpers/factories.ts:
// ese helper quedó desincronizado del schema actual (Asignacion ya no tiene
// agenteId, AgenteInstitucion ya no existe -- Agente ahora cuelga directo de
// institucionId). Mismo criterio que tests/generacion-clases.test.ts: fixtures
// propios y autocontenidos, sin tocar esa deuda preexistente.
//
// Todas las fechas usadas son posteriores a la fecha de esta sesión (2026-07-24)
// para poder ejercitar también el flujo de reactivación (bloqueado si
// fecha_hasta < hoy). Se crea un PeriodoOperativo ACTIVO que cubre todo el
// rango usado para que, al no haber incidencia activa, la causa PERIODO_OPERATIVO
// (que tiene precedencia sobre NINGUNA) no interfiera con las aserciones.

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

let headers:        Record<string, string>
let institucionId:  number
let asignacionId:   number
let asignacion2Id:  number
let agenteSuplenteId: number
let itemId:         number
let incidenciaId:   number

// clases pre-creadas para la asignación usada en los tests de CRUD/validación
const clasesAsig1: Record<string, number> = {}
// clases pre-creadas para la asignación dedicada al camino INCIDENCIA completo
const clasesAsig2: Record<string, number> = {}

async function crearClasesEnRango(
  asignacionId: number,
  moduloId:     number,
  unidadId:     number,
  institucionId: number,
  desdeISO: string,
  hastaISO: string,
  store: Record<string, number>
) {
  const cursor = new Date(`${desdeISO}T12:00:00.000Z`)
  const fin    = new Date(`${hastaISO}T12:00:00.000Z`)
  while (cursor <= fin) {
    const clase = await prisma.claseProgramada.create({
      data: {
        institucionId,
        asignacionId,
        moduloId,
        unidadId,
        fecha:  new Date(cursor),
        estado: "PROGRAMADA",
      },
    })
    store[cursor.toISOString().slice(0, 10)] = clase.id
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
}

async function destroyTestTenant(institucionId: number) {
  await prisma.reemplazo.deleteMany({ where: { clase: { institucionId } } })
  await prisma.claseProgramada.deleteMany({ where: { institucionId } })
  await prisma.incidencia.deleteMany({ where: { asignacion: { institucionId } } })
  await prisma.asignacion.deleteMany({ where: { institucionId } })
  await prisma.codigarioItem.deleteMany({ where: { codigario: { institucionId } } })
  await prisma.codigario.deleteMany({ where: { institucionId } })
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
    data: { institucionId, nombre: "Turno Incid Test", horaInicio: 480, horaFin: 720 },
  })

  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: 1, nombre: "Aula Incid Test" },
  })

  const modulo = await prisma.moduloHorario.create({
    data: { institucionId, dia_semana: "DOMINGO", hora_desde: 480, hora_hasta: 520 },
  })

  // Cubre todo el rango de fechas usado por el archivo para que, en ausencia
  // de incidencia, la resolución dé PROGRAMADA/NINGUNA en vez de
  // SUSPENDIDA/PERIODO_OPERATIVO (no es el foco de este archivo).
  await prisma.periodoOperativo.create({
    data: {
      institucionId,
      nombre:      `Periodo Incid Test ${randomUUID()}`,
      fecha_desde: new Date("2026-01-01"),
      fecha_hasta: new Date("2027-12-31"),
      estado:      "ACTIVO",
    },
  })

  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId,
      unidadId:                 unidad.id,
      turnoId:                  turno.id,
      identificadorEstructural: `INCID-TEST-${randomUUID()}`,
      fecha_inicio:             new Date("2026-01-01"),
    },
  })
  asignacionId = asignacion.id

  const asignacion2 = await prisma.asignacion.create({
    data: {
      institucionId,
      unidadId:                 unidad.id,
      turnoId:                  turno.id,
      identificadorEstructural: `INCID-TEST2-${randomUUID()}`,
      fecha_inicio:             new Date("2026-01-01"),
    },
  })
  asignacion2Id = asignacion2.id

  const agenteSuplente = await prisma.agente.create({
    data: {
      institucionId,
      nombre:    "Suplente",
      apellido:  "Incid Test",
      documento: `DOC-${randomUUID()}`,
      email:     `sup-${randomUUID()}@test.dev`,
      estado:    "ACTIVO",
    },
  })
  agenteSuplenteId = agenteSuplente.id

  const codigario = await prisma.codigario.create({
    data: { institucionId, nombre: `COD-INCID-${randomUUID().slice(0, 8).toUpperCase()}` },
  })

  const item = await prisma.codigarioItem.create({
    data: {
      codigarioId: codigario.id,
      codigo:      `ENF-${randomUUID().slice(0, 6)}`,
      nombre:      "Enfermedad test",
    },
  })
  itemId = item.id

  // Ventanas de clases para los grupos de CRUD/validación (asignacionId)
  await crearClasesEnRango(asignacionId, modulo.id, unidad.id, institucionId, "2026-08-01", "2026-08-05", clasesAsig1)
  await crearClasesEnRango(asignacionId, modulo.id, unidad.id, institucionId, "2026-09-01", "2026-09-05", clasesAsig1)
  await crearClasesEnRango(asignacionId, modulo.id, unidad.id, institucionId, "2026-12-01", "2026-12-03", clasesAsig1)
  await crearClasesEnRango(asignacionId, modulo.id, unidad.id, institucionId, "2027-01-01", "2027-01-03", clasesAsig1)

  // Ventana dedicada al camino INCIDENCIA completo (asignacion2Id)
  await crearClasesEnRango(asignacion2Id, modulo.id, unidad.id, institucionId, "2026-08-09", "2026-08-15", clasesAsig2)
})

afterAll(async () => {
  await destroyTestTenant(institucionId)
})

function buildIncidencia(overrides?: Record<string, unknown>) {
  return {
    asignacionId,
    codigarioItemId: itemId,
    fecha_desde:     "2026-08-01",
    fecha_hasta:     "2026-08-03",
    observacion:     "Test incidencia",
    ...overrides,
  }
}

async function crearIncidencia(overrides?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/incidencias`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(buildIncidencia(overrides)),
  })
  if (res.status !== 201) throw new Error(`Error creando incidencia: ${res.status}`)
  return res.json()
}

// ─── GET /api/incidencias ─────────────────────────────────────────────────────

describe("GET /api/incidencias", () => {
  it("devuelve lista de incidencias", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("filtra por asignacionId", async () => {
    const res  = await fetch(
      `${BASE_URL}/incidencias?asignacionId=${asignacionId}`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      headers: { "x-tenant-id": String(institucionId) },
    })
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/incidencias ────────────────────────────────────────────────────

describe("POST /api/incidencias", () => {
  it("crea una incidencia", async () => {
    const inc = await crearIncidencia()
    expect(inc.asignacionId).toBe(asignacionId)
    expect(inc).toHaveProperty("id")
    incidenciaId = inc.id
  })

  it("rechaza superposición de fechas (409)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildIncidencia({
        fecha_desde: "2026-08-02",
        fecha_hasta: "2026-08-05",
      })),
    })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data).toHaveProperty("conflicto")
  })

  it("rechaza rango de fechas inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildIncidencia({
        fecha_desde: "2026-09-10",
        fecha_hasta: "2026-09-01",
      })),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin asignacionId (400)", async () => {
    const { asignacionId: _, ...sinAsig } = buildIncidencia()
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinAsig),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin codigarioItemId (400)", async () => {
    const { codigarioItemId: _, ...sinItem } = buildIncidencia()
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinItem),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin fecha_desde (400)", async () => {
    const { fecha_desde: _, ...sinFecha } = buildIncidencia()
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(sinFecha),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza asignación inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildIncidencia({
        asignacionId: 999999,
        fecha_desde:  "2026-10-01",
        fecha_hasta:  "2026-10-03",
      })),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza codigarioItem inexistente (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildIncidencia({
        codigarioItemId: 999999,
        fecha_desde:     "2026-10-01",
        fecha_hasta:     "2026-10-03",
      })),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin clases programadas en el rango (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(buildIncidencia({
        fecha_desde: "2030-01-01",
        fecha_hasta: "2030-01-03",
      })),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildIncidencia({ fecha_desde: "2026-11-01", fecha_hasta: "2026-11-03" })),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": String(institucionId) },
      body:    JSON.stringify(buildIncidencia({ fecha_desde: "2026-11-01", fecha_hasta: "2026-11-03" })),
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/incidencias/asignacion/[id] ─────────────────────────────────────

describe("GET /api/incidencias/asignacion/[id]", () => {
  it("devuelve incidencias de la asignación", async () => {
    const res  = await fetch(
      `${BASE_URL}/incidencias/asignacion/${asignacionId}`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.every((i: { asignacionId: number }) => i.asignacionId === asignacionId)).toBe(true)
  })

  it("devuelve 404 para asignación inexistente", async () => {
    const res = await fetch(
      `${BASE_URL}/incidencias/asignacion/999999`,
      { headers }
    )
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(
      `${BASE_URL}/incidencias/asignacion/abc`,
      { headers }
    )
    expect(res.status).toBe(400)
  })
})

// ─── POST /api/incidencias/validar-superposicion ──────────────────────────────

describe("POST /api/incidencias/validar-superposicion", () => {
  it("devuelve tieneSuperposicion:false si no hay conflicto", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId,
        fecha_desde: "2027-02-01",
        fecha_hasta: "2027-02-05",
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tieneSuperposicion).toBe(false)
    expect(data.conflicto).toBeNull()
  })

  it("devuelve tieneSuperposicion:true si hay conflicto", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId,
        fecha_desde: "2026-08-02",
        fecha_hasta: "2026-08-04",
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tieneSuperposicion).toBe(true)
    expect(data.conflicto).not.toBeNull()
    expect(data.conflicto).toHaveProperty("id")
  })

  it("excluye la incidencia indicada en excludeId", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId,
        fecha_desde: "2026-08-01",
        fecha_hasta: "2026-08-03",
        excludeId:   incidenciaId,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tieneSuperposicion).toBe(false)
  })

  it("rechaza sin asignacionId (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({ fecha_desde: "2026-08-01", fecha_hasta: "2026-08-03" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza asignación inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId: 999999,
        fecha_desde:  "2026-08-01",
        fecha_hasta:  "2026-08-03",
      }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/validar-superposicion`, {
      method:  "POST",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/incidencias/[id] ────────────────────────────────────────────────

describe("GET /api/incidencias/[id]", () => {
  it("devuelve la incidencia por id", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(incidenciaId)
    expect(data).toHaveProperty("codigarioItem")
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/999999`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/abc`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── PATCH /api/incidencias/[id] ─────────────────────────────────────────────

describe("PATCH /api/incidencias/[id]", () => {
  it("actualiza la observacion", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ observacion: "Observación actualizada" }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.observacion).toBe("Observación actualizada")
  })

  it("actualiza las fechas", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ fecha_desde: "2026-08-01", fecha_hasta: "2026-08-02" }),
    })
    expect(res.status).toBe(200)
  })

  it("rechaza rango inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ fecha_desde: "2026-08-10", fecha_hasta: "2026-08-01" }),
    })
    expect(res.status).toBe(400)
  })

  it("rechaza superposición (409)", async () => {
    const segunda = await crearIncidencia({
      fecha_desde: "2026-09-01",
      fecha_hasta: "2026-09-05",
    })
    expect(segunda).toHaveProperty("id")

    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ fecha_desde: "2026-08-30", fecha_hasta: "2026-09-03" }),
    })
    expect(res.status).toBe(409)
  })

  it("rechaza id inexistente (404)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/999999`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ observacion: "test" }),
    })
    expect(res.status).toBe(404)
  })

  it("rechaza JSON inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incidenciaId}`, {
      method:  "PATCH",
      headers,
      body:    "esto no es json{{{",
    })
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/incidencias/[id]/cadena ─────────────────────────────────────────

describe("GET /api/incidencias/[id]/cadena", () => {
  it("devuelve la cadena de incidencias", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/${incidenciaId}/cadena`, { headers })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  it("devuelve 404 para id inexistente", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/999999/cadena`, { headers })
    expect(res.status).toBe(404)
  })

  it("devuelve 400 para id inválido", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/abc/cadena`, { headers })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/incidencias/[id] ────────────────────────────────────────────

describe("DELETE /api/incidencias/[id]", () => {
  it("elimina la incidencia", async () => {
    const inc = await crearIncidencia({
      fecha_desde: "2026-12-01",
      fecha_hasta: "2026-12-03",
    })
    const res = await fetch(`${BASE_URL}/incidencias/${inc.id}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.deleted).toBe(true)
  })

  it("es idempotente — deleted:false la segunda vez", async () => {
    const inc = await crearIncidencia({
      fecha_desde: "2027-01-01",
      fecha_hasta: "2027-01-03",
    })
    await fetch(`${BASE_URL}/incidencias/${inc.id}`, { method: "DELETE", headers })
    const res  = await fetch(`${BASE_URL}/incidencias/${inc.id}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("devuelve deleted:false para id inexistente", async () => {
    const res  = await fetch(`${BASE_URL}/incidencias/999999`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(false)
  })

  it("rechaza id inválido (400)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/abc`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(400)
  })
})

// ─── Camino INCIDENCIA — resolución de estado de ClaseProgramada ─────────────
//
// Verifica end-to-end el bug central de la sesión 2026-07-24: crear/editar/
// eliminar/reactivar una incidencia debe efectivamente resolver el estado de
// las clases afectadas (antes de esa sesión, ninguno de estos pasos tocaba
// ClaseProgramada). Usa asignacion2Id, aislada de los grupos anteriores.

describe("Camino INCIDENCIA — resolución de estado de ClaseProgramada", () => {
  let incId:         number
  let reemplazoId:   number
  const claseId = (fecha: string) => clasesAsig2[fecha]

  it("crear incidencia sin reemplazo suspende las clases del rango (causa INCIDENCIA)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        asignacionId:    asignacion2Id,
        codigarioItemId: itemId,
        fecha_desde:     "2026-08-10",
        fecha_hasta:     "2026-08-12",
        observacion:     "Incidencia camino completo",
      }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    incId = data.id

    for (const fecha of ["2026-08-10", "2026-08-11", "2026-08-12"]) {
      const r = await fetch(`${BASE_URL}/clases/${claseId(fecha)}`, { headers })
      const clase = await r.json()
      expect(clase.estado).toBe("SUSPENDIDA")
      expect(clase.causa).toBe("INCIDENCIA")
      expect(clase.incidenciaId).toBe(incId)
    }

    // Fuera del rango: no debe verse afectada
    const rFuera = await fetch(`${BASE_URL}/clases/${claseId("2026-08-09")}`, { headers })
    const claseFuera = await rFuera.json()
    expect(claseFuera.estado).toBe("PROGRAMADA")
    expect(claseFuera.incidenciaId).toBeNull()
  })

  it("asignar un reemplazo a una clase de la incidencia la marca REEMPLAZADA", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos`, {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        claseId:              claseId("2026-08-10"),
        asignacionTitularId:  asignacion2Id,
        agenteSuplenteId,
        incidenciaId:         incId,
        observacion:          "Cobertura de incidencia",
      }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    reemplazoId = data.id

    const r = await fetch(`${BASE_URL}/clases/${claseId("2026-08-10")}`, { headers })
    const clase = await r.json()
    expect(clase.estado).toBe("REEMPLAZADA")
    expect(clase.causa).toBe("INCIDENCIA")
    expect(clase.incidenciaId).toBe(incId)
  })

  it("eliminar el reemplazo revierte la clase a SUSPENDIDA (la incidencia sigue activa)", async () => {
    const res = await fetch(`${BASE_URL}/reemplazos/${reemplazoId}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)

    const r = await fetch(`${BASE_URL}/clases/${claseId("2026-08-10")}`, { headers })
    const clase = await r.json()
    expect(clase.estado).toBe("SUSPENDIDA")
    expect(clase.causa).toBe("INCIDENCIA")
  })

  it("extender fecha_desde hacia atrás re-resuelve el nuevo tramo (fix: antes solo se miraba fecha_hasta)", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incId}`, {
      method:  "PATCH",
      headers,
      body:    JSON.stringify({ fecha_desde: "2026-08-09", fecha_hasta: "2026-08-12" }),
    })
    expect(res.status).toBe(200)

    const r = await fetch(`${BASE_URL}/clases/${claseId("2026-08-09")}`, { headers })
    const clase = await r.json()
    expect(clase.estado).toBe("SUSPENDIDA")
    expect(clase.causa).toBe("INCIDENCIA")
    expect(clase.incidenciaId).toBe(incId)
  })

  it("eliminar la incidencia libera las clases y vuelven a PROGRAMADA", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incId}`, {
      method: "DELETE", headers,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe(true)

    for (const fecha of ["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12"]) {
      const r = await fetch(`${BASE_URL}/clases/${claseId(fecha)}`, { headers })
      const clase = await r.json()
      expect(clase.estado).toBe("PROGRAMADA")
      expect(clase.causa).toBe("NINGUNA")
      expect(clase.incidenciaId).toBeNull()
    }
  })

  it("reactivar la incidencia re-vincula y re-suspende las clases", async () => {
    const res = await fetch(`${BASE_URL}/incidencias/${incId}/reactivar`, {
      method: "POST", headers,
    })
    expect(res.status).toBe(200)

    for (const fecha of ["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12"]) {
      const r = await fetch(`${BASE_URL}/clases/${claseId(fecha)}`, { headers })
      const clase = await r.json()
      expect(clase.estado).toBe("SUSPENDIDA")
      expect(clase.causa).toBe("INCIDENCIA")
      expect(clase.incidenciaId).toBe(incId)
    }
  })
})
