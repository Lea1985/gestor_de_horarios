// features/modulosDistribucion/components/ModulosGrid.tsx

import { minutosAHora } from "@/lib/helpers/tiempo"
import type { Modulo } from "../types"
import { ORDEN_DIAS, LABEL_DIAS } from "../types"

type Props = {
  agrupados:           Map<string, Modulo[]>
  seleccionados:       number[]
  checkboxHabilitado:  boolean
  onToggle:            (moduloId: number) => void
  onToggleDia:         (dia: string) => void
}

export function ModulosGrid({
  agrupados, seleccionados, checkboxHabilitado, onToggle, onToggleDia,
}: Props) {
  if (agrupados.size === 0) return null

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-3)", alignItems: "start" }}>
      {ORDEN_DIAS.map(dia => {
        const lista = agrupados.get(dia) ?? []
        if (lista.length === 0) return null

        const todosDelDia        = lista.map(m => m.id)
        const todosSeleccionados = todosDelDia.every(id => seleccionados.includes(id))
        const algunoSeleccionado = todosDelDia.some(id => seleccionados.includes(id))

        return (
          <div
            key={dia}
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", opacity: checkboxHabilitado ? 1 : 0.75 }}
          >
            {/* Header del día */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 12px", borderBottom: "1px solid var(--color-border)", background: algunoSeleccionado ? "var(--color-surface-raised)" : "var(--color-surface)", cursor: checkboxHabilitado ? "pointer" : "default" }}
              onClick={() => onToggleDia(dia)}
            >
              <input
                type="checkbox"
                checked={todosSeleccionados}
                ref={el => { if (el) el.indeterminate = algunoSeleccionado && !todosSeleccionados }}
                onChange={() => onToggleDia(dia)}
                onClick={e => e.stopPropagation()}
                disabled={!checkboxHabilitado}
                style={{ cursor: checkboxHabilitado ? "pointer" : "default" }}
              />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
                {LABEL_DIAS[dia]}
              </span>
              <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)", marginLeft: "auto" }}>
                {todosDelDia.filter(id => seleccionados.includes(id)).length}/{lista.length}
              </span>
            </div>

            {/* Módulos del día */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {lista.map(m => {
                const sel = seleccionados.includes(m.id)
                return (
                  <label
                    key={m.id}
                    style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "8px 12px", cursor: checkboxHabilitado ? "pointer" : "default", background: sel ? "var(--color-accent-bg, #f0f8ff)" : "transparent", borderBottom: "1px solid var(--color-border)", transition: "background 0.1s" }}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => onToggle(m.id)}
                      disabled={!checkboxHabilitado}
                      style={{ cursor: checkboxHabilitado ? "pointer" : "default" }}
                    />
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                      {minutosAHora(m.hora_desde)}–{minutosAHora(m.hora_hasta)}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}