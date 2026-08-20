"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import {
  DashboardKPIs,
  TimelineItem,
  ClaseSinCobertura,
  ReemplazoActivoHoy,
  PersonalNoDocenteHoy,
  PendientesDashboard,
  RangoDias,
} from "../types"
import { getDashboardOverview } from "../services/dashboardService"

type DashboardState = {
  kpis:                 DashboardKPIs | null
  sinCobertura:         ClaseSinCobertura[]
  reemplazosActivos:    ReemplazoActivoHoy[]
  personalNoDocenteHoy: PersonalNoDocenteHoy[]
  timeline:             TimelineItem[]
  pendientes:           PendientesDashboard
  loading:              boolean
  error:                string | null
}

const PENDIENTES_VACIO: PendientesDashboard = {
  sinCobertura:           0,
  vencenHoy:              0,
  vencenManana:           0,
  vencenEstaSemana:       0,
  reemplazosVencenSemana: 0,
}

export function useDashboardOverview(diasInicial: RangoDias = 14) {
  const { authHeaders } = useAuth()
  const [dias, setDias] = useState<RangoDias>(diasInicial)
  const [state, setState] = useState<DashboardState>({
    kpis:                 null,
    sinCobertura:         [],
    reemplazosActivos:    [],
    personalNoDocenteHoy: [],
    timeline:             [],
    pendientes:           PENDIENTES_VACIO,
    loading:              true,
    error:                null,
  })

  async function load() {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const data = await getDashboardOverview(authHeaders, dias)
      setState({
        kpis:                 data.kpis ?? null,
        sinCobertura:         data.sinCobertura         ?? [],
        reemplazosActivos:    data.reemplazosActivos    ?? [],
        personalNoDocenteHoy: data.personalNoDocenteHoy ?? [],
        timeline:             data.timeline             ?? [],
        pendientes:           data.pendientes           ?? PENDIENTES_VACIO,
        loading:              false,
        error:                null,
      })
    } catch {
      setState({
        kpis:                 null,
        sinCobertura:         [],
        reemplazosActivos:    [],
        personalNoDocenteHoy: [],
        timeline:             [],
        pendientes:           PENDIENTES_VACIO,
        loading:              false,
        error:                "No se pudo cargar el dashboard",
      })
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders.Authorization, dias])

  return {
    ...state,
    dias,
    setDias,
    refresh: load,
  }
}