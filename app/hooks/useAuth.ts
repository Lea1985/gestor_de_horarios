// app/hooks/useAuth.ts
"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

let fetchPatched = false

export function useAuth() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = sessionStorage.getItem("token")

    if (!t) {
      router.push("/public/login")
      return
    }

    setToken(t)
  }, [router])

  // UX-ADM-006: ninguna pantalla distinguía un 401 (sesión inválida/expirada)
  // de un error genérico -- cada fetch mostraba su propio mensaje fijo tipo
  // "Error cargando X". useAuth() se llama en todas las pantallas protegidas,
  // así que en vez de tocar cada una, se intercepta acá una sola vez el
  // fetch global: cualquier 401 de cualquier pantalla limpia la sesión y
  // redirige al login con un mensaje claro. Se excluye /api/auth/login
  // porque ahí un 401 es "contraseña incorrecta", no "sesión inválida".
  useEffect(() => {
    if (fetchPatched) return
    fetchPatched = true

    const fetchOriginal = window.fetch.bind(window)
    window.fetch = (async (...args: Parameters<typeof fetch>) => {
      const response = await fetchOriginal(...args)
      const input = args[0]
      const url =
        typeof input === "string" ? input :
        input instanceof URL ? input.toString() :
        input.url

      if (response.status === 401 && !url.includes("/api/auth/login")) {
        sessionStorage.removeItem("token")
        sessionStorage.setItem("sesionExpirada", "1")
        router.push("/public/login")
      }

      return response
    }) as typeof fetch
  }, [router])

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  }

  return { token, authHeaders }
}
