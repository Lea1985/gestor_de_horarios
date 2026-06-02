// features/incidencias/index.ts
export { IncidenciasTable }        from "./components/IncidenciasTable"
export { IncidenciaFilters }       from "./components/IncidenciaFilters"
export { ModalConfirmar }          from "./components/ModalConfirmar"
export { Stepper }                 from "./components/Stepper"
export { PasoSeleccion }           from "./components/PasoSeleccion"
export { PasoRevision }            from "./components/PasoRevision"
export { PasoFormulario }          from "./components/PasoFormulario"
export { PasoReemplazos }          from "./components/PasoReemplazos"
export { ResultadoCarga }          from "./components/ResultadoCarga"
export { Campo }                   from "./components/Campo"
export { LinkIncidencia }          from "./components/LinkIncidencia"
export { IncidenciaDetalleHeader } from "./components/IncidenciaDetalleHeader"
export { CadenaTable }             from "./components/CadenaTable"
export { EditarIncidenciaForm }    from "./components/EditarIncidenciaForm"
export { ClasesAfectadasTable }    from "./components/ClasesAfectadasTable"
export { ModalReemplazo }          from "./components/ModalReemplazo"
export { ModalAusenciaSuplente }   from "./components/ModalAusenciaSuplente"
export { useIncidencias }          from "./hooks/useIncidencias"
export { useNuevaIncidencia }      from "./hooks/useNuevaIncidencia"
export { useIncidenciaDetalle }    from "./hooks/useIncidenciaDetalle"
export { useEditarIncidencia }     from "./hooks/useEditarIncidencia"
export { useClasesAfectadas }      from "./hooks/useClasesAfectadas"
export type {
  Incidencia,
  IncidenciaDetalle,
  CadenaItem,
  ClaseAfectada,
  ReemplazoClase,
  AsignacionParaIncidencia,
  AgenteParaReemplazo,
  DatosComunes,
  ResultadoCarga as TResultadoCarga,
} from "./types"