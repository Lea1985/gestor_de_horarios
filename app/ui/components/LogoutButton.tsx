"use client"

import { useState }    from "react"
import { useRouter }   from "next/navigation"

export function LogoutButton() {
  const router          = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)

    try {
      // TODO: cuando migrés a cookie httpOnly, este header
      // ya no va a ser necesario — la cookie se envía automáticamente
      const token = sessionStorage.getItem("token")

      await fetch("/api/auth/logout", {
        method:  "POST",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      })
    } catch {
      // Si el fetch falla igual limpiamos la sesión local
      // y redirigimos — mejor experiencia que quedar trabado
    } finally {
      sessionStorage.removeItem("token")
      router.push("/public/login")
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        width:          "100%",
        display:        "flex",
        alignItems:     "center",
        gap:            "var(--space-2)",
        padding:        "var(--space-2) var(--space-3)",
        borderRadius:   "var(--radius-lg)",
        border:         "none",
        background:     "transparent",
        color:          loading
                          ? "rgba(241, 245, 249, 0.35)"
                          : "rgba(241, 245, 249, 0.65)",
        fontSize:       "var(--text-sm)",
        fontWeight:     "var(--font-regular)",
        cursor:         loading ? "not-allowed" : "pointer",
        textAlign:      "left",
        transition:     "background 0.12s, color 0.12s",
      }}
      onMouseEnter={e => {
        if (!loading) {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(229,72,77,0.12)"
          ;(e.currentTarget as HTMLButtonElement).style.color     = "#FDA4A5"
        }
      }}
      onMouseLeave={e => {
        if (!loading) {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent"
          ;(e.currentTarget as HTMLButtonElement).style.color     = "rgba(241, 245, 249, 0.65)"
        }
      }}
      aria-busy={loading}
    >
      {/* Ícono */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M9 10l3-3-3-3M12 7H5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {loading ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  )
}
