// app/hooks/useAuth.ts
"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  }

  return { token, authHeaders }
}