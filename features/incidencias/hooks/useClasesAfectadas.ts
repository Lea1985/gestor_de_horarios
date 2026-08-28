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

  async function eliminarReemplazo(reemplazoId: number) {
    try {
      await eliminarReemplazoService(reemplazoId, authHeaders)
      await cargar()
      await onCambio?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error eliminando reemplazo")
    }
  }

  // ── Modal ausencia suplente ───────────────────────────────
  // UX-102: ya no recibe reemplazoId/nombreSuplente -- el modal deduce
  // el suplente correspondiente a partir de las fechas que carga el
  // usuario y de `clases` (con sus reemplazos por tramo), en vez de
  // depender de cuál botón se apretó.
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
    modalAusencia, abrirModalAusencia, cerrarModalAusencia,
  }
}