// tests/nuevaVersionDistribucion.test.ts
//
// nuevaVersionDistribucion (Fase 3c): la versión nueva nace con una copia de
// los módulos de la anterior y rige desde la fecha elegida. Crearla es un
// no-op para las clases y los reemplazos; el horario nuevo se carga después
// con "Editar" sobre la nueva versión, que rige desde su inicio.
//
// Contra gestor_test, usecases directos, reloj simulado solo para Date:
// jueves 22/10/2026, 10:00 AR. Distribución desde el lunes 05/10, período
// hasta el 30/11.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { asignarModulos } from "../lib/usecases/distribuciones/asignarModulos"
import {
  nuevaVersionDistribucion,
  FechaDesdeInvalidaError,
} from "../lib/usecases/distribuciones/nuevaVersionDistribucion"
import { crearReemplazo } from "../lib/usecases/reemplazos/crearReemplazo"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (f: Date) => f.toISOString().slice(0, 10)

let institucionId: number
let unidadId: number
let turnoId: number
let comisionId: number
let lunes: number
let martes: number
let itemPaga: number
let suplente: number

async function asignacionConLunes(licencia = false) {
  const a = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId, comisionId,
      identificadorEstructural: `NV-${randomUUID()}`, fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-10-05") },
  })
  if (licencia) {
    await prisma.incidencia.create({
      data: { asignacionId: a.id, codigarioItemId: itemPaga, fecha_desde: d("2026-10-26"), fecha_hasta: d("2026-11-30") },
    })
  }
  await asignarModulos(dist.id, institucionId, { modulos: [lunes] })
  return { asignacionId: a.id, distribucionId: dist.id }
}

async function foto(asignacionId: number) {
  return {
    clases: await prisma.claseProgramada.findMany({
      where: { asignacionId }, orderBy: { id: "asc" },
      select: { id: true, estado: true, causa: true, incidenciaId: true, versionResolucion: true },
    }),
    reemplazos: await prisma.reemplazo.findMany({
      where: { clase: { asignacionId } }, orderBy: { id: "asc" },
      select: { id: true, activo: true, deletedAt: true },
    }),
  }
}

describe("nuevaVersionDistribucion — copia de módulos y desde elegido", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-22T13:00:00.000Z"))
    institucionId = (await createTestInstitucion()).id
    turnoId = (await prisma.turno.create({ data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 } })).id
    unidadId = (await prisma.unidadOrganizativa.create({ data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` } })).id
    const curso = await prisma.curso.create({ data: { institucionId, nombre: `Curso-${randomUUID()}` } })
    comisionId = (await prisma.comision.create({ data: { institucionId, cursoId: curso.id, turnoId, nombre: `Com-${randomUUID()}` } })).id
    await prisma.periodoOperativo.create({
      data: { institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO", fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-11-30") },
    })
    lunes = (await prisma.moduloHorario.create({ data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 } })).id
    martes = (await prisma.moduloHorario.create({ data: { institucionId, dia_semana: "MARTES", hora_desde: 480, hora_hasta: 520 } })).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `C-${randomUUID()}` } })
    itemPaga = (await prisma.codigarioItem.create({ data: { codigarioId: codigario.id, codigo: "PAGA", nombre: "Paga" } })).id
    suplente = (await prisma.agente.create({
      data: { institucionId, nombre: "Suplente", apellido: "Version", documento: `DOC-${randomUUID()}`, email: `s-${randomUUID()}@test.dev`, estado: "ACTIVO" },
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
    await prisma.asignacion.deleteMany({ where: { institucionId } })
    await prisma.moduloHorario.deleteMany({ where: { institucionId } })
    await prisma.agente.deleteMany({ where: { institucionId } })
    await prisma.comision.deleteMany({ where: { institucionId } })
    await prisma.curso.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  it("crear la copia es un no-op: nada cambia y ningún reemplazo se anula", async () => {
    const { asignacionId, distribucionId } = await asignacionConLunes(true)
    const futuras = await prisma.claseProgramada.findMany({ where: { asignacionId, fecha: { gte: d("2026-10-26") } }, orderBy: { fecha: "asc" } })
    for (const c of futuras.slice(0, 3)) {
      await crearReemplazo(institucionId, { claseId: c.id, asignacionTitularId: asignacionId, agenteSuplenteId: suplente })
    }
    const antes = await foto(asignacionId)

    const r = await nuevaVersionDistribucion(distribucionId, institucionId)
    expect(r.ok).toBe(true)
    expect(r.desde).toBe("2026-10-22")
    expect(r.clasesCreadas).toBe(0)
    expect(r.clasesActualizadas).toBe(0)
    expect(r.reemplazosAnulados).toEqual([])
    expect(await foto(asignacionId)).toEqual(antes)

    const vieja = await prisma.distribucionHoraria.findUniqueOrThrow({ where: { id: distribucionId } })
    expect(vieja.estado).toBe("INACTIVO")
    expect(vieja.fecha_vigencia_hasta?.toISOString()).toBe("2026-10-21T23:59:59.999Z")
    const nueva = await prisma.distribucionHoraria.findUniqueOrThrow({
      where: { id: r.nuevaVersionId! }, include: { distribucionModulos: true },
    })
    expect(nueva.version).toBe(2)
    expect(iso(nueva.fecha_vigencia_desde)).toBe("2026-10-22")
    expect(nueva.distribucionModulos.map(m => m.moduloHorarioId)).toEqual([lunes])
  })

  it("con desde elegido, Editar sobre la nueva versión rige desde su inicio y la anterior conserva su tramo", async () => {
    const { asignacionId, distribucionId } = await asignacionConLunes()
    const r = await nuevaVersionDistribucion(distribucionId, institucionId, { desde: "2026-11-02" })
    expect(r.ok).toBe(true)

    // Editar sobre v2 (desde por defecto = hoy, se acota al inicio de v2).
    const e = await asignarModulos(r.nuevaVersionId!, institucionId, { modulos: [martes] })
    expect(e.ok).toBe(true)
    expect(e.desde).toBe("2026-11-02")

    const clases = await prisma.claseProgramada.findMany({ where: { asignacionId }, orderBy: { fecha: "asc" } })
    const de = (f: string) => clases.find(c => iso(c.fecha) === f)
    expect(`${de("2026-10-26")?.estado}/${de("2026-10-26")?.causa}`).toBe("PROGRAMADA/NINGUNA") // rige v1
    for (const f of ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]) {
      expect(`${de(f)?.estado}/${de(f)?.causa}`).toBe("SUSPENDIDA/CAMBIO_DISTRIBUCION")
    }
    expect(de("2026-10-27")).toBeUndefined() // martes antes de v2: no se genera
    for (const f of ["2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24"]) {
      expect(`${de(f)?.estado}/${de(f)?.causa}`).toBe("PROGRAMADA/NINGUNA")
    }
  })

  it("desde que no es posterior al inicio de la versión actual se rechaza", async () => {
    const { distribucionId } = await asignacionConLunes()
    await expect(nuevaVersionDistribucion(distribucionId, institucionId, { desde: "2026-10-05" }))
      .rejects.toBeInstanceOf(FechaDesdeInvalidaError)
    await expect(nuevaVersionDistribucion(distribucionId, institucionId, { desde: "no-es-fecha" }))
      .rejects.toBeInstanceOf(FechaDesdeInvalidaError)
  })
})
