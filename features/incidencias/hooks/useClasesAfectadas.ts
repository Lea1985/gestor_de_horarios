// features/incidencias/hooks/useClasesAfectadas.ts
import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import {
  fetchClasesAfectadas,
  fetchAgentes,
  crearReemplazoService,
  eliminarReemplazoService,
} from "../services/incidenciasService"
import type { ClaseAfectada, AgenteParaReemplazo } from "../types"

export type TipoSuplente = "asignacion" | "agente"

// UX-REE-002: error de eliminación de reemplazo atado a un reemplazoId
// puntual, para poder mostrarlo cerca de la fila que lo originó en vez
// de un banner general de la página.
type ErrorEliminarReemplazo = { reemplazoId: number; mensaje: string }

export function useClasesAfectadas(
  incidenciaId: string,
  asignacionTitularId: number,
  onCambio?: () => void | Promise<void>
) {
  const { authHeaders } = useAuth()
  const [clases,       setClases]       = useState<ClaseAfectada[]>([])
  const [agentes,      setAgentes]      = useState<AgenteParaReemplazo[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // modal reemplazo
  const [claseSeleccionada,    setClaseSeleccionada]    = useState<ClaseAfectada | null>(null)
  const [suplenteId,           setSuplenteId]           = useState<string>("")
  const [observacionReemplazo, setObservacionReemplazo] = useState<string>("")
  const [guardandoReemplazo,   setGuardandoReemplazo]   = useState(false)
  const [errorReemplazo,       setErrorReemplazo]       = useState<string | null>(null)

  // UX-REE-002: estado de carga y error por fila para "Quitar" reemplazo.
  const [eliminandoReemplazoId,   setEliminandoReemplazoId]   = useState<number | null>(null)
  const [errorEliminarReemplazo,  setErrorEliminarReemplazo]  = useState<ErrorEliminarReemplazo | null>(null)

  // modal ausencia suplente
  const [modalAusencia, setModalAusencia] = useState(false)

  async function cargar() {
    try {
      setLoading(true)
      setError(null)
      const [c, ag] = await Promise.all([
        fetchClasesAfectadas(incidenciaId, authHeaders),
        fetchAgentes(authHeaders),
      ])
      setClases(c)
      setAgentes(ag)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando clases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization])

  // ── Modal reemplazo ───────────────────────────────────────
  function abrirModal(clase: ClaseAfectada) {
    setClaseSeleccionada(clase)
    setSuplenteId("")
    setObservacionReemplazo("")
    setErrorReemplazo(null)
  }

  function cerrarModal() {
    setClaseSeleccionada(null)
    setErrorReemplazo(null)
  }

  async function confirmarReemplazo() {
    if (!claseSeleccionada || !suplenteId) {
      setErrorReemplazo("Seleccioná un suplente")
      return
    }
    setGuardandoReemplazo(true)
    setErrorReemplazo(null)
    try {
      await crearReemplazoService({
        claseId:             claseSeleccionada.id,
        asignacionTitularId,
        agenteSuplenteId:    Number(suplenteId),
        incidenciaId:        Number(incidenciaId),
        observacion:         observacionReemplazo || undefined,
      }, authHeaders)
      cerrarModal()
      await cargar()
      await onCambio?.()
    } catch (e: unknown) {
      setErrorReemplazo(e instanceof Error ? e.message : "Error creando reemplazo")
    } finally {
      setGuardandoReemplazo(false)
    }
  }

  // UX-REE-002: antes el error de eliminar reemplazo caía en `error`
  // (el mismo estado que usa `cargar()`) y terminaba en el banner
  // general de la página, sin relación visual con la fila que lo
  // originó. Ahora usa su propio estado, atado al reemplazoId.
  async function eliminarReemplazo(reemplazoId: number) {
    setEliminandoReemplazoId(reemplazoId)
    setErrorEliminarReemplazo(null)
    try {
      await eliminarReemplazoService(reemplazoId, authHeaders)
      await cargar()
      await onCambio?.()
    } catch (e: unknown) {
      setErrorEliminarReemplazo({
        reemplazoId,
        mensaje: e instanceof Error ? e.message : "Error de red",
      })
    } finally {
      setEliminandoReemplazoId(null)
    }
  }

  // ── Modal ausencia suplente ───────────────────────────────
  function abrirModalAusencia() {
    setModalAusencia(true)
  }

  function cerrarModalAusencia() {
    setModalAusencia(false)
  }

  return {
    clases, agentes, loading, error,
    claseSeleccionada,
    suplenteId, setSuplenteId,
    observacionReemplazo, setObservacionReemplazo,
    guardandoReemplazo, errorReemplazo,
    abrirModal, cerrarModal, confirmarReemplazo, eliminarReemplazo,
    eliminandoReemplazoId, errorEliminarReemplazo,
    modalAusencia, abrirModalAusencia, cerrarModalAusencia,
  }
}