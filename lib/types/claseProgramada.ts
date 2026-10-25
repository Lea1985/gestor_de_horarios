// lib/types/claseProgramada.ts
//
// Tipos de dominio de ClaseProgramada, transversales a los distintos
// subdominios que la generan/consultan (distribuciones, incidencias,
// periodosOperativos, calendarioEscolar). No son tipos de Prisma —
// EstadoClase, Causa y el modelo ClaseProgramada ya vienen de @prisma/client
// y no se redefinen acá.
//
// Ver docs/arquitectura de ClaseProgramada para el contexto completo de
// por qué existen estos tres tipos y cómo los usan los motores.

import type { EstadoClase, Causa } from "@prisma/client"

/**
 * Input común a las operaciones que actúan sobre un tramo de fechas de una
 * Asignación (generar, suspender/reactivar clases). Evita repetir la misma
 * forma de objeto inline en cada función del servicio/motores.
 */
export type RangoGeneracion = {
  institucionId: number
  asignacionId:  number
  unidadId:      number
  comisionId:    number | null
  desde:         Date
  hasta:         Date
}

/**
 * Condiciones vigentes que el Motor de Resolución evalúa para determinar
 * el estado y la causa final de una ClaseProgramada puntual. Se espera que
 * este tipo crezca a medida que se sumen nuevas reglas de negocio (ver
 * "Eventos del Dominio" y "Precedencia entre causas" del documento de
 * arquitectura).
 */
export type CondicionesVigentes = {
  // Estado persistido antes de resolver: una clase ya DICTADA no pasa a
  // FIN_ASIGNACION ni CAMBIO_DISTRIBUCION por re-resolución (la reescritura
  // del pasado va por la reconciliación explícita).
  estadoActual:            EstadoClase
  asignacionVigente:       boolean
  // Sin módulo (cargos por jornal) no aplica: llega siempre en true.
  moduloVigente:           boolean
  // porcentajeComputable > 0 del artículo de la incidencia vinculada. Es
  // null cuando no se consultó (sin evento de calendario o sin incidencia
  // activa); con ambos, siempre es true/false.
  articuloPaga:            boolean | null
  tieneIncidenciaActiva:   boolean
  tieneReemplazoAsignado:  boolean
  tieneEventoCalendario:   boolean
  eventoCalendarioId:      number | null
  periodoOperativoVigente: boolean
  fechaYaPaso:             boolean
}

/**
 * Resultado del Motor de Resolución para una ClaseProgramada puntual.
 * Es la única forma en que estado/causa deberían actualizarse — ningún
 * otro módulo decide esto directamente (ver invariantes de Resolución).
 */
export type ResultadoResolucion = {
  estado: EstadoClase
  causa:  Causa
}