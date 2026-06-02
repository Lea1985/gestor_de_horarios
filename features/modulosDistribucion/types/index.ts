// features/modulosDistribucion/types/index.ts

export type Modulo = {
  id:         number
  dia_semana: string
  hora_desde: number
  hora_hasta: number
}

export type Distribucion = {
  id:      number
  version: number
  estado:  string
  asignacion: {
    identificadorEstructural: string
    titularidades?: { agente: { nombre: string; apellido: string } }[]
  }
  distribucionModulos: { moduloHorarioId: number }[]
}

export const ORDEN_DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]

export const LABEL_DIAS: Record<string, string> = {
  LUNES:     "Lunes",
  MARTES:    "Martes",
  MIERCOLES: "Miércoles",
  JUEVES:    "Jueves",
  VIERNES:   "Viernes",
  SABADO:    "Sábado",
  DOMINGO:   "Domingo",
}