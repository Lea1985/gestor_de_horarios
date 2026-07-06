// features/dashboard/hooks/useRankings.ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { fetchRankings } from "../services/rankingsService"
import { RangoRankings, RankingsData } from "../types/rankings"

interface UseRankingsReturn {
  data:     RankingsData | null
  loading:  boolean
  error:    string | null
  rango:    RangoRankings
  setRango: (r: RangoRankings) => void
  refetch:  () => void
}

export function useRankings(initialRango: RangoRankings = "anio"): UseRankingsReturn {
  const { authHeaders } = useAuth()
  const [data,    setData]    = useState<RankingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [rango,   setRango]   = useState<RangoRankings>(initialRango)

  // Guardar authHeaders en un ref para no incluirlo como dependencia del efecto
  const headersRef = useRef(authHeaders)
  useEffect(() => { headersRef.current = authHeaders }, [authHeaders])

  const token = authHeaders.Authorization

  const fetch_ = useCallback(async () => {
    if (token === "Bearer ") return
    setLoading(true)
    setError(null)
    try {
      const d = await fetchRankings(rango, headersRef.current)
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [token, rango])  // solo el string del token y el rango — ambos son primitivos estables

  useEffect(() => { fetch_() }, [fetch_])

  return { data, loading, error, rango, setRango, refetch: fetch_ }
}
