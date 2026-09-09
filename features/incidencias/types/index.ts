// features/incidencias/types/index.ts
export type Incidencia = {
  id:           number
  asignacionId: number
  fecha_desde:  string
  fecha_hasta:  string
  observacion:  string | null
  activo:       boolean
  deletedAt:    string | null
  asignacion?: {
    identificadorEstructural: string
    titularidades: {
          fecha_desde: string
          fecha_hasta: string | null
          agente: { nombre: string; apellido: string }
        }[]
    unidad:   { nombre: string; codigoUnidad: number }
    materia:  { nombre: string } | null
    comision: {
      nombre: string
      curso:  { nombre: string }
      turno:  { nombre: string }
    } | null
    turno:    { nombre: string } | null
  }
  codigarioItem?: { codigo: string; nombre: string }
  padre?:         { id: number } | null
  hijos?:         { id: number }[]
  agenteMostrado: { nombre: string; apellido: string; documento?: string } | null
}
export type IncidenciaDetalle = {
  id:           number
  asignacionId: number
  fecha_desde:  string
  fecha_hasta:  string
  raizFechaDesde: string
  observacion:  string | null
  activo:       boolean
  deletedAt:    string | null
  asignacion?: {
    identificadorEstructural: string
    titularidades: {
      fecha_desde: string
      fecha_hasta: string | null
      agente: { nombre: string; apellido: string; documento: string }
    }[]
    unidad: { nombre: string; codigoUnidad: number }
    comision: {
      nombre: string
      curso:  { nombre: string }
    } | null
  }
  codigarioItem?: { codigo: string; nombre: string }
  padre?: {
    id:          number
    fecha_desde: string
    fecha_hasta: string
    codigarioItem?: { codigo: string; nombre: string }
    asignacion?: {
      identificadorEstructural: string
      titularidades: {
        fecha_desde: string
        fecha_hasta: string | null
        agente: { nombre: string; apellido: string; documento: string }
      }[]
      unidad: { nombre: string; codigoUnidad: number }
      comision: {
        nombre: string
        curso:  { nombre: string }
      } | null
    }
    // NUEVO: suplente que cubría en la incidencia padre
    ClaseProgramada?: {
      reemplazos: {
        agenteSuplente: { nombre: string; apellido: string } | null
      }[]
    }[]
  } | null
  hijos?: { id: number }[]
}
export type CadenaItem = {
  id:          number
  fecha_desde: string
  fecha_hasta: string
  tipo?:       string
  reemplazante: {
    nombre:    string
    documento: string
  } | null
}
export type ReemplazoClase = {
  id:                  number
  asignacionTitularId: number
  activo:              boolean
  asignacionSuplente?: {
    identificadorEstructural: string
    titularidades: {
      agente: { nombre: string; apellido: string; documento: string }
    }[]
  } | null
  agenteSuplente?: {
    id:        number
    nombre:    string
    apellido:  string
    documento?: string
  } | null
}
export type ClaseAfectada = {
  id:     number
  fecha:  string
  estado: "PROGRAMADA" | "DICTADA" | "SUSPENDIDA" | "REEMPLAZADA"
  modulo?: {
    dia_semana: string
    hora_desde: number
    hora_hasta: number
  } | null
  unidad:   { nombre: string; codigoUnidad: number }
  comision?: { id: number; nombre: string } | null
  reemplazos: ReemplazoClase[]
}
export type AsignacionParaIncidencia = {
  id:                       number
  identificadorEstructural: string
  titularidades: {
    agente: { nombre: string; apellido: string; documento: string }
  }[]
  unidad:   { nombre: string }
  comision: { id: number; nombre: string; curso?: { id: number; nombre: string } } | null
  turno:    { id: number; nombre: string } | null
  // UX-INC-014: false cuando la asignación no tiene ninguna ClaseProgramada
  // de hoy en adelante -- no se puede cargar una incidencia sin importar
  // qué rango de fechas se elija después.
  tieneClasesVigentes: boolean
}
export type AgenteParaReemplazo = {
  id:        number
  nombre:    string
  apellido:  string
  documento: string
}
export type Codigario     = { id: number; nombre: string }
export type CodigarioItem = { id: number; codigo: string; nombre: string }
export type DatosComunes = {
  codigarioId:     string
  codigarioItemId: string
  fecha_desde:     string
  fecha_hasta:     string
  observacion:     string
}
export type ResultadoCarga = {
  asignacionId:  number
  identificador: string
  agente:        string
  ok:            boolean
  error?:        string
}
// UX-INC-002: resultado de cada intento de POST /api/reemplazos en el
// paso 4 del wizard de "Nueva incidencia". Antes esto se descartaba
// (Promise.all sin capturar resultados) y el usuario nunca se enteraba
// de qué clases quedaron sin reemplazo por un error del servidor.
export type ResultadoReemplazo = {
  claseId:       number
  identificador: string
  agente:        string
  fecha:         string
  modulo:        string
  ok:            boolean
  error?:        string
}
export const DATOS_VACIO: DatosComunes = {
  codigarioId: "", codigarioItemId: "", fecha_desde: "", fecha_hasta: "", observacion: "",
}
export type TramoCobertura = {
  desde:    string
  hasta:    string
  suplente: { id: number; nombre: string; apellido: string } | null
}
// UX-101: separar incidencias del período activo de las históricas.
export type PeriodoOperativo = {
  id:          number
  nombre:      string
  fecha_desde: string
  fecha_hasta: string
  estado:      string
}
