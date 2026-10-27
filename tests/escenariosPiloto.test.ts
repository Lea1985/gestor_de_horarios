// tests/escenariosPiloto.test.ts
//
// Escenarios del piloto de Ceferino para el motor de clases (Fase 2 del plan
// docs/plan-correccion-motor-clases-2026-10-22.md): licencia sobre clases dadas
// de baja, calendario sobre FIN_ASIGNACION, feriado según el artículo que paga
// (reglas 2 y 3), licencias encadenadas (regla 4) y reemplazo bajo licencia hija.
//
// Llama a los usecases directo (sin servidor HTTP) contra gestor_test, con
// fixtures propios y limpieza al final. Reloj simulado solo para Date: "hoy"
// es el 22/10/2026 a las 10:00 AR; todas las clases son de noviembre (futuras).
// Cada escenario usa fechas propias porque un evento de calendario afecta a
// todas las clases de la institución en esa fecha.
//
// crearReemplazo sobre una clase muerta (FIN_ASIGNACION, CAMBIO_DISTRIBUCION)
// ya está cubierto en tests/crearReemplazo.test.ts; acá solo se agrega el caso
// de la licencia hija.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import { EstadoClase, Causa } from "@prisma/client"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { crearIncidencia } from "../lib/usecases/incidencias/crearIncidencia"
import { crearReemplazo, ClaseNoVigenteError } from "../lib/usecases/reemplazos/crearReemplazo"
import { reasignarReemplazoAIncidencia } from "../lib/usecases/reemplazos/reasignarReemplazoAIncidencia"
import { crearCalendarioEscolar } from "../lib/usecases/calendarioEscolar/crearCalendarioEscolar"
import { eliminarCalendarioEscolar } from "../lib/usecases/calendarioEscolar/eliminarCalendarioEscolar"
import { eliminarAsignacion } from "../lib/usecases/asignaciones/eliminarAsignacion"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const { PROGRAMADA, SUSPENDIDA, REEMPLAZADA } = EstadoClase

let institucionId: number
let periodoId: number
let unidadId: number
let turnoId: number
let moduloVigente: number
let moduloQuitado: number
let itemPaga: number
let itemNoPaga: number
let suplente1: number
let suplente2: number

// Asignación con una distribución que contiene solo moduloVigente.
async function nuevaAsignacion() {
  const a = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId,
      identificadorEstructural: `PILOTO-${randomUUID()}`,
      fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-03-01") },
  })
  await prisma.distribucionModulo.create({
    data: { distribucionHorariaId: dist.id, moduloHorarioId: moduloVigente },
  })
  return a
}

async function nuevaClase(
  asignacionId: number, fecha: string, moduloId: number,
  estado: EstadoClase = PROGRAMADA, causa: Causa = Causa.NINGUNA,
) {
  return prisma.claseProgramada.create({
    data: { institucionId, asignacionId, unidadId, moduloId, fecha: d(fecha), estado, causa },
  })
}

const licencia = (asignacionId: number, desde: string, hasta: string, codigarioItemId: number, incidenciaPadreId?: number) =>
  crearIncidencia(institucionId, { asignacionId, fecha_desde: desde, fecha_hasta: hasta, codigarioItemId, incidenciaPadreId })

const feriado = (fecha: string) =>
  crearCalendarioEscolar(institucionId, {
    periodoOperativoId: periodoId, fecha, descripcion: `Feriado ${fecha}`, esFeriado: true, suspendeClases: true,
  })

const leer = (id: number) => prisma.claseProgramada.findUniqueOrThrow({ where: { id } })
const reemplazoActivo = (claseId: number) => prisma.reemplazo.findFirst({ where: { claseId, activo: true } })

async function esperarEstado(claseId: number, estado: EstadoClase, causa: Causa) {
  const c = await leer(claseId)
  expect({ estado: c.estado, causa: c.causa }).toEqual({ estado, causa })
  return c
}

describe("Escenarios del piloto — motor de clases", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-22T13:00:00.000Z"))
    const inst = await createTestInstitucion()
    institucionId = inst.id
    turnoId = (await prisma.turno.create({
      data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 },
    })).id
    unidadId = (await prisma.unidadOrganizativa.create({
      data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` },
    })).id
    periodoId = (await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO",
        fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-12-31"),
      },
    })).id
    moduloVigente = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 },
    })).id
    moduloQuitado = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "MARTES", hora_desde: 480, hora_hasta: 520 },
    })).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `C-${randomUUID()}` } })
    itemPaga = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "PAGA", nombre: "Artículo que paga", porcentajeComputable: 100 },
    })).id
    itemNoPaga = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "NOPAGA", nombre: "Artículo que no paga", porcentajeComputable: 0 },
    })).id
    const agente = (apellido: string) => prisma.agente.create({
      data: {
        institucionId, nombre: "Suplente", apellido,
        documento: `DOC-${randomUUID()}`, email: `sup-${randomUUID()}@test.dev`, estado: "ACTIVO",
      },
    })
    suplente1 = (await agente("Uno")).id
    suplente2 = (await agente("Dos")).id
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (!institucionId) return
    await prisma.reemplazo.deleteMany({ where: { clase: { institucionId } } })
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    await prisma.calendarioEscolar.deleteMany({ where: { institucionId } })
    await prisma.incidencia.updateMany({ where: { asignacion: { institucionId } }, data: { incidenciaPadreId: null } })
    await prisma.incidencia.deleteMany({ where: { asignacion: { institucionId } } })
    await prisma.codigarioItem.deleteMany({ where: { codigario: { institucionId } } })
    await prisma.codigario.deleteMany({ where: { institucionId } })
    await prisma.titularAsignacion.deleteMany({ where: { asignacion: { institucionId } } })
    await prisma.asignacion.deleteMany({ where: { institucionId } })
    await prisma.moduloHorario.deleteMany({ where: { institucionId } })
    await prisma.agente.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  it("1) licencia sobre una asignación con clases CAMBIO_DISTRIBUCION: esas no se vinculan ni se reviven, las demás sí", async () => {
    const a = await nuevaAsignacion()
    const viva1   = await nuevaClase(a.id, "2026-11-02", moduloVigente)
    const muerta1 = await nuevaClase(a.id, "2026-11-03", moduloQuitado, SUSPENDIDA, Causa.CAMBIO_DISTRIBUCION)
    const viva2   = await nuevaClase(a.id, "2026-11-04", moduloVigente)
    const muerta2 = await nuevaClase(a.id, "2026-11-05", moduloQuitado, SUSPENDIDA, Causa.CAMBIO_DISTRIBUCION)

    const inc = await licencia(a.id, "2026-11-02", "2026-11-05", itemPaga)

    for (const viva of [viva1, viva2]) {
      const c = await esperarEstado(viva.id, SUSPENDIDA, Causa.INCIDENCIA)
      expect(c.incidenciaId).toBe(inc.id)
    }
    for (const muerta of [muerta1, muerta2]) {
      const c = await esperarEstado(muerta.id, SUSPENDIDA, Causa.CAMBIO_DISTRIBUCION)
      expect(c.incidenciaId).toBe(null)
      expect(c.versionResolucion).toBe(muerta.versionResolucion)
    }
  })

  it("2) evento de calendario sobre una clase FIN_ASIGNACION: no pasa a CALENDARIO_ESCOLAR", async () => {
    const baja = await nuevaAsignacion()
    const claseBaja = await nuevaClase(baja.id, "2026-11-09", moduloVigente)
    await eliminarAsignacion(baja.id, institucionId)
    await esperarEstado(claseBaja.id, SUSPENDIDA, Causa.FIN_ASIGNACION)
    // Control: otra asignación viva el mismo día sí pasa a CALENDARIO_ESCOLAR.
    const viva = await nuevaAsignacion()
    const claseViva = await nuevaClase(viva.id, "2026-11-09", moduloVigente)

    const evento = await feriado("2026-11-09")

    const c = await esperarEstado(claseBaja.id, SUSPENDIDA, Causa.FIN_ASIGNACION)
    expect(c.calendarioEscolarId).toBe(null)
    const control = await esperarEstado(claseViva.id, SUSPENDIDA, Causa.CALENDARIO_ESCOLAR)
    expect(control.calendarioEscolarId).toBe(evento.id)
  })

  it("3) feriado con artículo que paga vs que no paga; al quitar el feriado vuelve sola a REEMPLAZADA", async () => {
    const aPaga = await nuevaAsignacion()
    const aNoPaga = await nuevaAsignacion()
    const clasePaga = await nuevaClase(aPaga.id, "2026-11-16", moduloVigente)
    const claseNoPaga = await nuevaClase(aNoPaga.id, "2026-11-16", moduloVigente)
    await licencia(aPaga.id, "2026-11-16", "2026-11-16", itemPaga)
    await licencia(aNoPaga.id, "2026-11-16", "2026-11-16", itemNoPaga)
    await crearReemplazo(institucionId, { claseId: clasePaga.id, asignacionTitularId: aPaga.id, agenteSuplenteId: suplente1 })
    await crearReemplazo(institucionId, { claseId: claseNoPaga.id, asignacionTitularId: aNoPaga.id, agenteSuplenteId: suplente2 })
    await esperarEstado(clasePaga.id, REEMPLAZADA, Causa.INCIDENCIA)
    await esperarEstado(claseNoPaga.id, REEMPLAZADA, Causa.INCIDENCIA)

    const evento = await feriado("2026-11-16")

    // Regla 2: paga -> sigue REEMPLAZADA con el reemplazo vigente.
    await esperarEstado(clasePaga.id, REEMPLAZADA, Causa.INCIDENCIA)
    expect(await reemplazoActivo(clasePaga.id)).not.toBeNull()
    // Regla 3: no paga -> SUSPENDIDA por calendario; la fila de Reemplazo no
    // se toca (decisión D), solo deja de estar vigente por el estado.
    const noPaga = await esperarEstado(claseNoPaga.id, SUSPENDIDA, Causa.CALENDARIO_ESCOLAR)
    expect(noPaga.calendarioEscolarId).toBe(evento.id)
    expect(await reemplazoActivo(claseNoPaga.id)).not.toBeNull()

    await eliminarCalendarioEscolar(evento.id, institucionId)

    const vuelta = await esperarEstado(claseNoPaga.id, REEMPLAZADA, Causa.INCIDENCIA)
    expect(vuelta.calendarioEscolarId).toBe(null)
    await esperarEstado(clasePaga.id, REEMPLAZADA, Causa.INCIDENCIA)
  })

  it("4) licencias encadenadas: cada reemplazo se evalúa con el artículo de su propia licencia", async () => {
    // Cadena A: padre paga, hija no paga. Cadena B: al revés. Feriados el 24
    // (solo padre) y el 25 (dentro de la hija).
    const cadena = async (itemPadre: number, itemHija: number) => {
      const a = await nuevaAsignacion()
      const clases: Record<string, number> = {}
      for (const dia of ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26"]) {
        clases[dia] = (await nuevaClase(a.id, dia, moduloVigente)).id
      }
      const padre = await licencia(a.id, "2026-11-23", "2026-11-26", itemPadre)
      for (const id of Object.values(clases)) {
        await crearReemplazo(institucionId, { claseId: id, asignacionTitularId: a.id, agenteSuplenteId: suplente1 })
      }
      // Falta el suplente: licencia hija y el reemplazo pasa a otro suplente.
      const hija = await licencia(a.id, "2026-11-25", "2026-11-26", itemHija, padre.id)
      for (const dia of ["2026-11-25", "2026-11-26"]) {
        await reasignarReemplazoAIncidencia(institucionId, {
          claseId: clases[dia], nuevaIncidenciaId: hija.id, asignacionTitularId: a.id, agenteSuplenteId: suplente2,
        })
      }
      return { clases, padre, hija }
    }
    const A = await cadena(itemPaga, itemNoPaga)
    const B = await cadena(itemNoPaga, itemPaga)

    await feriado("2026-11-24")
    await feriado("2026-11-25")

    // Día de la padre con feriado.
    await esperarEstado(A.clases["2026-11-24"], REEMPLAZADA, Causa.INCIDENCIA)
    await esperarEstado(B.clases["2026-11-24"], SUSPENDIDA, Causa.CALENDARIO_ESCOLAR)
    // Día de la hija con feriado.
    await esperarEstado(A.clases["2026-11-25"], SUSPENDIDA, Causa.CALENDARIO_ESCOLAR)
    await esperarEstado(B.clases["2026-11-25"], REEMPLAZADA, Causa.INCIDENCIA)
    // Sin feriado: rige la licencia, pague o no.
    for (const X of [A, B]) {
      await esperarEstado(X.clases["2026-11-23"], REEMPLAZADA, Causa.INCIDENCIA)
      await esperarEstado(X.clases["2026-11-26"], REEMPLAZADA, Causa.INCIDENCIA)
      // Cada reemplazo vigente queda atado a su propia licencia.
      expect((await reemplazoActivo(X.clases["2026-11-24"]))?.incidenciaId).toBe(X.padre.id)
      expect((await reemplazoActivo(X.clases["2026-11-25"]))?.incidenciaId).toBe(X.hija.id)
      expect((await leer(X.clases["2026-11-25"])).incidenciaId).toBe(X.hija.id)
      // El reemplazo de la padre en los días de la hija queda en pausa (Fase 4, B).
      for (const dia of ["2026-11-25", "2026-11-26"]) {
        const dePadre = await prisma.reemplazo.findFirstOrThrow({
          where: { claseId: X.clases[dia], incidenciaId: X.padre.id },
        })
        expect({ activo: dePadre.activo, deletedAt: dePadre.deletedAt }).toEqual({ activo: false, deletedAt: null })
      }
    }
  })

  it("5) licencia hija: crearReemplazo toma el incidenciaId de la hija y rechaza la clase muerta de su rango", async () => {
    // La hija empieza un día después de la padre solo para que haya una clase
    // de la padre fuera de la hija (desde la Fase 4 podría empezar el mismo día).
    const a = await nuevaAsignacion()
    await nuevaClase(a.id, "2026-11-30", moduloVigente)
    const viva   = await nuevaClase(a.id, "2026-12-01", moduloVigente)
    const muerta = await nuevaClase(a.id, "2026-12-02", moduloQuitado, SUSPENDIDA, Causa.CAMBIO_DISTRIBUCION)
    await nuevaClase(a.id, "2026-12-03", moduloVigente)
    const padre = await licencia(a.id, "2026-11-30", "2026-12-03", itemPaga)
    const hija  = await licencia(a.id, "2026-12-01", "2026-12-02", itemPaga, padre.id)
    expect((await leer(viva.id)).incidenciaId).toBe(hija.id)
    expect((await leer(muerta.id)).incidenciaId).toBe(null)

    const r = await crearReemplazo(institucionId, {
      claseId: viva.id, asignacionTitularId: a.id, agenteSuplenteId: suplente1,
    })
    expect(r?.incidenciaId).toBe(hija.id)
    await esperarEstado(viva.id, REEMPLAZADA, Causa.INCIDENCIA)

    await expect(crearReemplazo(institucionId, {
      claseId: muerta.id, asignacionTitularId: a.id, agenteSuplenteId: suplente1,
    })).rejects.toBeInstanceOf(ClaseNoVigenteError)
  })
})
