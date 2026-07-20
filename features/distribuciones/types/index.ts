// features/distribuciones/types/index.ts
// Tipos de dominio de la feature Distribuciones.
// Extraídos de app/protected/dashboard/distribuciones/page.tsx — paso 1.

export type Distribucion = {
  id:                   number
  asignacionId:         number
  version:              number
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string | null
  estado:               string
  _count: { distribucionModulos: number }
  distribucionModulos: { moduloHorario: { dia_semana: string } }[]
  asignacion: {
    identificadorEstructural: string
    titularidades?: { agente: { nombre: string; apellido: string } }[]
    curso?:  { nombre: string } | null
    turno?:  { nombre: string } | null
  }
}

export type Asignacion = {
  id: number
  identificadorEstructural: string
  titularidades: { agente: { nombre: string; apellido: string } }[]
  curso:   { nombre: string } | null
  turno:   { nombre: string } | null
  materia: { nombre: string } | null
}

export type DistribucionFormData = {
  asignacionId:         string
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string
}

export const FORM_VACIO: DistribucionFormData = {
  asignacionId:         "",
  fecha_vigencia_desde: "",
  fecha_vigencia_hasta: "",
}

export type IncidenciaAfectada = {
  incidenciaId: number
  fecha_desde: string
  fecha_hasta: string
  codigario: string | null
  observacion: string | null
  totalClasesConReemplazo: number
  migrable: boolean
  suplente: { asignacionTitularId: number; agenteSuplenteId: number; nombre: string } | null
}

export type TramoReemplazo = {
  desde:               string
  hasta:               string
  totalClases:         number
  clasesConReemplazo:  number
  migrable:            boolean
  suplente: {
    asignacionTitularId: number
    agenteSuplenteId:    number
    nombre:              string
  } | null
}

export type EliminarDistribucionResult = {
  ok:                     boolean
  deleted?:               boolean
  requiereConfirmacion?:  boolean
  tramos?:                TramoReemplazo[]
  clasesSuspendidas?:     number
  avisoReemplazoNoAplica?: boolean
}
