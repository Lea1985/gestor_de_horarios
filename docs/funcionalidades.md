# PRODUCT BACKLOG – Sistema de Gestión Horaria Estructural (v3)

Stack definido:

- Next.js + TypeScript (App Router)
- Prisma ORM
- PostgreSQL
- Clean Architecture interna (domain / application / infrastructure / interfaces)
- JWT + Roles
- CI básico

---

# 🎯 Visión Estratégica

Construir una infraestructura SaaS de gestión horaria estructural, transversal y extensible, orientada a organizaciones que asignan personas a unidades operativas con bloques horarios.

El núcleo del sistema:

- Es independiente de normativa específica.
- Es transversal a distintos tipos de organizaciones.
- Garantiza trazabilidad histórica inmutable.
- Permite extensiones configurables (ej. régimen laboral).

---

# 🔵 EPIC 0 – Definición y Consolidación del Núcleo

## 🟢 Feature 0.1 – Modelado Conceptual Final

- Crear Diagrama ER del núcleo estructural
- Validar relaciones críticas:
  - Persona – Asignación
  - Asignación – Unidad Organizativa
  - Asignación – DistribuciónHoraria
  - Incidencia – Encadenamiento
- Confirmar separación entre núcleo y extensiones

## 🟢 Feature 0.2 – Modelo de Encadenamiento de Incidencias

- Diseñar diagrama de cadena de incidencias
- Validar soporte para N niveles
- Validar impacto en consultas (CTE recursiva)
- Confirmar inmutabilidad histórica

## 🟢 Feature 0.3 – Congelamiento del Núcleo V1

- Ajustar entidades antes de crear schema Prisma
- Confirmar responsabilidades por entidad
- Definir explícitamente qué NO incluye el V1

---

# 🔵 EPIC 1 – Infraestructura Técnica Base

## 🟢 Feature 1.1 – Setup del Proyecto

- Crear proyecto Next.js + TypeScript (App Router)
- Configurar Prisma ORM
- Configurar PostgreSQL
- Configurar variables de entorno
- Implementar estructura Clean Architecture:
  - domain
  - application
  - infrastructure
  - interfaces
- Configurar ESLint + Prettier
- Configurar GitHub Actions (CI básico)
- Dockerizar base de datos (opcional)

---

# 🔵 EPIC 2 – Multi-Tenant SaaS Base

## 🟢 Feature 2.1 – Institución como Tenant

- Modelar entidad Institucion
- Implementar aislamiento por tenant
- Middleware de tenant
- Validar separación lógica de datos

## 🟢 Feature 2.2 – Configuración por Institución

- Parámetros configurables:
  - Duración de módulo
  - Activación de extensiones
- Estructura para futuras configuraciones normativas

---

# 🔵 EPIC 3 – Núcleo de Gestión Horaria (Core V1)

## 🟢 Feature 3.1 – Persona

- CRUD Persona
- Validaciones:
  - DNI único
  - Email válido
  - No eliminar si tiene asignaciones asociadas

## 🟢 Feature 3.2 – Unidad Organizativa

Representa materia, disciplina, actividad o servicio.

- CRUD Unidad
- Asociación opcional a categorías o niveles

## 🟢 Feature 3.3 – Asignación (estructura operativa)

- Crear asignación
- Asociar persona
- Estado Activo/Inactivo
- No permitir eliminación con historial

## 🟢 Feature 3.4 – Distribución Horaria Versionada

- Asignar módulos a asignación
- Versionar vigencias
- Validaciones:
  - Advertencia por superposición horaria
  - No duplicar módulo en misma vigencia

---

# 🔵 EPIC 4 – Incidencias y Encadenamiento

## 🟢 Feature 4.1 – Registro de Incidencia

- Crear incidencia asociada a asignación
- Definir rango de fechas
- No permitir superposición activa incompatible

## 🟢 Feature 4.2 – Encadenamiento de Incidencias

- Permitir incidencia que referencie otra
- Soportar N niveles
- Consultar cadena completa (CTE recursiva)
- Garantizar trazabilidad inmutable

---

# 🔵 EPIC 5 – Consultas Estratégicas Base

- Horario por persona
- Horario por unidad organizativa
- Asignaciones activas
- Incidencias activas
- Cadena completa de incidencias
- Detección de conflictos estructurales

---

# 🔵 EPIC 6 – Historial y Auditoría

- Historial de estado de asignación
- Historial de distribución horaria
- Registro de cambios estructurales
- Auditoría básica de eventos críticos

---

# 🔵 EPIC 7 – Extensión: Régimen Laboral Configurable

(No forma parte del núcleo V1, pero se deja preparado)

## 🟢 Feature 7.1 – Modelo de Régimen

- Definir entidad RégimenLaboral
- Asociar régimen a asignación
- Catálogo configurable de tipos de incidencia

## 🟢 Feature 7.2 – Identificadores Estructurales Opcionales

- Permitir identificador estructural (ej. código interno / SARH)
- Validación de unicidad por institución
- Inmutabilidad una vez creado

---

# 🔵 EPIC 8 – Seguridad

- Autenticación JWT
- Roles:
  - Admin
  - Operativo
  - Directivo
  - Consulta
- Middleware de autorización
- Protección de rutas frontend

---

# 🔵 EPIC 9 – Interfaz Base (UI mínima funcional)

- Layout principal
- Sidebar de navegación
- Header
- Rutas protegidas
- Pantallas CRUD básicas para núcleo

Objetivo: validar flujo completo del sistema.

---

# 🔵 EPIC 10 – Testing

- Tests unitarios de dominio
- Tests de aplicación
- Tests de integración (API)
- Tests de validaciones horarias

---

# 🔵 EPIC 11 – Observabilidad y Mantenibilidad

- Logs estructurados
- Manejo centralizado de errores
- Health check endpoint
- Versionado de API

---

# 🔵 EPIC 12 – Documentación

- Documentación API
- README profesional
- Guía de despliegue
- Guía de migraciones
- Manual técnico de arquitectura

---

# 📊 Roadmap Sugerido

## Sprint 0

EPIC 0 – Consolidación del núcleo

## Sprint 1

EPIC 1 + EPIC 2

## Sprint 2

EPIC 3

## Sprint 3

EPIC 4 + EPIC 5

## Sprint 4

EPIC 6 + EPIC 8

## Sprint 5

EPIC 9 + EPIC 10

## Sprint 6

EPIC 7 + EPIC 11 + EPIC 12

---

# 🧠 Definición de V1 (MVP Real)

El V1 incluye:

- Multi-tenant
- Gestión de personas
- Gestión de unidades organizativas
- Asignaciones
- Distribución horaria versionada
- Registro de incidencias
- Encadenamiento de reemplazos
- Consultas estructurales básicas
- Trazabilidad histórica

No incluye:

- Motor legal complejo
- Liquidación
- Automatización normativa exhaustiva

---

# 🚀 Objetivo del MVP

Validar que el sistema funciona como infraestructura estructural confiable para organizaciones con gestión horaria formal, independientemente del sector.
