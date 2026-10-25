// tests/crearReemplazo.test.ts
//
// crearReemplazo (lib/usecases/reemplazos/crearReemplazo.ts): rechaza clases
// muertas (el motor las resuelve como FIN_ASIGNACION o CAMBIO_DISTRIBUCION)
// y, si el cuerpo no trae incidenciaId, lo toma de la clase (bug 13). Un
// incidenciaId explícito se guarda tal cual, sin validarlo.
//
// Llama al usecase directo contra gestor_test, con fixtures propios y
// limpieza al final. El reloj se fija solo para Date (22/10/2026, 10:00 AR).

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import { EstadoClase, Causa } from "@prisma/client"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { crearReemplazo, ClaseNoVigenteError } from "../lib/usecases/reemplazos/crearReemplazo"
import { asignacionRepository } from "../lib/repositories/asignacionRepository"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

let institucionId: number
let unidadId: number
let turnoId: number
let moduloEnDistribucion: number
let moduloQuitado: number
let itemId: number
let agenteSuplenteId: number

async function nuevaAsignacionConDistribucion() {
  const a = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId,
      identificadorEstructural: `CREE-${randomUUID()}`,
      fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-03-01") },
  })
  await prisma.distribucionModulo.create({
    data: { distribucionHorariaId: dist.id, moduloHorarioId: moduloEnDistribucion },
  })
  return a
}

async function nuevaIncidencia(asignacionId: number, fecha: string) {
  return prisma.incidencia.create({
    data: { asignacionId, codigarioItemId: itemId, fecha_desde: d(fecha), fecha_hasta: d(fecha) },
  })
}

async function nuevaClase(asignacionId: number, fecha: string, moduloId: number, incidenciaId?: number) {
  return prisma.claseProgramada.create({
    data: {
      institucionId, asignacionId, unidadId, moduloId, fecha: d(fecha),
      ...(incidenciaId
        ? { incidenciaId, estado: EstadoClase.SUSPENDIDA, causa: Causa.INCIDENCIA }
        : {}),
    },
  })
}

const reemplazosDe = (claseId: number) => prisma.reemplazo.count({ where: { claseId } })

describe("crearReemplazo — clases muertas e incidenciaId derivado", () => {
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
    await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO",
        fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-12-31"),
      },
    })
    moduloEnDistribucion = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "JUEVES", hora_desde: 480, hora_hasta: 520 },
    })).id
    moduloQuitado = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "VIERNES", hora_desde: 480, hora_hasta: 520 },
    })).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `C-${randomUUID()}` } })
    itemId = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "LIC", nombre: "Licencia" },
    })).id
    agenteSuplenteId = (await prisma.agente.create({
      data: {
        institucionId, nombre: "Suplente", apellido: "Crear Reemplazo",
        documento: `DOC-${randomUUID()}`, email: `sup-${randomUUID()}@test.dev`, estado: "ACTIVO",
      },
    })).id
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (!institucionId) return
    await prisma.reemplazo.deleteMany({ where: { clase: { institucionId } } })
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
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

  it("rechaza una clase cuyo módulo ya no está en la distribución (CAMBIO_DISTRIBUCION) y no crea el reemplazo", async () => {
    const a = await nuevaAsignacionConDistribucion()
    const inc = await nuevaIncidencia(a.id, "2026-10-30")
    const clase = await nuevaClase(a.id, "2026-10-30", moduloQuitado, inc.id)
    await expect(crearReemplazo(institucionId, {
      claseId: clase.id, asignacionTitularId: a.id, agenteSuplenteId,
    })).rejects.toBeInstanceOf(ClaseNoVigenteError)
    expect(await reemplazosDe(clase.id)).toBe(0)
  })

  it("rechaza una clase de una asignación dada de baja (FIN_ASIGNACION)", async () => {
    const a = await nuevaAsignacionConDistribucion()
    const clase = await nuevaClase(a.id, "2026-10-29", moduloEnDistribucion)
    await asignacionRepository.softDelete(a.id, institucionId)
    await expect(crearReemplazo(institucionId, {
      claseId: clase.id, asignacionTitularId: a.id, agenteSuplenteId,
    })).rejects.toBeInstanceOf(ClaseNoVigenteError)
    expect(await reemplazosDe(clase.id)).toBe(0)
  })

  it("sin incidenciaId en el cuerpo, toma el de la clase y la clase queda REEMPLAZADA", async () => {
    const a = await nuevaAsignacionConDistribucion()
    const inc = await nuevaIncidencia(a.id, "2026-10-29")
    const clase = await nuevaClase(a.id, "2026-10-29", moduloEnDistribucion, inc.id)
    const r = await crearReemplazo(institucionId, {
      claseId: clase.id, asignacionTitularId: a.id, agenteSuplenteId,
    })
    expect(r?.incidenciaId).toBe(inc.id)
    const despues = await prisma.claseProgramada.findUniqueOrThrow({ where: { id: clase.id } })
    expect(despues.estado).toBe(EstadoClase.REEMPLAZADA)
    expect(despues.causa).toBe(Causa.INCIDENCIA)
  })

  it("con incidenciaId explícito distinto al de la clase, se guarda tal cual (sin validar)", async () => {
    const a = await nuevaAsignacionConDistribucion()
    const incClase = await nuevaIncidencia(a.id, "2026-10-29")
    const incOtra = await nuevaIncidencia(a.id, "2026-11-05")
    const clase = await nuevaClase(a.id, "2026-10-29", moduloEnDistribucion, incClase.id)
    const r = await crearReemplazo(institucionId, {
      claseId: clase.id, asignacionTitularId: a.id, agenteSuplenteId, incidenciaId: incOtra.id,
    })
    expect(r?.incidenciaId).toBe(incOtra.id)
  })

  it("clase sin incidencia y sin incidenciaId en el cuerpo -> incidenciaId null", async () => {
    const a = await nuevaAsignacionConDistribucion()
    const clase = await nuevaClase(a.id, "2026-10-29", moduloEnDistribucion)
    const r = await crearReemplazo(institucionId, {
      claseId: clase.id, asignacionTitularId: a.id, agenteSuplenteId,
    })
    expect(r?.incidenciaId).toBe(null)
  })
})
