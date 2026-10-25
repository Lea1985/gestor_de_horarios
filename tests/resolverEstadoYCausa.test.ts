// tests/resolverEstadoYCausa.test.ts
//
// Tabla de casos de resolverEstadoYCausa (lib/services/resolucionClaseService.ts)
// como función pura: estado actual x condiciones -> estado y causa. Es la tabla
// aprobada en la Fase 2 del plan de corrección del motor
// (docs/plan-correccion-motor-clases-2026-10-22.md, 3.2); el número de cada
// fila es el de esa tabla.
//
// Sin base: Prisma se reemplaza por un objeto vacío para que importar el
// servicio no abra conexión.

import { describe, it, expect, vi } from "vitest"
import { EstadoClase, Causa } from "@prisma/client"
import type { CondicionesVigentes } from "../lib/types/claseProgramada"

vi.mock("@/lib/prisma", () => ({ default: {} }))

import { resolverEstadoYCausa } from "../lib/services/resolucionClaseService"

const { PROGRAMADA, DICTADA, SUSPENDIDA, REEMPLAZADA } = EstadoClase

// E = estado actual (D = DICTADA, "." = cualquier otro: se prueba con
// PROGRAMADA, SUSPENDIDA y REEMPLAZADA), A = asignación vigente, M = módulo
// vigente, I = incidencia activa, R = reemplazo, C = evento de calendario,
// P = artículo paga (null = no consultado), PO = período vigente,
// F = fechaYaPaso.
type Fila = {
  n: string
  E: "D" | "."
  A: 0 | 1; M: 0 | 1; I: 0 | 1; R: 0 | 1; C: 0 | 1
  P: 0 | 1 | null
  PO: 0 | 1; F: 0 | 1
  estado: EstadoClase
  causa:  Causa
  motivo: string
}

const tabla: Fila[] = [
  { n: "1",  E: ".", A: 0, M: 1, I: 1, R: 1, C: 1, P: 1,    PO: 1, F: 0, estado: SUSPENDIDA,  causa: Causa.FIN_ASIGNACION,      motivo: "FIN le gana a todo" },
  { n: "2",  E: ".", A: 0, M: 0, I: 0, R: 0, C: 0, P: null, PO: 1, F: 0, estado: SUSPENDIDA,  causa: Causa.FIN_ASIGNACION,      motivo: "FIN antes que CAMBIO" },
  { n: "3",  E: ".", A: 0, M: 1, I: 0, R: 0, C: 0, P: null, PO: 0, F: 1, estado: SUSPENDIDA,  causa: Causa.FIN_ASIGNACION,      motivo: "no pasa a DICTADA" },
  { n: "4",  E: ".", A: 1, M: 0, I: 1, R: 1, C: 0, P: null, PO: 1, F: 0, estado: SUSPENDIDA,  causa: Causa.CAMBIO_DISTRIBUCION, motivo: "regla 6: le gana a la licencia" },
  { n: "5",  E: ".", A: 1, M: 0, I: 0, R: 0, C: 1, P: null, PO: 1, F: 0, estado: SUSPENDIDA,  causa: Causa.CAMBIO_DISTRIBUCION, motivo: "le gana al calendario" },
  { n: "6",  E: ".", A: 1, M: 0, I: 0, R: 0, C: 0, P: null, PO: 1, F: 1, estado: SUSPENDIDA,  causa: Causa.CAMBIO_DISTRIBUCION, motivo: "no pasa a DICTADA" },
  { n: "7",  E: "D", A: 0, M: 1, I: 0, R: 0, C: 0, P: null, PO: 1, F: 1, estado: DICTADA,     causa: Causa.NINGUNA,             motivo: "DICTADA protegida de FIN" },
  { n: "8",  E: "D", A: 1, M: 0, I: 0, R: 0, C: 0, P: null, PO: 1, F: 1, estado: DICTADA,     causa: Causa.NINGUNA,             motivo: "DICTADA protegida de CAMBIO" },
  { n: "9",  E: "D", A: 0, M: 0, I: 1, R: 0, C: 0, P: null, PO: 1, F: 1, estado: SUSPENDIDA,  causa: Causa.INCIDENCIA,          motivo: "licencia retroactiva sigue aplicando" },
  { n: "10", E: "D", A: 0, M: 1, I: 0, R: 0, C: 1, P: null, PO: 1, F: 1, estado: SUSPENDIDA,  causa: Causa.CALENDARIO_ESCOLAR,  motivo: "feriado retroactivo sigue aplicando" },
  { n: "11", E: ".", A: 1, M: 1, I: 1, R: 0, C: 0, P: null, PO: 1, F: 0, estado: SUSPENDIDA,  causa: Causa.INCIDENCIA,          motivo: "licencia sin reemplazo" },
  { n: "12", E: ".", A: 1, M: 1, I: 1, R: 1, C: 0, P: null, PO: 1, F: 0, estado: REEMPLAZADA, causa: Causa.INCIDENCIA,          motivo: "licencia con reemplazo" },
  { n: "13", E: ".", A: 1, M: 1, I: 1, R: 1, C: 1, P: 1,    PO: 1, F: 0, estado: REEMPLAZADA, causa: Causa.INCIDENCIA,          motivo: "regla 2: feriado con artículo que paga" },
  { n: "14", E: ".", A: 1, M: 1, I: 1, R: 0, C: 1, P: 1,    PO: 1, F: 0, estado: SUSPENDIDA,  causa: Causa.INCIDENCIA,          motivo: "paga y sin suplente" },
  { n: "15", E: ".", A: 1, M: 1, I: 1, R: 1, C: 1, P: 0,    PO: 1, F: 0, estado: SUSPENDIDA,  causa: Causa.CALENDARIO_ESCOLAR,  motivo: "regla 3: no paga, el reemplazo deja de estar vigente" },
  { n: "16", E: ".", A: 1, M: 1, I: 1, R: 0, C: 1, P: 0,    PO: 1, F: 0, estado: SUSPENDIDA,  causa: Causa.CALENDARIO_ESCOLAR,  motivo: "regla 3 sin suplente" },
  { n: "17", E: ".", A: 1, M: 1, I: 1, R: 1, C: 0, P: null, PO: 1, F: 0, estado: REEMPLAZADA, causa: Causa.INCIDENCIA,          motivo: "sin calendario el artículo no se consulta ni importa" },
  { n: "17b",E: ".", A: 1, M: 1, I: 1, R: 1, C: 1, P: null, PO: 1, F: 0, estado: REEMPLAZADA, causa: Causa.INCIDENCIA,          motivo: "defensivo (el schema no lo permite): artículo desconocido cuenta como paga" },
  { n: "17c",E: ".", A: 1, M: 1, I: 1, R: 1, C: 0, P: 0,    PO: 1, F: 0, estado: REEMPLAZADA, causa: Causa.INCIDENCIA,          motivo: "artículo que no paga, sin feriado: rige la licencia" },
  { n: "18", E: ".", A: 1, M: 1, I: 1, R: 0, C: 0, P: null, PO: 0, F: 0, estado: SUSPENDIDA,  causa: Causa.INCIDENCIA,          motivo: "INCIDENCIA antes que PERIODO" },
  { n: "19", E: ".", A: 1, M: 1, I: 1, R: 0, C: 0, P: null, PO: 1, F: 1, estado: SUSPENDIDA,  causa: Causa.INCIDENCIA,          motivo: "no pasa a DICTADA" },
  { n: "20", E: "D", A: 1, M: 1, I: 1, R: 1, C: 0, P: null, PO: 1, F: 1, estado: REEMPLAZADA, causa: Causa.INCIDENCIA,          motivo: "licencia cargada después de dictada" },
  { n: "20b",E: "D", A: 1, M: 1, I: 1, R: 1, C: 1, P: 0,    PO: 1, F: 1, estado: SUSPENDIDA,  causa: Causa.CALENDARIO_ESCOLAR,  motivo: "dictada, licencia que no paga y feriado" },
  { n: "21", E: ".", A: 1, M: 1, I: 0, R: 1, C: 0, P: null, PO: 1, F: 0, estado: PROGRAMADA,  causa: Causa.NINGUNA,             motivo: "reemplazo sin incidencia activa no cuenta" },
  { n: "21b",E: ".", A: 1, M: 1, I: 1, R: 1, C: 1, P: 0,    PO: 0, F: 0, estado: SUSPENDIDA,  causa: Causa.PERIODO_OPERATIVO,   motivo: "teórico: la incidencia cede y sigue la precedencia" },
  { n: "22", E: ".", A: 1, M: 1, I: 0, R: 0, C: 0, P: null, PO: 0, F: 0, estado: SUSPENDIDA,  causa: Causa.PERIODO_OPERATIVO,   motivo: "período no vigente" },
  { n: "23", E: ".", A: 1, M: 1, I: 0, R: 0, C: 0, P: null, PO: 0, F: 1, estado: DICTADA,     causa: Causa.NINGUNA,             motivo: "fuera de período y ya pasó" },
  { n: "24", E: ".", A: 1, M: 1, I: 0, R: 0, C: 1, P: null, PO: 1, F: 0, estado: SUSPENDIDA,  causa: Causa.CALENDARIO_ESCOLAR,  motivo: "feriado" },
  { n: "25", E: ".", A: 1, M: 1, I: 0, R: 0, C: 1, P: null, PO: 1, F: 1, estado: SUSPENDIDA,  causa: Causa.CALENDARIO_ESCOLAR,  motivo: "feriado pasado" },
  { n: "26", E: "D", A: 1, M: 1, I: 0, R: 0, C: 1, P: null, PO: 1, F: 1, estado: SUSPENDIDA,  causa: Causa.CALENDARIO_ESCOLAR,  motivo: "feriado retroactivo sobre dictada" },
  { n: "27", E: ".", A: 1, M: 1, I: 0, R: 0, C: 0, P: null, PO: 1, F: 1, estado: DICTADA,     causa: Causa.NINGUNA,             motivo: "terminó" },
  { n: "28", E: ".", A: 1, M: 1, I: 0, R: 0, C: 0, P: null, PO: 1, F: 0, estado: PROGRAMADA,  causa: Causa.NINGUNA,             motivo: "futura sin causas" },
  { n: "29", E: "D", A: 1, M: 1, I: 0, R: 0, C: 0, P: null, PO: 1, F: 1, estado: DICTADA,     causa: Causa.NINGUNA,             motivo: "dictada se mantiene" },
]

function condiciones(f: Fila, estadoActual: EstadoClase): CondicionesVigentes {
  return {
    estadoActual,
    asignacionVigente:       f.A === 1,
    moduloVigente:           f.M === 1,
    articuloPaga:            f.P === null ? null : f.P === 1,
    tieneIncidenciaActiva:   f.I === 1,
    tieneReemplazoAsignado:  f.R === 1,
    tieneEventoCalendario:   f.C === 1,
    eventoCalendarioId:      f.C === 1 ? 1 : null,
    periodoOperativoVigente: f.PO === 1,
    fechaYaPaso:             f.F === 1,
  }
}

const estadosNoDictada = [PROGRAMADA, SUSPENDIDA, REEMPLAZADA]

describe("resolverEstadoYCausa — tabla de casos", () => {
  for (const f of tabla) {
    const estados = f.E === "D" ? [DICTADA] : estadosNoDictada
    for (const estadoActual of estados) {
      it(`fila ${f.n} (${estadoActual}): ${f.motivo} -> ${f.estado}/${f.causa}`, () => {
        expect(resolverEstadoYCausa(condiciones(f, estadoActual))).toEqual({
          estado: f.estado,
          causa:  f.causa,
        })
      })
    }
  }
})
