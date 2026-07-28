// tests/reportes-modulos-computables.test.ts
//
// No usa createTestAgente/destroyInstitucion tal cual de tests/helpers/factories.ts
// para la limpieza: se arma un destroy propio y autocontenido (mismo criterio que
// tests/incidencias.test.ts y tests/generacion-clases.test.ts), porque acá se
// crean Incidencia + CodigarioItem + TitularAsignacion que ese helper no contempla.
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { authHeaders, BASE_URL } from "./helpers/auth"
import { createTestTenant, prisma } from "./helpers/factories"
import { randomUUID } from "crypto"

async function destroyTestTenant(institucionId: number) {
  await prisma.claseProgramada.deleteMany({ where: { institucionId } })
  await prisma.incidencia.deleteMany({ where: { asignacion: { institucionId } } })
  await prisma.asignacion.deleteMany({ where: { institucionId } }) // cascada: TitularAsignacion
  await prisma.codigarioItem.deleteMany({ where: { codigario: { institucionId } } })
  await prisma.codigario.deleteMany({ where: { institucionId } })
  await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
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

async function crearBase(institucionId: number) {
  const turno = await prisma.turno.create({
    data: { institucionId, nombre: `Turno-${randomUUID()}`, horaInicio: 480, horaFin: 720 },
  })
  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: Math.floor(Math.random() * 1_000_000), nombre: `Aula-${randomUUID()}` },
  })
  const agente = await prisma.agente.create({
    data: {
      institucionId, nombre: "Docente", apellido: "Test",
      documento: `DOC-${randomUUID()}`, email: `doc-${randomUUID()}@test.dev`, estado: "ACTIVO",
    },
  })
  return { turnoId: turno.id, unidadId: unidad.id, agenteId: agente.id }
}

function crearAsignacion(institucionId: number, unidadId: number, turnoId: number) {
  return prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId,
      identificadorEstructural: `MODCOMP-${randomUUID()}`,
      fecha_inicio: new Date("2026-01-01"),
    },
  })
}

function crearTitularidad(
  institucionId: number, asignacionId: number, agenteId: number,
  fecha_desde: Date, fecha_hasta: Date | null
) {
  return prisma.titularAsignacion.create({
    data: { institucionId, asignacionId, agenteId, fecha_desde, fecha_hasta, activo: fecha_hasta === null },
  })
}

// ─── Escenario principal: cálculo ponderado ────────────────────────────────────

describe("GET /api/reportes/modulos-computables — cálculo ponderado", () => {
  let headers: Record<string, string>
  let institucionId: number
  let agenteId: number
  let asignacionId: number

  beforeAll(async () => {
    const tenant = await createTestTenant()
    institucionId = tenant.institucionId
    headers = authHeaders(String(institucionId), tenant.token)

    const base = await crearBase(institucionId)
    agenteId = base.agenteId
    const asignacion = await crearAsignacion(institucionId, base.unidadId, base.turnoId)
    asignacionId = asignacion.id
    await crearTitularidad(institucionId, asignacionId, agenteId, new Date("2026-01-01"), null)

    const codigario = await prisma.codigario.create({
      data: { institucionId, nombre: `COD-MODCOMP-${randomUUID().slice(0, 8).toUpperCase()}` },
    })
    const itemEnfermedad = await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: `ENF-${randomUUID().slice(0, 6)}`, nombre: "Enfermedad", porcentajeComputable: 100 },
    })
    const itemArt23b = await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: `23B-${randomUUID().slice(0, 6)}`, nombre: "Art. 23.b", porcentajeComputable: 0 },
    })
    const itemOtraLicencia = await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: `OTR-${randomUUID().slice(0, 6)}`, nombre: "Otra licencia", porcentajeComputable: 85 },
    })

    const incEnfermedad = await prisma.incidencia.create({
      data: {
        asignacionId, codigarioItemId: itemEnfermedad.id,
        fecha_desde: new Date("2026-04-08T12:00:00.000Z"), fecha_hasta: new Date("2026-04-08T12:00:00.000Z"),
      },
    })
    const incArt23b = await prisma.incidencia.create({
      data: {
        asignacionId, codigarioItemId: itemArt23b.id,
        fecha_desde: new Date("2026-04-09T12:00:00.000Z"), fecha_hasta: new Date("2026-04-09T12:00:00.000Z"),
      },
    })
    const incOtraLicencia = await prisma.incidencia.create({
      data: {
        asignacionId, codigarioItemId: itemOtraLicencia.id,
        fecha_desde: new Date("2026-04-10T12:00:00.000Z"), fecha_hasta: new Date("2026-04-10T12:00:00.000Z"),
      },
    })

    // Clase 1 y 2: sin incidencia -> 100% cada una.
    // Clase 3: incidencia Enfermedad -> 100%.
    // Clase 4: incidencia Art. 23.b -> 0%.
    // Clase 5: incidencia Otra licencia -> 85%.
    // Total esperado: 1 + 1 + 1 + 0 + 0.85 = 3.85
    await prisma.claseProgramada.createMany({
      data: [
        { institucionId, asignacionId, unidadId: base.unidadId, fecha: new Date("2026-04-06T12:00:00.000Z"), estado: "PROGRAMADA" },
        { institucionId, asignacionId, unidadId: base.unidadId, fecha: new Date("2026-04-07T12:00:00.000Z"), estado: "PROGRAMADA" },
        { institucionId, asignacionId, unidadId: base.unidadId, fecha: new Date("2026-04-08T12:00:00.000Z"), estado: "SUSPENDIDA", causa: "INCIDENCIA", incidenciaId: incEnfermedad.id },
        { institucionId, asignacionId, unidadId: base.unidadId, fecha: new Date("2026-04-09T12:00:00.000Z"), estado: "SUSPENDIDA", causa: "INCIDENCIA", incidenciaId: incArt23b.id },
        { institucionId, asignacionId, unidadId: base.unidadId, fecha: new Date("2026-04-10T12:00:00.000Z"), estado: "SUSPENDIDA", causa: "INCIDENCIA", incidenciaId: incOtraLicencia.id },
      ],
    })
  })

  afterAll(() => destroyTestTenant(institucionId))

  it("calcula 3.85 módulos computables con rango arbitrario", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&desde=2026-04-01&hasta=2026-04-30`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalClases).toBe(5)
    expect(data.totalModulosComputables).toBe(3.85)
    expect(data.detalle).toHaveLength(5)
  })

  it("da el mismo resultado con período por mes calendario", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&mes=4&anio=2026`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalModulosComputables).toBe(3.85)
  })

  it("da el mismo resultado con período por PeriodoOperativo", async () => {
    const periodo = await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `Periodo-MODCOMP-${randomUUID()}`,
        fecha_desde: new Date("2026-04-01"), fecha_hasta: new Date("2026-04-30"),
      },
    })
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&periodoOperativoId=${periodo.id}`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalModulosComputables).toBe(3.85)
  })

  it("devuelve el detalle con el porcentaje aplicado por clase", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&desde=2026-04-01&hasta=2026-04-30`,
      { headers }
    )
    const data = await res.json()
    const porFecha = (f: string) => data.detalle.find((d: { fecha: string }) => d.fecha.startsWith(f))
    expect(porFecha("2026-04-06").porcentajeComputable).toBe(100)
    expect(porFecha("2026-04-08").porcentajeComputable).toBe(100)
    expect(porFecha("2026-04-09").porcentajeComputable).toBe(0)
    expect(porFecha("2026-04-10").porcentajeComputable).toBe(85)
  })

  it("devuelve 0 clases y 0 módulos para un período sin clases", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&desde=2020-01-01&hasta=2020-01-31`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalClases).toBe(0)
    expect(data.totalModulosComputables).toBe(0)
    expect(data.detalle).toEqual([])
  })

  it("rechaza sin agenteId (400)", async () => {
    const res = await fetch(`${BASE_URL}/reportes/modulos-computables?desde=2026-04-01&hasta=2026-04-30`, { headers })
    expect(res.status).toBe(400)
  })

  it("rechaza sin ninguna forma de período (400)", async () => {
    const res = await fetch(`${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}`, { headers })
    expect(res.status).toBe(400)
  })

  it("rechaza si se indica más de una forma de período a la vez (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&mes=4&anio=2026&desde=2026-04-01&hasta=2026-04-30`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza PeriodoOperativo inexistente (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&periodoOperativoId=999999`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza mes fuera de rango (400)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&mes=13&anio=2026`,
      { headers }
    )
    expect(res.status).toBe(400)
  })

  it("rechaza sin tenant (400)", async () => {
    const res = await fetch(`${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&mes=4&anio=2026`)
    expect(res.status).toBe(400)
  })

  it("rechaza con tenant pero sin token (401)", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&mes=4&anio=2026`,
      { headers: { "x-tenant-id": String(institucionId) } }
    )
    expect(res.status).toBe(401)
  })
})

// ─── Respeta el historial de titularidad ───────────────────────────────────────

describe("GET /api/reportes/modulos-computables — respeta historial de TitularAsignacion", () => {
  let headers: Record<string, string>
  let institucionId: number
  let agenteId: number

  beforeAll(async () => {
    const tenant = await createTestTenant()
    institucionId = tenant.institucionId
    headers = authHeaders(String(institucionId), tenant.token)

    const base = await crearBase(institucionId)
    agenteId = base.agenteId

    // El docente ocupó el cargo A hasta el 15/04, y desde el 16/04 pasa al cargo B.
    // Se le piden los módulos computables de todo abril: tiene que traer clases
    // de los dos cargos, cada una en su tramo correspondiente.
    const asignacionA = await crearAsignacion(institucionId, base.unidadId, base.turnoId)
    const asignacionB = await crearAsignacion(institucionId, base.unidadId, base.turnoId)
    await crearTitularidad(institucionId, asignacionA.id, agenteId, new Date("2026-01-01"), new Date("2026-04-15T23:59:59.999Z"))
    await crearTitularidad(institucionId, asignacionB.id, agenteId, new Date("2026-04-16T00:00:00.000Z"), null)

    await prisma.claseProgramada.createMany({
      data: [
        { institucionId, asignacionId: asignacionA.id, unidadId: base.unidadId, fecha: new Date("2026-04-06T12:00:00.000Z"), estado: "PROGRAMADA" },
        { institucionId, asignacionId: asignacionA.id, unidadId: base.unidadId, fecha: new Date("2026-04-13T12:00:00.000Z"), estado: "PROGRAMADA" },
        { institucionId, asignacionId: asignacionB.id, unidadId: base.unidadId, fecha: new Date("2026-04-20T12:00:00.000Z"), estado: "PROGRAMADA" },
        { institucionId, asignacionId: asignacionB.id, unidadId: base.unidadId, fecha: new Date("2026-04-27T12:00:00.000Z"), estado: "PROGRAMADA" },
      ],
    })
  })

  afterAll(() => destroyTestTenant(institucionId))

  it("trae clases de ambos cargos dentro del período, respetando cada tramo de titularidad", async () => {
    const res = await fetch(
      `${BASE_URL}/reportes/modulos-computables?agenteId=${agenteId}&mes=4&anio=2026`,
      { headers }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalClases).toBe(4)
    expect(data.totalModulosComputables).toBe(4)
    const asignacionesEnDetalle = new Set(data.detalle.map((d: { asignacionId: number }) => d.asignacionId))
    expect(asignacionesEnDetalle.size).toBe(2)
  })
})