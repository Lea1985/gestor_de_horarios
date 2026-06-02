// features/asignaciones/types/index.ts

export type TitularVigente = {
  id: number
  agente: {
    id:        number
    nombre:    string
    apellido:  string
    documento: string
  }
}

export type Asignacion = {
  id:                       number
  identificadorEstructural: string
  fecha_inicio:             string
  fecha_fin:                string | null
  estado:                   string
  activo:                   boolean
  deletedAt:                string | null
  titularidades:            TitularVigente[]
  unidad: {
    id:           number
    nombre:       string
    codigoUnidad: number
  }
  materia:  { id: number; nombre: string; cursoId: number | null } | null
  comision: {
    id:     number
    nombre: string
    curso:  { id: number; nombre: string }
    turno:  { id: number; nombre: string }
  } | null
  turno: { id: number; nombre: string } | null
}

export type Agente = {
  id:        number
  nombre:    string
  apellido:  string
  documento: string
}

export type Unidad = {
  id:           number
  nombre:       string
  codigoUnidad: number
}

export type Materia = {
  id:      number
  nombre:  string
  cursoId: number | null
}

export type Comision = {
  id:     number
  nombre: string
  curso:  { id: number; nombre: string }
  turno:  { id: number; nombre: string }
  unidad: { id: number; nombre: string; codigoUnidad: number } | null
}

export type Turno = {
  id:     number
  nombre: string
}

export type AsignacionFormData = {
  agenteId:                 string
  unidadId:                 string
  identificadorEstructural: string
  fecha_inicio:             string
  fecha_fin:                string
  materiaId:                string
  cursoId:                  string
  comisionId:               string
  turnoId:                  string
}

export const FORM_VACIO: AsignacionFormData = {
  agenteId: "", unidadId: "", identificadorEstructural: "",
  fecha_inicio: "", fecha_fin: "", materiaId: "",
  cursoId: "", comisionId: "", turnoId: "",
}

export function titularVigente(a: Asignacion) {
  return a.titularidades[0]?.agente ?? null
}