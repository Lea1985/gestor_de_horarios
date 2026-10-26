// tests/terminadasDeHoy.test.ts
//
// Lo ya terminado no se reescribe por un cambio que rige desde hoy (hallazgo
// de la prueba manual en la copia de Ceferino, 26/10): una clase de hoy cuyo
// horario ya terminó en la hora local de la institución no se toca con
// "Editar desde hoy" ni con las bajas/reactivaciones del mismo día, salvo
// reescribirPasado explícito. Única excepción: PROGRAMADA -> DICTADA.
//
// Contra gestor_test, usecases directos, reloj simulado solo para Date:
// jueves 22/10/2026 a las 14:30 AR.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { asignarModulos } from "../lib/usecases/distribuciones/asignarModulos"
import { eliminarAsignacion } from "../lib/usecases/asignaciones/eliminarAsignacion"
import { reactivarAsignacion } from "../lib/usecases/asignaciones/reactivarAsignacion"
import { crearIncidencia } from "../lib/usecases/incidencias/crearIncidencia"
import { crearReemplazo } from "../lib/usecases/reemplazos/crearReemplazo"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const h = (hora: number, minuto = 0) => hora * 60 + minuto
const A_LAS_1430 = new Date("2026-10-22T17:30:00.000Z") // jueves 22/10, 14:30 AR
const A_LAS_1800 = new Date("2026-10-22T21:00:00.000Z") // jueves 22/10, 18:00 AR
const HOY = "2026-10-22"

let institucionId: number
let unidadId: number
let turnoId: number
let comisionId: number
let articulo: number
let suplente: number
const m = { lun0800: 0, jue0800: 0, jue0900: 0, jue1600: 0, jue1900: 0 }

async function nuevaAsignacion(modulos: number[]) {
  const a = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId, comisionId,
      identificadorEstructural: `TERM-${randomUUID()}`, fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-10-01") },
  })
  await asignarModulos(dist.id, institucionId, { modulos })
  return { asignacionId: a.id, distribucionId: dist.id }
}

async function clase(asignacionId: number, moduloId: number, fecha: string) {
  return prisma.claseProgramada.findFirst({
    where:   { asignacionId, moduloId, fecha: d(fecha) },
    include: { reemplazos: { where: { activo: true } } },
  })
}
async function estado(asignacionId: number, moduloId: number, fecha: string) {
  const c = await clase(asignacionId, moduloId, fecha)
  return c ? `${c.estado}/${c.causa}` : null
}

describe("Clases de hoy ya terminadas frente a cambios que rigen desde hoy", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(A_LAS_1430)
    institucionId = (await createTestInstitucion()).id
    turnoId = (await prisma.turno.create({ data: { institucionId, nombre: `T-${randomUUID()}`, horaInicio: h(7, 30), horaFin: h(23) } })).id
    unidadId = (await prisma.unidadOrganizativa.create({ data: { institucionId, codigoUnidad: 1, nombre: `U-${randomUUID()}` } })).id
    const curso = await prisma.curso.create({ data: { institucionId, nombre: `Curso-${randomUUID()}` } })
    comisionId = (await prisma.comision.create({ data: { institucionId, cursoId: curso.id, turnoId, nombre: `Com-${randomUUID()}` } })).id
    await prisma.periodoOperativo.create({
      data: { institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO", fecha_desde: d("2026-03-02"), fecha_hasta: d("2026-12-31") },
    })
    const modulo = (dia: "LUNES" | "JUEVES", desde: number, hasta: number) =>
      prisma.moduloHorario.create({ data: { institucionId, dia_semana: dia, hora_desde: desde, hora_hasta: hasta } })
    m.lun0800 = (await modulo("LUNES", h(8), h(8, 40))).id
    m.jue0800 = (await modulo("JUEVES", h(8), h(8, 40))).id
    m.jue0900 = (await modulo("JUEVES", h(9), h(9, 40))).id
    m.jue1600 = (await modulo("JUEVES", h(16), h(16, 40))).id
    m.jue1900 = (await modulo("JUEVES", h(19), h(19, 40))).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `Cod-${randomUUID()}` } })
    articulo = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "LIC", nombre: "Licencia que paga", porcentajeComputable: 100 },
    })).id
    suplente = (await prisma.agente.create({
      data: { institucionId, nombre: "Suplente", apellido: "Test", documento: `DOC-${randomUUID()}`, email: `s-${randomUUID()}@test.dev`, estado: "ACTIVO" },
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
    await prisma.comision.deleteMany({ where: { institucionId } })
    await prisma.curso.deleteMany({ where: { institucionId } })
    await prisma.unidadOrganizativa.deleteMany({ where: { institucionId } })
    await prisma.turno.deleteMany({ where: { institucionId } })
    await prisma.periodoOperativo.deleteMany({ where: { institucionId } })
    await prisma.institucion.delete({ where: { id: institucionId } })
  })

  it("Editar desde hoy quitando módulos: la terminada (DICTADA o PROGRAMADA sin consolidar) queda DICTADA sin confirmación; la que no terminó pasa a CAMBIO_DISTRIBUCION", async () => {
    vi.setSystemTime(A_LAS_1430)
    const { asignacionId, distribucionId } = await nuevaAsignacion([m.lun0800, m.jue0800, m.jue0900, m.jue1600])
    expect(await estado(asignacionId, m.jue0800, HOY)).toBe("DICTADA/NINGUNA")
    // La de 9:00 terminó pero el control diario todavía no la consolidó.
    await prisma.claseProgramada.updateMany({
      where: { asignacionId, moduloId: m.jue0900, fecha: d(HOY) },
      data:  { estado: "PROGRAMADA", causa: "NINGUNA" },
    })

    const r = await asignarModulos(distribucionId, institucionId, { modulos: [m.lun0800] })

    expect(r).toMatchObject({ ok: true, desde: HOY })
    expect(r).not.toHaveProperty("requiereConfirmacion")
    expect(await estado(asignacionId, m.jue0800, HOY)).toBe("DICTADA/NINGUNA")
    expect(await estado(asignacionId, m.jue0900, HOY)).toBe("DICTADA/NINGUNA")
    expect(await estado(asignacionId, m.jue1600, HOY)).toBe("SUSPENDIDA/CAMBIO_DISTRIBUCION")
    expect(await estado(asignacionId, m.jue0800, "2026-10-15")).toBe("DICTADA/NINGUNA")
    expect(await estado(asignacionId, m.jue0800, "2026-10-29")).toBe("SUSPENDIDA/CAMBIO_DISTRIBUCION")
  })

  it("Editar desde hoy agregando módulos: no crea la clase de hoy cuyo horario ya terminó; sí la que no terminó y las futuras", async () => {
    vi.setSystemTime(A_LAS_1430)
    const { asignacionId, distribucionId } = await nuevaAsignacion([m.lun0800])

    const r = await asignarModulos(distribucionId, institucionId, { modulos: [m.lun0800, m.jue0800, m.jue1600] })

    expect(r).toMatchObject({ ok: true, desde: HOY })
    expect(r).not.toHaveProperty("requiereConfirmacion")
    expect(await clase(asignacionId, m.jue0800, HOY)).toBeNull()
    expect(await estado(asignacionId, m.jue1600, HOY)).toBe("PROGRAMADA/NINGUNA")
    expect(await estado(asignacionId, m.jue0800, "2026-10-29")).toBe("PROGRAMADA/NINGUNA")
    expect(await clase(asignacionId, m.jue0800, "2026-10-15")).toBeNull()
  })

  it("Editar desde hoy quitando el módulo de una REEMPLAZADA de hoy ya terminada: queda igual y su reemplazo no se anula", async () => {
    vi.setSystemTime(A_LAS_1430)
    const { asignacionId, distribucionId } = await nuevaAsignacion([m.lun0800, m.jue0800])
    await crearIncidencia(institucionId, {
      asignacionId, fecha_desde: "2026-10-20", fecha_hasta: "2026-10-23", codigarioItemId: articulo,
    })
    const deHoy = await clase(asignacionId, m.jue0800, HOY)
    await crearReemplazo(institucionId, { claseId: deHoy!.id, asignacionTitularId: asignacionId, agenteSuplenteId: suplente })
    expect(await estado(asignacionId, m.jue0800, HOY)).toBe("REEMPLAZADA/INCIDENCIA")

    const r = await asignarModulos(distribucionId, institucionId, { modulos: [m.lun0800] })

    expect(r).toMatchObject({ ok: true })
    expect(r).not.toHaveProperty("requiereConfirmacion")
    const despues = await clase(asignacionId, m.jue0800, HOY)
    expect(`${despues!.estado}/${despues!.causa}`).toBe("REEMPLAZADA/INCIDENCIA")
    expect(despues!.reemplazos).toHaveLength(1)
    expect(despues!.reemplazos[0].agenteSuplenteId).toBe(suplente)
    expect(await estado(asignacionId, m.jue0800, "2026-10-29")).toBe("SUSPENDIDA/CAMBIO_DISTRIBUCION")
  })

  it("Editar desde el inicio (anterior a hoy) sigue pidiendo confirmación por las dictadas anteriores, sin aplicar nada", async () => {
    vi.setSystemTime(A_LAS_1430)
    const { asignacionId, distribucionId } = await nuevaAsignacion([m.lun0800, m.jue0800, m.jue1600])

    const r = await asignarModulos(distribucionId, institucionId, { modulos: [m.lun0800], desde: "2026-10-01" })

    expect(r).toMatchObject({ ok: false, requiereConfirmacion: true })
    const dictadas = "aviso" in r && r.aviso ? r.aviso.dictadasAReescribir.map(c => c.fecha) : []
    expect(dictadas).toContain("2026-10-15")
    expect(await estado(asignacionId, m.jue0800, "2026-10-15")).toBe("DICTADA/NINGUNA")
    expect(await estado(asignacionId, m.jue1600, HOY)).toBe("PROGRAMADA/NINGUNA")
  })

  it("baja de asignación a las 14:30: la de 8:00 queda DICTADA (sin error) y la de 16:00 pasa a FIN_ASIGNACION", async () => {
    vi.setSystemTime(A_LAS_1430)
    const { asignacionId } = await nuevaAsignacion([m.lun0800, m.jue0800, m.jue1600])

    const r = await eliminarAsignacion(asignacionId, institucionId)

    expect(r).toMatchObject({ ok: true, deleted: true })
    expect(await estado(asignacionId, m.jue0800, HOY)).toBe("DICTADA/NINGUNA")
    expect(await estado(asignacionId, m.jue1600, HOY)).toBe("SUSPENDIDA/FIN_ASIGNACION")
    expect(await estado(asignacionId, m.jue0800, "2026-10-29")).toBe("SUSPENDIDA/FIN_ASIGNACION")
  })

  it("reactivación el mismo día: baja a las 14:30 y reactivación a las 18:00 -> 8:00 DICTADA, 16:00 FIN_ASIGNACION (terminó con la baja vigente), 19:00 PROGRAMADA", async () => {
    vi.setSystemTime(A_LAS_1430)
    const { asignacionId } = await nuevaAsignacion([m.jue0800, m.jue1600, m.jue1900])
    await eliminarAsignacion(asignacionId, institucionId)

    vi.setSystemTime(A_LAS_1800)
    const r = await reactivarAsignacion(asignacionId, institucionId)

    expect(r).toMatchObject({ ok: true, desde: HOY })
    expect(await estado(asignacionId, m.jue0800, HOY)).toBe("DICTADA/NINGUNA")
    expect(await estado(asignacionId, m.jue1600, HOY)).toBe("SUSPENDIDA/FIN_ASIGNACION")
    expect(await estado(asignacionId, m.jue1900, HOY)).toBe("PROGRAMADA/NINGUNA")
    expect(await estado(asignacionId, m.jue1900, "2026-10-29")).toBe("PROGRAMADA/NINGUNA")
  })
})
