---
# 🛠 Sprint Backlog – Sprint 01
---

## 🔵 1. Infraestructura Base (Next.js Fullstack)

### 🟢 1.1 Inicialización del Proyecto

- Crear proyecto Next.js con TypeScript
- Configurar estructura por capas:
  - `/domain`
  - `/application`
  - `/infrastructure`
  - `/app` (UI + API routes)
- Configurar ESLint + Prettier
- Configurar variables de entorno

---

### 🟢 1.2 Base de Datos

- Instalar y configurar Prisma
- Configurar PostgreSQL
- Definir conexión en `.env`
- Crear primera migración

---

## 🔵 2. Modelado Base del Dominio

### 🟢 2.1 Schema Inicial Prisma

Definir modelos base:

- Persona
- Escuela
- Curso
- Comisión
- Cargo
- MóduloHorario
- CargoModuloHorario
- Artículo
- Ausencia

(Sin lógica avanzada todavía)

---

### 🟢 2.2 Seeds Iniciales

- Días de semana
- Módulos horarios institucionales

---

## 🔵 3. Validaciones Técnicas Iniciales

- Constraint único SARH
- Constraint único DNI
- Relaciones obligatorias básicas
- Restricciones NOT NULL necesarias

(Sin validación compleja aún)

---

## 🔵 4. Organización de Trabajo

- Crear plantilla estándar de Sprint Backlog
- Definir estructura fija de documentación por sprint:
  - Planning
  - Backlog
  - Review
  - Retrospective

---

# 📊 Definition of Done (DoD)

El sprint se considera terminado cuando:

- El proyecto corre localmente con `npm run dev`
- Prisma está conectado a PostgreSQL
- Migración inicial aplicada correctamente
- Base de datos creada con tablas base
- Seeds ejecutados correctamente
- Documentación del sprint almacenada en `/docs/sprints/sprint-01`
- Todo committeado y pusheado a GitHub

---

# ⚠️ Riesgos Identificados

- Sobremodelar antes de probar ejecución real
- Intentar agregar lógica de negocio demasiado pronto
- Perder foco agregando features no planificadas

---

# 🔄 Ajuste de Proceso (derivado de retrospectiva)

- Sprint enfocado en núcleo técnico claro
- No más de 2–3 grandes objetivos por sprint
- Documentación estructurada con plantilla fija
- No rediseñar arquitectura en este sprint

---

# ⏱ Estimación

Duración sugerida: 1 semana

Complejidad: Media
Riesgo técnico: Bajo
Riesgo organizativo: Bajo (ya hay claridad conceptual)

---

# 🧠 Resultado Esperado

Al finalizar este sprint:

- El sistema deja de ser conceptual
- Se convierte en una base ejecutable real
- Queda preparado para comenzar CRUD y lógica de negocio en Sprint 02
