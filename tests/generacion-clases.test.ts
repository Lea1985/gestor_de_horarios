// tests/generacion-clases.test.ts
//
// Valida end-to-end los 3 disparadores legítimos de generación de ClaseProgramada
// (ver docs/Revisión de arquitectura de ClaseProgramada.md, sección 5), invocando
// los usecases directamente (sin servidor HTTP) contra gestor_test.
//
// No usa tests/helpers/factories.ts para Agente/destroyInstitucion: ese helper
// quedó desincronizado del schema actual (Asignacion ya no tiene agenteId,
// AgenteInstitucion ya no existe). Como estos usecases no tocan Agente ni
// TitularAsignacion, el test arma sus propios fixtures mínimos y su propia
// limpieza, evitando esa deuda preexistente sin necesidad de tocarla.

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"
import { EstadoClase, Causa } from "@prisma/client"
import { createTestInstitucion } from "./helpers/factories"
import { activarPeriodo } from "../lib/usecases/periodosOperativos/activarPeriodo"
import { crearDistribucion } from "../lib/usecases/distribuciones/crearDistribucion"
import { asignarModulos } from "../lib/usecases/distribuciones/asignarModulos"
import { nuevaVersionDistribucion } from "../lib/usecases/distribuciones/nuevaVersionDistribucion"

const DIA_JS = {
  LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 0,
} as const

// Cuenta cuántas fechas en [desde, hasta] (ambos inclusive, UTC) caen en el
// día de semana dado. Cálculo independiente del de producción (lib/helpers/clases.ts),
// para que sirva como verificación externa y no como espejo del código bajo test.
function contarDiasSemana(desde: Date, hasta: Date, diaSemanaJS: number): number {
  let count = 0
  const cursor = new Date(desde)
  cursor.setUTCHours(0, 0, 0, 0)
  const fin = new Date(hasta)
  fin.setUTCHours(0, 0, 0, 0)
  while (cursor <= fin) {
    if (cursor.getUTCDay() === diaSemanaJS) count++
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
}

let codigoUnidadCounter = 0

async function crearUnidadYTurno(institucionId: number) {
  const turno = await prisma.turno.create({
    data: { institucionId, nombre: `Turno-${randomUUID()}`, horaInicio: 480, horaFin: 720 },
  })
  const unidad = await prisma.unidadOrganizativa.create({
    data: { institucionId, codigoUnidad: ++codigoUnidadCounter, nombre: `Aula-${randomUUID()}` },
  })
  return { turnoId: turno.id, unidadId: unidad.id }
}

function crearAsignacion(institucionId: number, unidadId: number, turnoId: number, comisionId: number | null = null) {
  return prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId, comisionId,
      identificadorEstructural: `GEN-TEST-${randomUUID()}`,
      fecha_inicio: new Date("2026-01-01"),
    },
  })
}

// Modo "escolar" (comisionId seteado) para que ClaseProgramada registre moduloId
// y así poder aserter directamente sobre qué módulo generó cada clase.
async function crearComision(institucionId: number, turnoId: number) {
  const curso = await prisma.curso.create({
    data: { institucionId, nombre: `Curso-${randomUUID()}` },
  })
  const comision = await prisma.comision.create({
    data: { institucionId, cursoId: curso.id, turnoId, nombre: `Comision-${randomUUID()}` },
  })
  return comision.id
}

function crearModulo(institucionId: number, dia: keyof typeof DIA_JS, horaDesde: number, horaHasta: number) {
  return prisma.moduloHorario.create({
    data: { institucionId, dia_semana: dia, hora_desde: horaDesde, hora_hasta: horaHasta },
  })
}

// Crea una ClaseProgramada directamente, sin pasar por ningún usecase --
// para el test de reconciliación necesitamos arrancar de estados/causas
// arbitrarios que no se generan naturalmente vía los 3 disparadores.
function crearClasePrueba(
  institucionId: number,
  asignacionId: number,
  unidadId: number,
  fecha: Date,
  estado: EstadoClase,
  causa: Causa,
  calendarioEscolarId: number | null = null,
) {
  return prisma.claseProgramada.create({
    data: { institucionId, asignacionId, unidadId, fecha, estado, causa, calendarioEscolarId },
  })
}

async function destroyTestInstitucion(institucionId: number) {
  await prisma.reemplazo.deleteMany({ where: { clase: { institucionId } } })
  await prisma.claseProgramada.deleteMany({ where: { institucionId } })
  await prisma.distribucionModulo.deleteMany({ where: { distribucionHoraria: { institucionId } } })
  await prisma.distribucionHoraria.deleteMany({ where: { institucionId } })
  await prisma.asignacion.deleteMany({ where: { institucionId } })
  await prisma.comision.deleteMany({ where: { institucionId } })
  await prisma.curso.deleteMany({ where: { institucionId } })
  await prisma.moduloHorario.deleteMany({ where: { institucionId } })
  await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
  await prisma.turno.deleteMany({ where: { institucionId } })
  // CalendarioEscolar tiene FK hacia PeriodoOperativo sin cascade -- hay que
  // borrarlo antes, si no el deleteMany de período de abajo falla.
  await prisma.calendarioEscolar.deleteMany({ where: { institucionId } })
  await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
  await prisma.institucion.delete({ where: { id: institucionId } })
}

// ─── Disparador 1 — Activación de PeriodoOperativo (BORRADOR → ACTIVO) ─────────

describe("Disparador 1 — activarPeriodo genera clases de distribuciones vigentes", () => {
  let institucionId: number
  let periodoId: number
  let asigConModulos: number
  let asigSinModulos: number
  let distSinModulosId: number
  const desde = new Date("2026-01-01")
  const hasta = new Date("2026-03-31")

  beforeAll(async () => {
    const inst = await createTestInstitucion()
    institucionId = inst.id
    const { turnoId, unidadId } = await crearUnidadYTurno(institucionId)

    const a1 = await crearAsignacion(institucionId, unidadId, turnoId)
    asigConModulos = a1.id
    const dist1 = await prisma.distribucionHoraria.create({
      data: { institucionId, asignacionId: a1.id, version: 1, fecha_vigencia_desde: desde },
    })
    const modulo = await crearModulo(institucionId, "LUNES", 480, 520)
    await prisma.distribucionModulo.create({
      data: { distribucionHorariaId: dist1.id, moduloHorarioId: modulo.id },
    })

    const a2 = await crearAsignacion(institucionId, unidadId, turnoId)
    asigSinModulos = a2.id
    const dist2 = await prisma.distribucionHoraria.create({
      data: { institucionId, asignacionId: a2.id, version: 1, fecha_vigencia_desde: desde },
    })
    distSinModulosId = dist2.id

    const periodo = await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `Periodo-${randomUUID()}`,
        fecha_desde: desde, fecha_hasta: hasta, estado: "BORRADOR",
      },
    })
    periodoId = periodo.id
  })

  afterAll(() => destroyTestInstitucion(institucionId))

  it("genera las clases de la distribución con módulos y reporta aparte la que no tiene módulos", async () => {
    const resultado = await activarPeriodo(institucionId, periodoId)

    expect(resultado.periodo.estado).toBe("ACTIVO")
    expect(resultado.distribucionesProcesadas).toBe(1)
    expect(resultado.distribucionesSinModulos).toHaveLength(1)
    expect(resultado.distribucionesSinModulos[0].id).toBe(distSinModulosId)

    const esperadas = contarDiasSemana(desde, hasta, DIA_JS.LUNES)
    expect(resultado.clasesCreadas).toBe(esperadas)

    const clases = await prisma.claseProgramada.findMany({ where: { asignacionId: asigConModulos } })
    expect(clases).toHaveLength(esperadas)
    expect(clases.every(c => c.estado === "PROGRAMADA" && c.causa === "NINGUNA")).toBe(true)

    const clasesSinModulos = await prisma.claseProgramada.count({ where: { asignacionId: asigSinModulos } })
    expect(clasesSinModulos).toBe(0)
  })
})

// ─── Disparador 1b — activarPeriodo reconcilia clases existentes ──────────────

describe("Disparador 1b — activarPeriodo reconcilia clases existentes contra el nuevo rango vigente", () => {
  let institucionId: number
  let periodoId: number
  let calendarioEscolarId: number

  let claseProgramadaFueraId: number
  let claseCalendarioFueraId: number
  let claseIncidenciaFueraId: number
  let claseCambioDistFueraId: number
  let clasePeriodoDentroSinCalId: number
  let clasePeriodoDentroConCalId: number
  let claseDictadaFueraId: number

  const nuevoDesde = new Date("2026-03-01")
  const nuevoHasta = new Date("2026-05-31")

  // Cada clase sintética con su propia fecha -- no repetir ninguna, hay un
  // índice único sobre (asignacionId, fecha) activo en la base (además del
  // (asignacionId, moduloId, fecha) del schema.prisma actual -- a revisar
  // aparte, parece resabio de una migración vieja).
  const fechaProgramadaFuera     = new Date("2026-01-15")
  const fechaCalendarioFuera     = new Date("2026-07-15")
  const fechaIncidenciaFuera     = new Date("2026-01-20")
  const fechaCambioDistFuera     = new Date("2026-07-20")
  const fechaPeriodoDentroSinCal = new Date("2026-04-10")
  const fechaPeriodoDentroConCal = new Date("2026-04-15")
  const fechaDictadaFuera        = new Date("2026-01-25")
  const fechaEventoCalendario    = new Date("2026-04-01")

  beforeAll(async () => {
    const inst = await createTestInstitucion()
    institucionId = inst.id
    const { turnoId, unidadId } = await crearUnidadYTurno(institucionId)
    const asig = await crearAsignacion(institucionId, unidadId, turnoId)
    const asignacionId = asig.id

    const periodoDummy = await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `PeriodoDummy-${randomUUID()}`,
        fecha_desde: new Date("2025-01-01"), fecha_hasta: new Date("2025-12-31"),
        estado: "CERRADO",
      },
    })
    const calEvento = await prisma.calendarioEscolar.create({
      data: {
        institucionId, periodoOperativoId: periodoDummy.id,
        fecha: fechaEventoCalendario, descripcion: "Feriado de prueba", suspendeClases: true,
      },
    })
    calendarioEscolarId = calEvento.id

    const cProgFuera = await crearClasePrueba(institucionId, asignacionId, unidadId, fechaProgramadaFuera, EstadoClase.PROGRAMADA, Causa.NINGUNA)
    claseProgramadaFueraId = cProgFuera.id

    const cCalFuera = await crearClasePrueba(institucionId, asignacionId, unidadId, fechaCalendarioFuera, EstadoClase.SUSPENDIDA, Causa.CALENDARIO_ESCOLAR, calendarioEscolarId)
    claseCalendarioFueraId = cCalFuera.id

    const cIncFuera = await crearClasePrueba(institucionId, asignacionId, unidadId, fechaIncidenciaFuera, EstadoClase.SUSPENDIDA, Causa.INCIDENCIA)
    claseIncidenciaFueraId = cIncFuera.id

    const cCambioFuera = await crearClasePrueba(institucionId, asignacionId, unidadId, fechaCambioDistFuera, EstadoClase.SUSPENDIDA, Causa.CAMBIO_DISTRIBUCION)
    claseCambioDistFueraId = cCambioFuera.id

    const cPerDentroSinCal = await crearClasePrueba(institucionId, asignacionId, unidadId, fechaPeriodoDentroSinCal, EstadoClase.SUSPENDIDA, Causa.PERIODO_OPERATIVO)
    clasePeriodoDentroSinCalId = cPerDentroSinCal.id

    const cPerDentroConCal = await crearClasePrueba(institucionId, asignacionId, unidadId, fechaPeriodoDentroConCal, EstadoClase.SUSPENDIDA, Causa.PERIODO_OPERATIVO, calendarioEscolarId)
    clasePeriodoDentroConCalId = cPerDentroConCal.id

    const cDictadaFuera = await crearClasePrueba(institucionId, asignacionId, unidadId, fechaDictadaFuera, EstadoClase.DICTADA, Causa.NINGUNA)
    claseDictadaFueraId = cDictadaFuera.id

    const periodo = await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `Periodo-${randomUUID()}`,
        fecha_desde: nuevoDesde, fecha_hasta: nuevoHasta, estado: "BORRADOR",
      },
    })
    periodoId = periodo.id
  })

  afterAll(() => destroyTestInstitucion(institucionId))

  it("suspende por PERIODO_OPERATIVO lo que queda fuera del nuevo rango, revierte lo que vuelve a estar dentro, y no pisa INCIDENCIA/CAMBIO_DISTRIBUCION/DICTADA", async () => {
    const resultado = await activarPeriodo(institucionId, periodoId)

    expect(resultado.suspendidasPorPeriodo).toBe(2)
    expect(resultado.revertidasACalendario).toBe(1)
    expect(resultado.revertidasAProgramada).toBe(1)

    const fueraProgramada = await prisma.claseProgramada.findUnique({ where: { id: claseProgramadaFueraId } })
    expect(fueraProgramada?.estado).toBe("SUSPENDIDA")
    expect(fueraProgramada?.causa).toBe("PERIODO_OPERATIVO")

    const fueraCalendario = await prisma.claseProgramada.findUnique({ where: { id: claseCalendarioFueraId } })
    expect(fueraCalendario?.estado).toBe("SUSPENDIDA")
    expect(fueraCalendario?.causa).toBe("PERIODO_OPERATIVO")

    const incidenciaFuera = await prisma.claseProgramada.findUnique({ where: { id: claseIncidenciaFueraId } })
    expect(incidenciaFuera?.causa).toBe("INCIDENCIA")

    const cambioDistFuera = await prisma.claseProgramada.findUnique({ where: { id: claseCambioDistFueraId } })
    expect(cambioDistFuera?.causa).toBe("CAMBIO_DISTRIBUCION")

    const dentroSinCal = await prisma.claseProgramada.findUnique({ where: { id: clasePeriodoDentroSinCalId } })
    expect(dentroSinCal?.estado).toBe("PROGRAMADA")
    expect(dentroSinCal?.causa).toBe("NINGUNA")

    const dentroConCal = await prisma.claseProgramada.findUnique({ where: { id: clasePeriodoDentroConCalId } })
    expect(dentroConCal?.estado).toBe("SUSPENDIDA")
    expect(dentroConCal?.causa).toBe("CALENDARIO_ESCOLAR")
    expect(dentroConCal?.calendarioEscolarId).toBe(calendarioEscolarId)

    const dictada = await prisma.claseProgramada.findUnique({ where: { id: claseDictadaFueraId } })
    expect(dictada?.estado).toBe("DICTADA")
    expect(dictada?.causa).toBe("NINGUNA")
  })
})

// ─── Disparador 2 — Nueva DistribucionHoraria con período ya ACTIVO ────────────

describe("Disparador 2 — crearDistribucion en período activo", () => {
  let institucionId: number
  let unidadId: number
  let turnoId: number
  const hasta = new Date("2026-12-31")

  beforeAll(async () => {
    const inst = await createTestInstitucion()
    institucionId = inst.id
    const r = await crearUnidadYTurno(institucionId)
    unidadId = r.unidadId
    turnoId = r.turnoId

    await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `Periodo-${randomUUID()}`,
        fecha_desde: new Date("2026-01-01"), fecha_hasta: hasta, estado: "ACTIVO",
      },
    })
  })

  afterAll(() => destroyTestInstitucion(institucionId))

  it("crea la distribución sin generar clases todavía (sin módulos asignados)", async () => {
    const asig = await crearAsignacion(institucionId, unidadId, turnoId)
    const resultado = await crearDistribucion(institucionId, {
      asignacionId: asig.id, version: 1, fecha_vigencia_desde: "2026-02-01",
    })
    expect(resultado.clasesCreadas).toBe(0)

    const count = await prisma.claseProgramada.count({ where: { asignacionId: asig.id } })
    expect(count).toBe(0)
  })

  it("al asignar módulos después, se generan las clases (mismo camino que disparador 3)", async () => {
    const asig = await crearAsignacion(institucionId, unidadId, turnoId)
    const dist = await crearDistribucion(institucionId, {
      asignacionId: asig.id, version: 1, fecha_vigencia_desde: "2026-02-01",
    })
    const modulo = await crearModulo(institucionId, "MARTES", 600, 640)
    const r = await asignarModulos(dist.id, institucionId, { modulos: [modulo.id] })

    expect(r.ok).toBe(true)
    const esperadas = contarDiasSemana(new Date("2026-02-01"), hasta, DIA_JS.MARTES)
    expect(r.clasesCreadas).toBe(esperadas)

    const count = await prisma.claseProgramada.count({ where: { asignacionId: asig.id } })
    expect(count).toBe(esperadas)
  })
})

// ─── Disparador 3 — Modificación de DistribucionHoraria existente ──────────────

describe("Disparador 3 — asignarModulos y nuevaVersionDistribucion con período activo", () => {
  let institucionId: number
  let unidadId: number
  let turnoId: number
  const desde = new Date("2026-01-01")
  const hasta = new Date("2026-12-31")

  beforeAll(async () => {
    const inst = await createTestInstitucion()
    institucionId = inst.id
    const r = await crearUnidadYTurno(institucionId)
    unidadId = r.unidadId
    turnoId = r.turnoId

    await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `Periodo-${randomUUID()}`,
        fecha_desde: desde, fecha_hasta: hasta, estado: "ACTIVO",
      },
    })
  })

  afterAll(() => destroyTestInstitucion(institucionId))

  it("reemplaza módulos: suspende lo que ya no corresponde, genera lo nuevo, reactiva sin duplicar al volver atrás", async () => {
    const comisionId = await crearComision(institucionId, turnoId)
    const asig = await crearAsignacion(institucionId, unidadId, turnoId, comisionId)
    const dist = await crearDistribucion(institucionId, {
      asignacionId: asig.id, version: 1, fecha_vigencia_desde: "2026-01-01",
    })
    const moduloLunes  = await crearModulo(institucionId, "LUNES", 480, 520)
    const moduloMartes = await crearModulo(institucionId, "MARTES", 480, 520)

    const esperadasLunes  = contarDiasSemana(desde, hasta, DIA_JS.LUNES)
    const esperadasMartes = contarDiasSemana(desde, hasta, DIA_JS.MARTES)

    const r1 = await asignarModulos(dist.id, institucionId, { modulos: [moduloLunes.id] })
    expect(r1.clasesCreadas).toBe(esperadasLunes)

    const r2 = await asignarModulos(dist.id, institucionId, { modulos: [moduloLunes.id] })
    expect(r2.clasesCreadas).toBe(0)
    expect(r2.clasesSuspendidas).toBe(0)
    expect(await prisma.claseProgramada.count({ where: { asignacionId: asig.id } })).toBe(esperadasLunes)

    const r3 = await asignarModulos(dist.id, institucionId, { modulos: [moduloMartes.id] })
    expect(r3.clasesSuspendidas).toBe(esperadasLunes)
    expect(r3.clasesCreadas).toBe(esperadasMartes)

    const lunesTrasR3 = await prisma.claseProgramada.findMany({
      where: { asignacionId: asig.id, moduloId: moduloLunes.id },
    })
    expect(lunesTrasR3).toHaveLength(esperadasLunes)
    expect(lunesTrasR3.every(c => c.estado === "SUSPENDIDA" && c.causa === "CAMBIO_DISTRIBUCION")).toBe(true)

    const martesTrasR3 = await prisma.claseProgramada.findMany({
      where: { asignacionId: asig.id, moduloId: moduloMartes.id },
    })
    expect(martesTrasR3).toHaveLength(esperadasMartes)
    expect(martesTrasR3.every(c => c.estado === "PROGRAMADA" && c.causa === "NINGUNA")).toBe(true)

    const r4 = await asignarModulos(dist.id, institucionId, { modulos: [moduloLunes.id] })
    expect(r4.clasesSuspendidas).toBe(esperadasMartes)
    expect(r4.clasesCreadas).toBe(0)

    const lunesFinal = await prisma.claseProgramada.findMany({
      where: { asignacionId: asig.id, moduloId: moduloLunes.id },
    })
    expect(lunesFinal).toHaveLength(esperadasLunes)
    expect(lunesFinal.every(c => c.estado === "PROGRAMADA" && c.causa === "NINGUNA")).toBe(true)

    const totalClases = await prisma.claseProgramada.count({ where: { asignacionId: asig.id } })
    expect(totalClases).toBe(esperadasLunes + esperadasMartes)
  })

  it("nuevaVersionDistribucion cierra la versión vieja, suspende clases futuras, y la nueva versión reactiva sin duplicar al completarse", async () => {
    const asig = await crearAsignacion(institucionId, unidadId, turnoId)
    const dist = await crearDistribucion(institucionId, {
      asignacionId: asig.id, version: 1, fecha_vigencia_desde: "2026-01-01",
    })
    const moduloLunes = await crearModulo(institucionId, "LUNES", 700, 740)
    await asignarModulos(dist.id, institucionId, { modulos: [moduloLunes.id] })

    const hoy = new Date()
    hoy.setUTCHours(0, 0, 0, 0)
    const esperadasFuturas = contarDiasSemana(hoy, hasta, DIA_JS.LUNES)
    const esperadasTotal   = contarDiasSemana(desde, hasta, DIA_JS.LUNES)

    const rNueva = await nuevaVersionDistribucion(dist.id, institucionId)
    expect(rNueva.ok).toBe(true)
    expect(rNueva.clasesSuspendidas).toBe(esperadasFuturas)

    const vieja = await prisma.distribucionHoraria.findUnique({ where: { id: dist.id } })
    expect(vieja?.estado).toBe("INACTIVO")
    expect(vieja?.activo).toBe(false)

    const futurasSuspendidas = await prisma.claseProgramada.count({
      where: {
        asignacionId: asig.id, fecha: { gte: hoy },
        estado: "SUSPENDIDA", causa: "CAMBIO_DISTRIBUCION",
      },
    })
    expect(futurasSuspendidas).toBe(esperadasFuturas)

    const rAsignar = await asignarModulos(rNueva.nuevaVersionId, institucionId, { modulos: [moduloLunes.id] })
    expect(rAsignar.clasesCreadas).toBe(0)

    const futurasFinal = await prisma.claseProgramada.findMany({
      where: { asignacionId: asig.id, fecha: { gte: hoy } },
    })
    expect(futurasFinal).toHaveLength(esperadasFuturas)
    expect(futurasFinal.every(c => c.estado === "PROGRAMADA" && c.causa === "NINGUNA")).toBe(true)

    const totalFinal = await prisma.claseProgramada.count({ where: { asignacionId: asig.id } })
    expect(totalFinal).toBe(esperadasTotal)
  })
})