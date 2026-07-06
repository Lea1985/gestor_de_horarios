// features/dashboard/hooks/useCoberturaPorComision.ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { CoberturaPorComision } from "@/lib/reporting/datasets/obtenerCoberturaPorComision"

interface UseCoberturaPorComisionReturn {
  data:              CoberturaPorComision[]
  loading:           boolean
  error:             string | null
  comisionSeleccionada: CoberturaPorComision | null
  seleccionarComision:  (c: CoberturaPorComision | null) => void
  refetch:           () => void
}

export function useCoberturaPorComision(
  dias:   number,
  limite: number = 3,
): UseCoberturaPorComisionReturn {
  const { authHeaders } = useAuth()
  const headersRef = useRef(authHeaders)
  useEffect(() => { headersRef.current = authHeaders }, [authHeaders])

  const token = authHeaders.Authorization

  const [data,    setData]    = useState<CoberturaPorComision[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [comisionSeleccionada, setComisionSeleccionada] = useState<CoberturaPorComision | null>(null)

  const fetch_ = useCallback(async () => {
    if (token === "Bearer ") return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ dias: String(dias), limite: String(limite) })
      const res = await fetch(`/api/dashboard/cobertura-comisiones?${params}`, { headers: headersRef.current })
      if (!res.ok) throw new Error("Error al obtener cobertura por comisión")
      const json: CoberturaPorComision[] = await res.json()
      setData(json)
      // Si había una seleccionada, actualizamos sus datos frescos
      setComisionSeleccionada(prev =>
        prev ? (json.find(c => c.comisionId === prev.comisionId) ?? null) : null
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [token, dias, limite])

  useEffect(() => { fetch_() }, [fetch_])

  return {
    data,
    loading,
    error,
    comisionSeleccionada,
    seleccionarComision: setComisionSeleccionada,
    refetch: fetch_,
  }
}
