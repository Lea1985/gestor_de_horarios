"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import {
  DashboardKPIs,
  TimelineItem,
} from "../types"

import { getDashboardOverview } from "../services/dashboardService"

type DashboardState = {
  kpis: DashboardKPIs | null
  timeline: TimelineItem[]
  loading: boolean
}

export function useDashboardOverview() {
  const { authHeaders } = useAuth()

  const [state, setState] = useState<DashboardState>({
    kpis: null,
    timeline: [],
    loading: true,
  })

  async function load() {
    try {
      setState((prev) => ({
        ...prev,
        loading: true,
      }))

      const data = await getDashboardOverview(authHeaders)

      setState({
        kpis: data.kpis,
        timeline: data.timeline ?? [],
        loading: false,
      })

    } catch {
      setState({
        kpis: null,
        timeline: [],
        loading: false,
      })
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") {
      load()
    }
  }, [authHeaders.Authorization])

  return {
    ...state,
    refresh: load,
  }
}