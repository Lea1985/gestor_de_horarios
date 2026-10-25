// tests/vinculoIncidencia.test.ts
//
// vincularIncidencia / desvincularIncidencia (lib/services/claseProgramadaService.ts):
// solo se vinculan clases vivas (no FIN_ASIGNACION ni CAMBIO_DISTRIBUCION) y
// al desvincular, las DICTADA pierden el vínculo sin cambiar de estado ni
// volver a resolverse.
//
// Llama al servicio directo contra gestor_test, con fixtures propios y
// limpieza al final.

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { randomUUID } from "crypto"
import { EstadoClase, Causa } from "@prisma/client"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { claseProgramadaService } from "../lib/services/claseProgramadaService"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

let institucionId: number
let unidadId: number
let turnoId: number
let itemId: number

async function nuevaAsignacion() {
  return prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId,
      identificadorEstructural: `VINC-${randomUUID()}`,
      fecha_inicio: d("2026-01-01"),
    },
  })
}

async function nuevaIncidencia(asignacionId: number, desde: string, hasta: string) {
  return prisma.incidencia.create({
    data: { asignacionId, codigarioItemId: itemId, fecha_desde: d(desde), fecha_hasta: d(hasta) },
  })
}

async function nuevaClase(asignacionId: number, fecha: string, estado: EstadoClase, causa: Causa, incidenciaId?: number) {
  return prisma.claseProgramada.create({
    data: {
      institucionId, asignacionId, unidadId, moduloId: null, fecha: d(fecha),
      estado, causa, incidenciaId: incidenciaId ?? null,
    },
  })
}

const leer = (id: number) => prisma.claseProgramada.findUniqueOrThrow({ where: { id } })

describe("vincularIncidencia / desvincularIncidencia", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    const inst = await createTestInstitucion()
    institucionId = inst.id
    turnoId = (await prisma.turno.create({
      data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: 450, horaFin: 720 },
    })).id
    unidadId = (await prisma.unidadOrganizativa.create({
      data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` },
    })).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `C-${randomUUID()}` } })
    itemId = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "LIC", nombre: "Licencia" },
    })).id
  })

  afterAll(async () => {
    if (!institucionId) return
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    await prisma.incidencia.deleteMany({ where: { asignacion: { institucionId } } })
    await prisma.codigarioItem.deleteMany({ where: { codigario: { institucionId } } })
    await prisma.codigario.deleteMany({ where: { institucionId } })
    await prisma.asignacion.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  it("vincula PROGRAMADA, DICTADA y CALENDARIO_ESCOLAR; no vincula FIN_ASIGNACION ni CAMBIO_DISTRIBUCION", async () => {
    const a = await nuevaAsignacion()
    const inc = await nuevaIncidencia(a.id, "2026-10-19", "2026-10-23")
    const programada = await nuevaClase(a.id, "2026-10-19", EstadoClase.PROGRAMADA, Causa.NINGUNA)
    const dictada    = await nuevaClase(a.id, "2026-10-20", EstadoClase.DICTADA, Causa.NINGUNA)
    const feriado    = await nuevaClase(a.id, "2026-10-21", EstadoClase.SUSPENDIDA, Causa.CALENDARIO_ESCOLAR)
    const cambio     = await nuevaClase(a.id, "2026-10-22", EstadoClase.SUSPENDIDA, Causa.CAMBIO_DISTRIBUCION)
    const fin        = await nuevaClase(a.id, "2026-10-23", EstadoClase.SUSPENDIDA, Causa.FIN_ASIGNACION)

    const { ids } = await claseProgramadaService.vincularIncidencia({
      asignacionId: a.id, incidenciaId: inc.id, desde: d("2026-10-19"), hasta: d("2026-10-23"),
    })

    expect(ids.sort()).toEqual([programada.id, dictada.id, feriado.id].sort())
    expect((await leer(programada.id)).incidenciaId).toBe(inc.id)
    expect((await leer(dictada.id)).incidenciaId).toBe(inc.id)
    expect((await leer(feriado.id)).incidenciaId).toBe(inc.id)
    expect((await leer(cambio.id)).incidenciaId).toBe(null)
    expect((await leer(fin.id)).incidenciaId).toBe(null)
  })

  it("desvincular: la DICTADA pierde el vínculo sin cambiar estado ni versión, y no se devuelve", async () => {
    const a = await nuevaAsignacion()
    const inc = await nuevaIncidencia(a.id, "2026-10-19", "2026-10-20")
    const suspendida = await nuevaClase(a.id, "2026-10-19", EstadoClase.SUSPENDIDA, Causa.INCIDENCIA, inc.id)
    const dictada    = await nuevaClase(a.id, "2026-10-20", EstadoClase.DICTADA, Causa.NINGUNA, inc.id)

    const { ids } = await claseProgramadaService.desvincularIncidencia(inc.id)

    expect(ids).toEqual([suspendida.id])
    expect((await leer(suspendida.id)).incidenciaId).toBe(null)
    const dictadaDespues = await leer(dictada.id)
    expect(dictadaDespues.incidenciaId).toBe(null)
    expect(dictadaDespues.estado).toBe(EstadoClase.DICTADA)
    expect(dictadaDespues.causa).toBe(Causa.NINGUNA)
    expect(dictadaDespues.versionResolucion).toBe(dictada.versionResolucion)
  })

  it("desvincular: la no dictada pasa a la incidencia reclamante; la DICTADA queda sin vínculo", async () => {
    const a = await nuevaAsignacion()
    const padre = await nuevaIncidencia(a.id, "2026-10-01", "2026-10-31")
    const hija  = await nuevaIncidencia(a.id, "2026-10-19", "2026-10-20")
    const suspendida = await nuevaClase(a.id, "2026-10-19", EstadoClase.SUSPENDIDA, Causa.INCIDENCIA, hija.id)
    const dictada    = await nuevaClase(a.id, "2026-10-20", EstadoClase.DICTADA, Causa.NINGUNA, hija.id)

    const { ids } = await claseProgramadaService.desvincularIncidencia(hija.id)

    expect(ids).toEqual([suspendida.id])
    expect((await leer(suspendida.id)).incidenciaId).toBe(padre.id)
    expect((await leer(dictada.id)).incidenciaId).toBe(null)
  })
})
