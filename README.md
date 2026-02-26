# 🧩 Sistema de Gestión Horaria Estructural

---

## 📌 Propósito

Infraestructura SaaS para gestionar asignaciones, distribución horaria versionada e incidencias operativas en organizaciones que estructuran su actividad mediante bloques horarios.

El sistema permite:

- Administrar personas y unidades organizativas.
- Gestionar asignaciones estructurales.
- Versionar distribución horaria con vigencias inmutables.
- Registrar incidencias por rango completo.
- Gestionar reemplazos parciales mediante encadenamiento.
- Consolidar carga horaria histórica por persona y unidad.
- Mantener trazabilidad estructural completa.

---

## 🎯 Enfoque

El núcleo del sistema es estructural y transversal.

No depende de normativa específica.  
Las reglas regulatorias se gestionan como extensiones opcionales, sin afectar el núcleo.

Puede aplicarse en:

- Instituciones educativas
- Academias
- Clubes deportivos
- Gimnasios
- Organizaciones con estructura horaria formal

El objetivo es construir una base confiable, simple y extensible.

---

## 🧭 Filosofía de diseño

- La verdad del sistema es la **distribución horaria versionada**.
- El historial es **inmutable**.
- Las validaciones críticas protegen la coherencia estructural.
- Las incidencias se registran por **rango completo**.
- Una incidencia puede tener múltiples incidencias hijas siempre que no se superpongan entre sí.
- No se editan registros históricos: se crean nuevas versiones o nuevas incidencias.
- El núcleo debe operar en cualquier organización estructurada por horarios.

---

## 🧠 Principios estructurales del núcleo V1

- Multi-tenant obligatorio (aislamiento por institución).
- Versionado incremental obligatorio en distribución horaria.
- Inmutabilidad estricta de historial.
- No se permite superposición horaria dentro de la misma asignación.
- Incidencias no editables.
- Encadenamiento en árbol (no solo cadena lineal).

El V1 no incluye:

- Motor legal complejo.
- Liquidación.
- Automatización normativa avanzada.
- Reglas regulatorias sofisticadas.

---

## 📘 Documentación

- `docs/` → Documentación viva del producto (arquitectura, reglas de negocio y decisiones técnicas).
- `sprints/` → Registro histórico del proceso iterativo.
- `product-backlog.md` → Lista priorizada de funcionalidades.
- `CHANGELOG.md` → Historial de cambios relevantes del sistema.

---

## 📂 Estructura del proyecto
nuevoSistema/
│
├── README.md
├── product-backlog.md
├── CHANGELOG.md
│
├── docs/
│ ├── arquitectura_v1.md
│ ├── reglas_negocio.md
│ ├── decisiones.md
│
├── sprints/
│ ├── sprint-1/
│ │ ├── sprint-planning.md
│ │ ├── sprint-backlog.md
│ │ └── sprint-review-retrospective.md
│ │
│ ├── sprint-2/
│ │ ├── sprint-planning.md
│ │ ├── sprint-backlog.md
│ │ └── sprint-review-retrospective.md
│
├── src/
│ ├── domain/
│ │ ├── institucion/
│ │ ├── persona/
│ │ ├── unidadOrganizativa/
│ │ ├── asignacion/
│ │ ├── distribucionHoraria/
│ │ ├── moduloHorario/
│ │ └── incidencia/
│ │
│ ├── application/
│ │ ├── persona/
│ │ ├── unidadOrganizativa/
│ │ ├── asignacion/
│ │ ├── incidencia/
│ │ └── institucion/
│ │
│ ├── infrastructure/
│ │ ├── prisma/
│ │ ├── auth/
│ │ ├── config/
│ │ └── logging/
│ │
│ ├── interfaces/
│ │ └── http/
│ │ ├── controllers/
│ │ ├── routes/
│ │ └── middlewares/
│ │
└── main.ts


---

## 🏗️ Metodología

El proyecto adopta una estructura basada en Scrum, manteniendo documentación viva dentro del mismo repositorio.

Se busca:

- Reducir incertidumbre antes de implementar.
- Definir reglas estructurales claras antes de codificar.
- Mantener trazabilidad de decisiones.
- Construir incrementos funcionales en cada sprint.
- Permitir evolución controlada del modelo de dominio.
- Facilitar implementación progresiva con apoyo de herramientas de asistencia.

---

## 🚀 Objetivo del MVP

Validar que el sistema funciona como infraestructura estructural confiable, coherente e históricamente trazable para organizaciones con gestión horaria formal.