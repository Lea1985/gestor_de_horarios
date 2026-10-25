// tests/enroques2doA.test.ts
//
// Los dos enroques de 2do A del piloto (bitácora del 21 y 22/10/2026), de
// principio a fin con "Editar" (asignarModulos) y la licencia de Historia
// vigente, cubierta por un suplente:
//   Horario original: Historia mar 09:00 y vie 07:30; Físico-Química mié
//   10:30 y jue 09:00.
//   1er enroque (21/10): Historia vie -> jue; Físico-Química jue -> vie.
//   2do enroque (22/10, horario correcto): Físico-Química jue y vie;
//   Historia mar y mié.
// Bugs del piloto que cubre: clases nuevas de Historia sin la licencia ni el
// suplente (bugs 1 y 3), jueves de Historia que seguían con la licencia
// (bug 2) y el 31/12 de Físico-Química que quedaba programado (bug 7).
//
// Contra gestor_test, usecases directos, reloj simulado solo para Date.
// Feriados: viernes 25/12 y jueves 31/12.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { asignarModulos } from "../lib/usecases/distribuciones/asignarModulos"
import { crearIncidencia } from "../lib/usecases/incidencias/crearIncidencia"
import { crearReemplazo } from "../lib/usecases/reemplazos/crearReemplazo"
import { crearCalendarioEscolar } from "../lib/usecases/calendarioEscolar/crearCalendarioEscolar"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (f: Date) => f.toISOString().slice(0, 10)
const h = (hora: number, minuto = 0) => hora * 60 + minuto
const DIA1 = new Date("2026-10-21T13:00:00.000Z") // miércoles 21/10, 10:00 AR
const DIA2 = new Date("2026-10-22T13:00:00.000Z") // jueves 22/10, 10:00 AR

let institucionId: number
let periodoId: number
let unidadId: number
let turnoId: number
let comisionId: number
const m: Record<"mar0900" | "mie1030" | "jue0900" | "vie0730", number> = { mar0900: 0, mie1030: 0, jue0900: 0, vie0730: 0 }
let historia: { asignacionId: number; distribucionId: number }
let fisica: { asignacionId: number; distribucionId: number }
let licenciaId: number
let suplente: number

async function nuevaAsignacion(nombre: string, modulos: number[]) {
  const a = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId, comisionId,
      identificadorEstructural: `${nombre}-${randomUUID()}`, fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: a.id, version: 1, fecha_vigencia_desde: d("2026-10-05") },
  })
  await asignarModulos(dist.id, institucionId, { modulos })
  return { asignacionId: a.id, distribucionId: dist.id }
}

type Clase = { id: number; estado: string; causa: string; incidenciaId: number | null; reemplazos: { agenteSuplenteId: number; incidenciaId: number | null }[] }
async function clases(asignacionId: number, moduloId: number, desde = "2026-10-21") {
  const filas = await prisma.claseProgramada.findMany({
    where: { asignacionId, moduloId, fecha: { gte: d(desde) } }, orderBy: { fecha: "asc" },
    include: { reemplazos: { where: { activo: true } } },
  })
  return new Map<string, Clase>(filas.map(c => [iso(c.fecha), c]))
}
const resumen = (porFecha: Map<string, Clase>) =>
  new Set([...porFecha.values()].map(c => `${c.estado}/${c.causa}`))
const conLicencia = (fecha: string) => fecha <= "2026-12-18"

describe("Enroques de 2do A con licencia vigente", () => {
  beforeAll(async () => {
    asegurarBaseDeTest()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(DIA1)
    institucionId = (await createTestInstitucion()).id
    turnoId = (await prisma.turno.create({ data: { institucionId, nombre: `Mañana-${randomUUID()}`, horaInicio: h(7, 30), horaFin: h(12) } })).id
    unidadId = (await prisma.unidadOrganizativa.create({ data: { institucionId, codigoUnidad: 1, nombre: `Aula-${randomUUID()}` } })).id
    const curso = await prisma.curso.create({ data: { institucionId, nombre: `2do-${randomUUID()}` } })
    comisionId = (await prisma.comision.create({ data: { institucionId, cursoId: curso.id, turnoId, nombre: `2do A-${randomUUID()}` } })).id
    periodoId = (await prisma.periodoOperativo.create({
      data: { institucionId, nombre: `2026-${randomUUID()}`, estado: "ACTIVO", fecha_desde: d("2026-03-02"), fecha_hasta: d("2026-12-31") },
    })).id
    const modulo = (dia: "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES", desde: number, hasta: number) =>
      prisma.moduloHorario.create({ data: { institucionId, dia_semana: dia, hora_desde: desde, hora_hasta: hasta } })
    m.mar0900 = (await modulo("MARTES", h(9), h(10, 20))).id
    m.mie1030 = (await modulo("MIERCOLES", h(10, 30), h(11, 45))).id
    m.jue0900 = (await modulo("JUEVES", h(9), h(10, 20))).id
    m.vie0730 = (await modulo("VIERNES", h(7, 30), h(8, 50))).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `Cod-${randomUUID()}` } })
    const articulo = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "LIC", nombre: "Licencia que paga", porcentajeComputable: 100 },
    })).id
    suplente = (await prisma.agente.create({
      data: { institucionId, nombre: "Suplente", apellido: "Historia", documento: `DOC-${randomUUID()}`, email: `s-${randomUUID()}@test.dev`, estado: "ACTIVO" },
    })).id

    // Horario original y feriados.
    historia = await nuevaAsignacion("HISTORIA", [m.mar0900, m.vie0730])
    fisica = await nuevaAsignacion("FISICA", [m.mie1030, m.jue0900])
    for (const fecha of ["2026-12-25", "2026-12-31"]) {
      await crearCalendarioEscolar(institucionId, { periodoOperativoId: periodoId, fecha, descripcion: "Feriado", esFeriado: true, suspendeClases: true })
    }
    // Licencia de la titular de Historia, cubierta por un suplente desde hoy.
    licenciaId = (await crearIncidencia(institucionId, {
      asignacionId: historia.asignacionId, fecha_desde: "2026-10-01", fecha_hasta: "2026-12-18", codigarioItemId: articulo,
    })).id
    for (const moduloId of [m.mar0900, m.vie0730]) {
      for (const [fecha, c] of await clases(historia.asignacionId, moduloId)) {
        if (!conLicencia(fecha)) continue
        await crearReemplazo(institucionId, { claseId: c.id, asignacionTitularId: historia.asignacionId, agenteSuplenteId: suplente })
      }
    }
  })

  afterAll(async () => {
    vi.useRealTimers()
    if (!institucionId) return
    await prisma.reemplazo.deleteMany({ where: { clase: { institucionId } } })
    await prisma.claseProgramada.deleteMany({ where: { institucionId } })
    await prisma.calendarioEscolar.deleteMany({ where: { institucionId } })
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

  it("1er enroque (21/10): Historia vie -> jue y Físico-Química jue -> vie, con la licencia y el suplente en las clases nuevas", async () => {
    vi.setSystemTime(DIA1)
    const pasadoAntes = await prisma.claseProgramada.findMany({
      where: { institucionId, fecha: { lt: d("2026-10-21") } }, orderBy: { id: "asc" },
      select: { id: true, estado: true, causa: true, versionResolucion: true },
    })

    const pregunta = await asignarModulos(historia.distribucionId, institucionId, { modulos: [m.mar0900, m.jue0900] })
    expect(pregunta.requiereConfirmacion).toBe(true)
    const viernesConSuplente = [...(await clases(historia.asignacionId, m.vie0730)).entries()].filter(([f]) => conLicencia(f))
    expect(pregunta.aviso?.reemplazosAAnular.map(r => r.fecha)).toEqual(viernesConSuplente.map(([f]) => f))

    const rh = await asignarModulos(historia.distribucionId, institucionId, {
      modulos: [m.mar0900, m.jue0900], confirmarAnulacion: true, mantenerReemplazo: true,
    })
    expect(rh.ok).toBe(true)
    const rf = await asignarModulos(fisica.distribucionId, institucionId, { modulos: [m.mie1030, m.vie0730] })
    expect(rf.ok).toBe(true)

    // Historia: viernes muertos sin reemplazo; jueves nuevos con licencia y suplente.
    const hVie = await clases(historia.asignacionId, m.vie0730)
    expect(resumen(hVie)).toEqual(new Set(["SUSPENDIDA/CAMBIO_DISTRIBUCION"]))
    expect([...hVie.values()].every(c => c.reemplazos.length === 0)).toBe(true)
    const hJue = await clases(historia.asignacionId, m.jue0900)
    for (const [fecha, c] of hJue) {
      if (fecha === "2026-12-31") expect(`${c.estado}/${c.causa}`).toBe("SUSPENDIDA/CALENDARIO_ESCOLAR") // fuera de la licencia
      else if (conLicencia(fecha)) {
        expect(`${c.estado}/${c.causa}`).toBe("REEMPLAZADA/INCIDENCIA")
        expect(c.incidenciaId).toBe(licenciaId)
        expect(c.reemplazos[0]).toMatchObject({ agenteSuplenteId: suplente, incidenciaId: licenciaId })
      } else expect(`${c.estado}/${c.causa}`).toBe("PROGRAMADA/NINGUNA")
    }
    // Físico-Química: jueves muertos (también el feriado 31/12); viernes nuevos, 25/12 por calendario.
    expect(resumen(await clases(fisica.asignacionId, m.jue0900))).toEqual(new Set(["SUSPENDIDA/CAMBIO_DISTRIBUCION"]))
    const fVie = await clases(fisica.asignacionId, m.vie0730)
    expect(fVie.get("2026-12-25")?.causa).toBe("CALENDARIO_ESCOLAR")
    expect(resumen(new Map([...fVie].filter(([f]) => f !== "2026-12-25")))).toEqual(new Set(["PROGRAMADA/NINGUNA"]))

    // El pasado no se tocó.
    const pasadoDespues = await prisma.claseProgramada.findMany({
      where: { institucionId, fecha: { lt: d("2026-10-21") } }, orderBy: { id: "asc" },
      select: { id: true, estado: true, causa: true, versionResolucion: true },
    })
    expect(pasadoDespues).toEqual(pasadoAntes)
  })

  it("2do enroque (22/10): Físico-Química jue y vie, Historia mar y mié; revive los jueves de Físico-Química con el 31/12 por calendario", async () => {
    vi.setSystemTime(DIA2)
    const fJueAntes = await clases(fisica.asignacionId, m.jue0900, "2026-10-22")

    const rf = await asignarModulos(fisica.distribucionId, institucionId, { modulos: [m.jue0900, m.vie0730] })
    expect(rf.ok).toBe(true)
    const rh = await asignarModulos(historia.distribucionId, institucionId, {
      modulos: [m.mar0900, m.mie1030], confirmarAnulacion: true, mantenerReemplazo: true,
    })
    expect(rh.ok).toBe(true)

    // Físico-Química: los jueves reviven (mismas filas) y el 31/12 queda por calendario (bug 7).
    const fJue = await clases(fisica.asignacionId, m.jue0900, "2026-10-22")
    expect([...fJue.keys()]).toEqual([...fJueAntes.keys()])
    expect([...fJue.values()].map(c => c.id)).toEqual([...fJueAntes.values()].map(c => c.id))
    expect(fJue.get("2026-12-31")?.causa).toBe("CALENDARIO_ESCOLAR")
    expect(resumen(new Map([...fJue].filter(([f]) => f !== "2026-12-31")))).toEqual(new Set(["PROGRAMADA/NINGUNA"]))
    expect(resumen(await clases(fisica.asignacionId, m.mie1030, "2026-10-22"))).toEqual(new Set(["SUSPENDIDA/CAMBIO_DISTRIBUCION"]))

    // Historia: jueves (del 1er enroque) muertos y sin reemplazo (bug 2); miércoles nuevos con licencia y suplente.
    const hJue = await clases(historia.asignacionId, m.jue0900, "2026-10-22")
    expect(resumen(hJue)).toEqual(new Set(["SUSPENDIDA/CAMBIO_DISTRIBUCION"]))
    expect([...hJue.values()].every(c => c.reemplazos.length === 0)).toBe(true)
    for (const [fecha, c] of await clases(historia.asignacionId, m.mie1030, "2026-10-22")) {
      if (conLicencia(fecha)) {
        expect(`${c.estado}/${c.causa}`).toBe("REEMPLAZADA/INCIDENCIA")
        expect(c.reemplazos[0]).toMatchObject({ agenteSuplenteId: suplente, incidenciaId: licenciaId })
      } else expect(`${c.estado}/${c.causa}`).toBe("PROGRAMADA/NINGUNA")
    }
    expect(resumen(await clases(historia.asignacionId, m.vie0730, "2026-10-22"))).toEqual(new Set(["SUSPENDIDA/CAMBIO_DISTRIBUCION"]))

    // Sin choques: en cada fecha y módulo de 2do A queda a lo sumo una clase viva.
    const vivas = await prisma.claseProgramada.findMany({
      where: { institucionId, fecha: { gte: d("2026-10-22") }, causa: { notIn: ["CAMBIO_DISTRIBUCION", "FIN_ASIGNACION"] } },
      select: { fecha: true, moduloId: true },
    })
    const claves = vivas.map(v => `${iso(v.fecha)}-${v.moduloId}`)
    expect(new Set(claves).size).toBe(claves.length)
  })
})
