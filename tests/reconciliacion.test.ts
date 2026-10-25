// tests/reconciliacion.test.ts
//
// reconciliarAsignacion (lib/services/reconciliacionService.ts, Fase 3b):
// módulo que se quita y vuelve, reemplazos futuros anulados con y sin
// confirmación, reemplazos pasados conservados, DICTADA intactas salvo
// reescribirDictadas, transacción del llamador (sin anidar), copia de módulos
// de una "Nueva versión" como no-op y "mantener reemplazo".
//
// Contra gestor_test, con fixtures propios y limpieza al final. Reloj
// simulado solo para Date: "hoy" es el jueves 22/10/2026 a las 10:00 AR.
// Las distribuciones arrancan el lunes 05/10 y los rangos terminan el 30/11:
//   lunes pasados 05, 12 y 19/10; lunes futuros 26/10 y 02, 09, 16, 23, 30/11;
//   martes pasados 06, 13 y 20/10; martes futuros 27/10 y 03, 10, 17, 24/11.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { randomUUID } from "crypto"
import { EstadoClase, Causa } from "@prisma/client"
import prisma from "../lib/prisma"
import { createTestInstitucion } from "./helpers/factories"
import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"
import { claseProgramadaService } from "../lib/services/claseProgramadaService"
import {
  reconciliarAsignacion,
  RequiereConfirmacionError,
  type ParametrosReconciliacion,
} from "../lib/services/reconciliacionService"
import { crearReemplazo } from "../lib/usecases/reemplazos/crearReemplazo"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (f: Date) => f.toISOString().slice(0, 10)
const { SUSPENDIDA, REEMPLAZADA } = EstadoClase
const HOY = d("2026-10-22")
const HASTA = d("2026-11-30")
const LUNES_PASADOS = ["2026-10-05", "2026-10-12", "2026-10-19"]
const LUNES_FUTUROS = ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]
const MARTES_PASADOS = ["2026-10-06", "2026-10-13", "2026-10-20"]
const MARTES_FUTUROS = ["2026-10-27", "2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24"]

class ErrorProvocado extends Error {}

let institucionId: number
let periodoId: number
let unidadId: number
let turnoId: number
let comisionId: number
let lunes: number
let martes: number
let itemPaga: number
let suplente1: number
let suplente2: number

// Asignación con una distribución desde el 05/10 y sus clases generadas
// hasta el 30/11 (las pasadas quedan DICTADA, o con la licencia si la hay).
async function escenario(modulos: number[], licencia?: { desde: string; hasta: string }) {
  const asignacion = await prisma.asignacion.create({
    data: {
      institucionId, unidadId, turnoId, comisionId,
      identificadorEstructural: `REC-${randomUUID()}`,
      fecha_inicio: d("2026-01-01"),
    },
  })
  const dist = await prisma.distribucionHoraria.create({
    data: { institucionId, asignacionId: asignacion.id, version: 1, fecha_vigencia_desde: d("2026-10-05") },
  })
  await asignarModulos(dist.id, modulos)
  const inc = licencia
    ? await prisma.incidencia.create({
        data: { asignacionId: asignacion.id, codigarioItemId: itemPaga, fecha_desde: d(licencia.desde), fecha_hasta: d(licencia.hasta) },
      })
    : null
  await claseProgramadaService.generarParaRango({
    institucionId, asignacionId: asignacion.id, unidadId, comisionId,
    distribucionId: dist.id, periodoId, desde: d("2026-10-05"), hasta: HASTA,
  })
  return { asignacionId: asignacion.id, distribucionId: dist.id, incidenciaId: inc?.id ?? null }
}

// Lo que en la 3c hará "Editar": reemplazar los módulos de la distribución.
async function asignarModulos(distribucionId: number, modulos: number[]) {
  await prisma.distribucionModulo.deleteMany({ where: { distribucionHorariaId: distribucionId } })
  await prisma.distribucionModulo.createMany({
    data: modulos.map(moduloHorarioId => ({ distribucionHorariaId: distribucionId, moduloHorarioId })),
  })
}

const reconciliar = (asignacionId: number, extra: Partial<ParametrosReconciliacion> = {}) =>
  reconciliarAsignacion({ tenantId: institucionId, asignacionId, desde: HOY, hasta: HASTA, ...extra })

async function clases(asignacionId: number, moduloId: number) {
  const filas = await prisma.claseProgramada.findMany({
    where: { asignacionId, moduloId }, orderBy: { fecha: "asc" },
    include: { reemplazos: { where: { activo: true } } },
  })
  return Object.fromEntries(filas.map(c => [iso(c.fecha), c]))
}

const estados = (porFecha: Record<string, { estado: EstadoClase; causa: Causa }>, fechas: string[]) =>
  fechas.map(f => porFecha[f] ? `${porFecha[f].estado}/${porFecha[f].causa}` : "no existe")

const todos = (n: number, valor: string) => Array(n).fill(valor)

// Foto de todo lo que la reconciliación podría tocar de una asignación.
async function foto(asignacionId: number) {
  const c = await prisma.claseProgramada.findMany({
    where: { asignacionId }, orderBy: { id: "asc" },
    select: { id: true, estado: true, causa: true, incidenciaId: true, calendarioEscolarId: true, versionResolucion: true },
  })
  const r = await prisma.reemplazo.findMany({
    where: { clase: { asignacionId } }, orderBy: { id: "asc" },
    select: { id: true, activo: true, deletedAt: true, claseId: true },
  })
  return { clases: c, reemplazos: r }
}

async function reemplazar(asignacionId: number, claseId: number, agenteSuplenteId: number) {
  return crearReemplazo(institucionId, { claseId, asignacionTitularId: asignacionId, agenteSuplenteId })
}

describe("reconciliarAsignacion", () => {
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
    const curso = await prisma.curso.create({ data: { institucionId, nombre: `Curso-${randomUUID()}` } })
    comisionId = (await prisma.comision.create({
      data: { institucionId, cursoId: curso.id, turnoId, nombre: `Com-${randomUUID()}` },
    })).id
    periodoId = (await prisma.periodoOperativo.create({
      data: {
        institucionId, nombre: `P-${randomUUID()}`, estado: "ACTIVO",
        fecha_desde: d("2026-03-01"), fecha_hasta: d("2026-12-31"),
      },
    })).id
    lunes = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "LUNES", hora_desde: 480, hora_hasta: 520 },
    })).id
    martes = (await prisma.moduloHorario.create({
      data: { institucionId, dia_semana: "MARTES", hora_desde: 480, hora_hasta: 520 },
    })).id
    const codigario = await prisma.codigario.create({ data: { institucionId, nombre: `C-${randomUUID()}` } })
    itemPaga = (await prisma.codigarioItem.create({
      data: { codigarioId: codigario.id, codigo: "PAGA", nombre: "Paga", porcentajeComputable: 100 },
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

  it("módulo que se quita y vuelve: las mismas clases pasan a CAMBIO_DISTRIBUCION y reviven; las DICTADA no se tocan", async () => {
    const { asignacionId, distribucionId } = await escenario([lunes])
    const lunesAntes = await clases(asignacionId, lunes)

    await asignarModulos(distribucionId, [martes])
    const r1 = await reconciliar(asignacionId)
    expect(r1.clasesCreadas).toBe(MARTES_FUTUROS.length)
    let l = await clases(asignacionId, lunes)
    let m = await clases(asignacionId, martes)
    expect(estados(l, LUNES_PASADOS)).toEqual(todos(3, "DICTADA/NINGUNA"))
    expect(estados(l, LUNES_FUTUROS)).toEqual(todos(6, "SUSPENDIDA/CAMBIO_DISTRIBUCION"))
    expect(estados(m, MARTES_FUTUROS)).toEqual(todos(5, "PROGRAMADA/NINGUNA"))
    expect(estados(m, MARTES_PASADOS)).toEqual(todos(3, "no existe")) // desde hoy: no genera pasado

    await asignarModulos(distribucionId, [lunes])
    const r2 = await reconciliar(asignacionId)
    expect(r2.clasesCreadas).toBe(0)
    l = await clases(asignacionId, lunes)
    m = await clases(asignacionId, martes)
    expect(estados(l, LUNES_FUTUROS)).toEqual(todos(6, "PROGRAMADA/NINGUNA"))
    expect(LUNES_FUTUROS.map(f => l[f].id)).toEqual(LUNES_FUTUROS.map(f => lunesAntes[f].id)) // mismas filas
    expect(estados(m, MARTES_FUTUROS)).toEqual(todos(5, "SUSPENDIDA/CAMBIO_DISTRIBUCION"))
  })

  it("reemplazo futuro que desaparece: sin confirmación revierte todo y lista exactamente los futuros; con confirmación los anula y conserva el pasado", async () => {
    const { asignacionId, distribucionId } = await escenario([lunes], { desde: "2026-10-01", hasta: "2026-11-30" })
    let l = await clases(asignacionId, lunes)
    const pasado = await reemplazar(asignacionId, l["2026-10-19"].id, suplente1)
    const futuro1 = await reemplazar(asignacionId, l["2026-10-26"].id, suplente1)
    const futuro2 = await reemplazar(asignacionId, l["2026-11-02"].id, suplente1)
    const antes = await foto(asignacionId)

    await asignarModulos(distribucionId, [martes])
    const error = await reconciliar(asignacionId).catch(e => e)
    expect(error).toBeInstanceOf(RequiereConfirmacionError)
    const aviso = (error as RequiereConfirmacionError).aviso
    expect(aviso.reemplazosAAnular.map(r => [r.reemplazoId, r.fecha, r.agenteSuplenteId])).toEqual([
      [futuro1!.id, "2026-10-26", suplente1],
      [futuro2!.id, "2026-11-02", suplente1],
    ])
    expect(aviso.dictadasAReescribir).toEqual([])
    expect(await foto(asignacionId)).toEqual(antes) // rollback completo, sin martes nuevos

    const r = await reconciliar(asignacionId, { confirmarAnulacion: true })
    expect(r.reemplazosAnulados.map(x => x.reemplazoId)).toEqual([futuro1!.id, futuro2!.id])
    const anulados = await prisma.reemplazo.findMany({ where: { id: { in: [futuro1!.id, futuro2!.id] } } })
    expect(anulados.every(x => !x.activo && x.deletedAt !== null)).toBe(true)
    const conservado = await prisma.reemplazo.findUniqueOrThrow({ where: { id: pasado!.id } })
    expect(conservado.activo).toBe(true)
    l = await clases(asignacionId, lunes)
    expect(l["2026-10-19"].estado).toBe(REEMPLAZADA)
    expect(estados(l, ["2026-10-26", "2026-11-02"])).toEqual(todos(2, "SUSPENDIDA/CAMBIO_DISTRIBUCION"))
    // Sin mantenerReemplazo, los martes nuevos de la licencia quedan sin cobertura y se listan.
    expect(r.sinCobertura.map(c => c.fecha)).toEqual(MARTES_FUTUROS)
    expect(r.reemplazosMantenidos).toBe(0)
  })

  it("DICTADA intactas salvo reescribirDictadas: el aviso cuenta las que se reescriben y las clases pasadas nuevas", async () => {
    const { asignacionId, distribucionId } = await escenario([lunes])
    const antes = await foto(asignacionId)
    await asignarModulos(distribucionId, [martes])

    const error = await reconciliar(asignacionId, { desde: d("2026-10-05") }).catch(e => e)
    expect(error).toBeInstanceOf(RequiereConfirmacionError)
    const aviso = (error as RequiereConfirmacionError).aviso
    expect(aviso.dictadasAReescribir.map(x => [x.fecha, x.estado, x.causa])).toEqual(
      LUNES_PASADOS.map(f => [f, SUSPENDIDA, Causa.CAMBIO_DISTRIBUCION])
    )
    expect(aviso.clasesPasadasNuevas.map(x => x.fecha)).toEqual(MARTES_PASADOS)
    expect(await foto(asignacionId)).toEqual(antes)

    const r = await reconciliar(asignacionId, { desde: d("2026-10-05"), reescribirDictadas: true })
    expect(r.dictadasReescritas).toBe(3)
    const l = await clases(asignacionId, lunes)
    const m = await clases(asignacionId, martes)
    expect(estados(l, LUNES_PASADOS)).toEqual(todos(3, "SUSPENDIDA/CAMBIO_DISTRIBUCION"))
    expect(estados(m, MARTES_PASADOS)).toEqual(todos(3, "DICTADA/NINGUNA"))
    expect(estados(m, MARTES_FUTUROS)).toEqual(todos(5, "PROGRAMADA/NINGUNA"))
  })

  it("con un cliente transaccional corre dentro de la transacción del llamador (no anida) y se revierte con ella", async () => {
    const { asignacionId, distribucionId } = await escenario([lunes])
    const antes = await foto(asignacionId)
    await asignarModulos(distribucionId, [martes])
    await expect(prisma.$transaction(async tx => {
      const r = await reconciliarAsignacion({ tenantId: institucionId, asignacionId, desde: HOY, hasta: HASTA }, tx)
      expect(r.clasesCreadas).toBe(MARTES_FUTUROS.length)
      throw new ErrorProvocado("el usecase falla después de reconciliar")
    })).rejects.toBeInstanceOf(ErrorProvocado)
    expect(await foto(asignacionId)).toEqual(antes)
  })

  it("Nueva versión con copia de los módulos: reconciliar es un no-op (nada cambia, ningún reemplazo se anula)", async () => {
    const { asignacionId, distribucionId, incidenciaId } =
      await escenario([lunes, martes], { desde: "2026-11-02", hasta: "2026-11-30" })
    const l = await clases(asignacionId, lunes)
    await reemplazar(asignacionId, l["2026-11-02"].id, suplente1)
    await reemplazar(asignacionId, l["2026-11-09"].id, suplente1)
    expect(incidenciaId).not.toBeNull()
    const antes = await foto(asignacionId)

    // Lo que hará "Nueva versión" en la 3c: cerrar v1 ayer y abrir v2 hoy con los mismos módulos.
    await prisma.distribucionHoraria.update({
      where: { id: distribucionId },
      data:  { fecha_vigencia_hasta: new Date("2026-10-21T23:59:59.999Z"), estado: "INACTIVO", activo: false },
    })
    const v2 = await prisma.distribucionHoraria.create({
      data: { institucionId, asignacionId, version: 2, fecha_vigencia_desde: HOY },
    })
    await asignarModulos(v2.id, [lunes, martes])

    const r = await reconciliar(asignacionId)
    expect(r).toEqual({
      clasesCreadas: 0, clasesActualizadas: 0, dictadasReescritas: 0,
      reemplazosAnulados: [], reemplazosMantenidos: 0, sinCobertura: [],
    })
    expect(await foto(asignacionId)).toEqual(antes)
  })

  it("mantener reemplazo: con un único suplente cubre las clases nuevas de la licencia; con dos, las lista sin cobertura", async () => {
    const unico = await escenario([lunes], { desde: "2026-10-01", hasta: "2026-11-30" })
    let l = await clases(unico.asignacionId, lunes)
    for (const f of LUNES_FUTUROS) await reemplazar(unico.asignacionId, l[f].id, suplente1)
    await asignarModulos(unico.distribucionId, [martes])
    const r1 = await reconciliar(unico.asignacionId, { confirmarAnulacion: true, mantenerReemplazo: true })
    expect(r1.reemplazosAnulados).toHaveLength(LUNES_FUTUROS.length)
    expect(r1.reemplazosMantenidos).toBe(MARTES_FUTUROS.length)
    expect(r1.sinCobertura).toEqual([])
    const m = await clases(unico.asignacionId, martes)
    expect(estados(m, MARTES_FUTUROS)).toEqual(todos(5, "REEMPLAZADA/INCIDENCIA"))
    for (const f of MARTES_FUTUROS) {
      expect(m[f].reemplazos).toHaveLength(1)
      expect(m[f].reemplazos[0].agenteSuplenteId).toBe(suplente1)
      expect(m[f].reemplazos[0].incidenciaId).toBe(unico.incidenciaId)
    }

    const varios = await escenario([lunes], { desde: "2026-10-01", hasta: "2026-11-30" })
    l = await clases(varios.asignacionId, lunes)
    await reemplazar(varios.asignacionId, l["2026-10-26"].id, suplente1)
    await reemplazar(varios.asignacionId, l["2026-11-02"].id, suplente2)
    await asignarModulos(varios.distribucionId, [martes])
    const r2 = await reconciliar(varios.asignacionId, { confirmarAnulacion: true, mantenerReemplazo: true })
    expect(r2.reemplazosMantenidos).toBe(0)
    expect(r2.sinCobertura.map(c => c.fecha)).toEqual(MARTES_FUTUROS)
    const m2 = await clases(varios.asignacionId, martes)
    expect(estados(m2, MARTES_FUTUROS)).toEqual(todos(5, "SUSPENDIDA/INCIDENCIA"))
  })
})

