# Design System — ALNEXT
> v1.0 · Aplicaciones de gestión SaaS  
> **Principio rector: claridad > estética**

---

## 1. Fundamento

El sistema de diseño de ALNEXT está pensado para aplicaciones de gestión donde el usuario necesita operar con velocidad y confianza. Cada decisión de diseño parte de este orden de prioridades:

1. **Legibilidad** — el usuario entiende sin esfuerzo
2. **Consistencia** — el sistema se comporta igual en todas las pantallas
3. **Velocidad de uso** — el flujo no se interrumpe
4. **Escalabilidad** — agregar módulos no rompe lo existente

---

## 2. Design Tokens

Definición centralizada. **Nunca usar valores hardcodeados — siempre variables CSS.**

```css
:root {
  /* ─── Brand ─────────────────────────────── */
  --color-primary:        #0A2540;   /* navy del logo */
  --color-primary-hover:  #163A5F;
  --color-primary-subtle: #E8EFF6;   /* fondos suaves primario */

  /* ─── Accent (teal del logo) ─────────────── */
  --color-accent:         #1E9BB8;
  --color-accent-hover:   #1787A0;
  --color-accent-light:   #D0F0F7;   /* backgrounds info suave */

  /* ─── Estados semánticos ─────────────────── */
  --color-success:        #00A86B;
  --color-success-bg:     #D1F5E7;
  --color-error:          #E5484D;
  --color-error-bg:       #FDE8E8;
  --color-warning:        #F5A524;
  --color-warning-bg:     #FEF3D7;

  /* ─── Fondos & superficies ───────────────── */
  --color-bg:             #F7F9FC;   /* fondo de página */
  --color-surface:        #FFFFFF;   /* cards, modales */
  --color-surface-raised: #F1F4F8;   /* hover de filas, surface secundaria */
  --color-surface-dark:   #0F172A;   /* dark mode base */

  /* ─── Texto ──────────────────────────────── */
  --color-text-primary:   #1A1A1A;
  --color-text-secondary: #6B7280;
  --color-text-hint:      #9CA3AF;
  --color-text-on-dark:   #F1F5F9;   /* texto sobre fondos navy/dark */

  /* ─── Bordes ─────────────────────────────── */
  --color-border:         #E5E7EB;
  --color-border-strong:  #D1D5DB;

  /* ─── Tipografía ─────────────────────────── */
  --text-2xs: 11px;   /* labels de sección en uppercase */
  --text-xs:  12px;   /* captions, hints, badges */
  --text-sm:  14px;   /* labels, tabla, form fields */
  --text-base:16px;   /* cuerpo principal */
  --text-lg:  18px;   /* card titles */
  --text-xl:  24px;   /* section headings */
  --text-2xl: 32px;   /* page titles */

  /* ─── Espaciado (base 4px) ───────────────── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
  --space-12: 48px;

  /* ─── Z-index ────────────────────────────── */
  --z-base:     0;
  --z-dropdown: 10;
  --z-sidebar:  100;
  --z-topbar:   200;
  --z-modal:    300;
  --z-toast:    400;

  /* ─── Border radius ──────────────────────── */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;
}
```

---

## 3. Tipografía

### Familias

```css
/* UI principal */
body {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-primary);
}

/* Código, valores numéricos, datos */
.mono {
  font-family: 'DM Mono', 'Fira Code', monospace;
}
```

### Pesos — solo dos

```css
/* Regular — cuerpo, valores, descripciones */
font-weight: 400;

/* Medium — títulos, labels, nombres de columna */
font-weight: 500;
```

> ⚠️ **Regla:** nunca usar `600` ni `700`. Se ve pesado en interfaces de gestión.

### Escala

| Token | Tamaño | Uso |
|---|---|---|
| `--text-2xl` | 32px · 500 | Page title (H1) |
| `--text-xl` | 24px · 500 | Section heading (H2) |
| `--text-lg` | 18px · 500 | Card title (H3) |
| `--text-base` | 16px · 400 | Cuerpo principal |
| `--text-sm` | 14px · 400 | Labels, tabla, inputs |
| `--text-xs` | 12px · 400 | Captions, hints, badges |
| `--text-2xs` | 11px · 500 uppercase | Section labels |

---

## 4. Espaciado

**Regla:** solo los valores de la escala. Sin valores fuera de ella.

| Token | Valor | Uso típico |
|---|---|---|
| `--space-1` | 4px | Gaps internos, íconos |
| `--space-2` | 8px | Padding xs, label → input |
| `--space-3` | 12px | Padding sm, gaps en listas |
| `--space-4` | 16px | Padding base, gap de cards |
| `--space-6` | 24px | Separación de secciones |
| `--space-8` | 32px | Padding de página |
| `--space-12` | 48px | Separación de módulos |

---

## 5. Z-Index

**Regla:** nunca usar valores ad-hoc como `z-index: 9999`. Solo estos 6 niveles.

```css
--z-base:      0;    /* contenido normal */
--z-dropdown:  10;   /* selects, popovers */
--z-sidebar:   100;  /* nav lateral */
--z-topbar:    200;  /* header fijo */
--z-modal:     300;  /* modales y overlays */
--z-toast:     400;  /* notificaciones temporales */
```

---

## 6. Componentes Base

### Botón Primario

```css
.btn {
  border-radius: var(--radius-lg);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s, opacity 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}
.btn-primary:hover  { background: var(--color-primary-hover); }
.btn-primary:active { opacity: 0.9; transform: scale(0.99); }

.btn-accent {
  background: var(--color-accent);
  color: white;
}
.btn-accent:hover { background: var(--color-accent-hover); }

.btn-ghost {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-strong);
}
.btn-ghost:hover { background: var(--color-surface-raised); }

.btn-danger {
  background: var(--color-error);
  color: white;
}

/* Estado deshabilitado — aplica a todos */
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Input

```css
.input-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
  display: block;
}

.input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  width: 100%;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(30, 155, 184, 0.12);
}

.input.error {
  border-color: var(--color-error);
}
.input.error:focus {
  box-shadow: 0 0 0 3px rgba(229, 72, 77, 0.12);
}

.input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: var(--color-surface-raised);
}

.input-helper { font-size: var(--text-xs); color: var(--color-text-hint); margin-top: 3px; }
.input-error  { font-size: var(--text-xs); color: var(--color-error); margin-top: 3px; }
```

### Card

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4) var(--space-6);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

/* Métrica / KPI */
.metric-card {
  background: var(--color-surface-raised);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
.metric-label { font-size: var(--text-2xs); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-hint); margin-bottom: var(--space-1); }
.metric-value { font-size: var(--text-xl); font-weight: 500; color: var(--color-text-primary); }
```

### Tabla

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  background: var(--color-surface);
}

.table th {
  text-align: left;
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border-strong);
  background: var(--color-surface-raised);
}

.table td {
  padding: 10px var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.table tr:last-child td { border-bottom: none; }
.table tbody tr:hover td { background: var(--color-surface-raised); }
```

### Badge

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: var(--text-xs);
  font-weight: 500;
}

.badge-success { background: var(--color-success-bg); color: #005F3E; }
.badge-error   { background: var(--color-error-bg);   color: #9B1B1D; }
.badge-warning { background: var(--color-warning-bg); color: #7A4E00; }
.badge-info    { background: var(--color-accent-light); color: #0D5F72; }
.badge-neutral {
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
```

---

## 7. Layout Base

```
┌──────────────────────────────────────────────┐
│  Topbar  (z: 200, fondo: surface, border-bottom)│
├──────────┬───────────────────────────────────┤
│          │  Content (fondo: --color-bg)       │
│ Sidebar  │  ┌─────────────────────────────┐  │
│ (navy)   │  │  Cards / KPIs               │  │
│          │  ├─────────────────────────────┤  │
│ z: 100   │  │  Tabla / Form / Detalle     │  │
│          │  └─────────────────────────────┘  │
└──────────┴───────────────────────────────────┘
```

### Sidebar

```css
.sidebar {
  background: var(--color-primary);
  color: var(--color-text-on-dark);
  width: 220px;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: var(--z-sidebar);
  padding: var(--space-4);
}

.sidebar-item {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.sidebar-item:hover  { background: rgba(255,255,255,0.07); color: white; }
.sidebar-item.active { background: rgba(30,155,184,0.25); color: white; }
```

### Topbar

```css
.topbar {
  position: fixed;
  top: 0; left: 220px; right: 0;
  height: 56px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  z-index: var(--z-topbar);
  display: flex;
  align-items: center;
  padding: 0 var(--space-8);
}
```

### Breakpoints

| Nombre | Rango | Comportamiento sidebar |
|---|---|---|
| Mobile | < 768px | Oculta → hamburger / bottom nav |
| Tablet | 768–1024px | Solo íconos (width: 56px) |
| Desktop | ≥ 1024px | Completa con texto (width: 220px) |

---

## 8. Dark Mode

Planificado desde el inicio. Variables que cambian en modo oscuro:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:             #0F172A;
    --color-surface:        #1E293B;
    --color-surface-raised: #273548;
    --color-border:         rgba(255,255,255,0.08);
    --color-border-strong:  rgba(255,255,255,0.14);
    --color-text-primary:   #F1F5F9;
    --color-text-secondary: #94A3B8;
    --color-text-hint:      #64748B;
  }
}
```

> ⚠️ **Regla:** toda variable nueva debe tener su equivalente dark. No se agrega después.

---

## 9. Reglas de Diseño

1. **Solo tokens, nunca hardcode** — ningún color ni spacing directo en componentes
2. **Reutilizar antes de crear** — verificar si existe un componente adaptable
3. **Funcionalidad antes que estética** — claridad primero, decoración después
4. **Solo 2 pesos tipográficos** — 400 regular, 500 medium. Nunca 600/700
5. **Dark mode desde el inicio** — toda variable tiene su equivalente oscuro
6. **Z-index solo los 6 niveles definidos** — sin valores ad-hoc
7. **Espaciado solo de la escala** — sin valores intermedios inventados
8. **Accent = teal del logo** — el violeta no tiene relación con la identidad visual

---

## 10. Stack Técnico

**Recomendado:**

- **Next.js** — framework principal
- **Tailwind CSS** — utilities mapeadas a los design tokens
- **shadcn/ui** — componentes accesibles que usan CSS variables nativas

> Tailwind y Bootstrap juntos son redundantes. Elegir uno. Para SaaS de gestión, Tailwind + shadcn/ui es la opción con mejor ratio de velocidad / calidad.

---

## 11. Principios de Evolución

El sistema debe:

- Escalar sin romper componentes existentes
- Permitir agregar nuevos módulos cambiando solo tokens, no componentes
- Mantener consistencia visual sin esfuerzo extra por parte del equipo

> Cualquier nuevo token que se agregue al sistema debe documentarse aquí antes de usarse en producción.
