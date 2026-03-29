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

## 🟢 Feature 3.1 – Agente

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
# 🔵 EPIC 4.5 – Codigarios (Base normativa)

## 🟢 Feature 4.5.1 – Gestión de Codigarios

- CRUD de codigarios por institución
- Ejemplos:
  - ARTICULOS_DOCENTES
  - TIPOS_LICENCIA

- Validaciones:
  - Nombre único por institución
  - Soft delete

---

## 🟢 Feature 4.5.2 – Gestión de Items

- CRUD de ítems de codigario:
  - código (ej: ART_114)
  - nombre
  - descripción

- Validaciones:
  - Código único dentro del codigario
  - Ítem activo

---

## 🟢 Feature 4.5.3 – Integración con Incidencias

- Incidencia debe referenciar `codigarioItemId`

- Validaciones:
  - Ítem activo
  - Pertenece a la institución
  - Coherencia con tipo de incidencia (opcional futuro)

---

# 🔵 EPIC 5 – Generación de Clases (Motor Operativo)

## 🟢 Feature 5.1 – Generación de Clases Programadas

- Generar clases a partir de:
  - Distribución horaria
  - Módulos horarios
  - Rango de fechas

- Asociar:
  - institucionId
  - asignacionId
  - moduloId
  - unidadId

- Estado inicial: `PROGRAMADA`

- Validaciones:
  - No duplicar clase para misma asignación + módulo + fecha
  - Respetar vigencia de distribución horaria

---

## 🟢 Feature 5.2 – Regeneración / Recalculo

- Permitir regenerar clases:
  - Por rango de fechas
  - Por asignación

- Estrategias:
  - Soft delete + regeneración
  - Versionado (opcional futuro)

---

## 🟢 Feature 5.2.3 – Protección de Datos Operativos

- No eliminar clases que:
  - tengan reemplazos
  - tengan incidencias

- Alternativa:
  - Marcar como inactivas en lugar de eliminar

---

## 🟢 Feature 5.3 – Impacto de Incidencias en Clases

- Detectar incidencias activas en rango
- Marcar clases como:
  - `SUSPENDIDA`

- Asociar `incidenciaId` a clase

- Validaciones:
  - No modificar clases fuera del rango
  - No sobrescribir clases ya reemplazadas

---

## 🟢 Feature 5.4 – Motor de Resolución de Estado de Clase

### 🟢 Feature 5.4.1 – Resolución automática

Dada una clase:

Orden de prioridad:

1. Reemplazo → `REEMPLAZADA`
2. Incidencia → `SUSPENDIDA`
3. Default → `PROGRAMADA`

---

### 🟢 Feature 5.4.2 – Recalculo consistente

- Recalcular estado cuando:
  - se crea incidencia
  - se elimina incidencia
  - se crea reemplazo
  - se elimina reemplazo

---

# 🔵 EPIC 6 – Reemplazos (Ejecución Real)

## 🟢 Feature 6.1 – Registro de Reemplazo

- Crear reemplazo sobre `ClaseProgramada`

- Definir:
  - asignacionTitularId
  - asignacionSuplenteId

- Validaciones:
  - No permitir más de un reemplazo por clase
  - Suplente activo
  - Suplente distinto del titular

---

## 🟢 Feature 6.2 – Impacto en Clase

- Cambiar estado de clase a `REEMPLAZADA`
- Mantener relación con:
  - titular
  - suplente

- Persistir trazabilidad completa

---

## 🟢 Feature 6.3 – Reglas de Consistencia

- No permitir reemplazo si:
  - clase está suspendida (según decisión de negocio)

- Validar disponibilidad del suplente:
  - (v1 simple)
  - (v2 con chequeo de solapamientos)

---

## 🟢 Feature 6.4 – Validaciones Temporales

### 🟢 Feature 6.4.1

- Validar que el suplente:
  - esté activo en esa fecha
  - tenga asignación vigente

---

### 🟢 Feature 6.4.2 (opcional v2)

- Validar que no tenga otra clase en el mismo módulo horario

---

# 🔵 EPIC 7 – Consultas Estratégicas

## 🟢 Feature 7.1 – Horario Real

- Obtener horario por:
  - agente
  - unidad
  - institución

- Considerar:
  - clases programadas
  - incidencias
  - reemplazos

---

## 🟢 Feature 7.2 – Estado de Clases

- Listar clases:
  - PROGRAMADA
  - DICTADA (futuro)
  - SUSPENDIDA
  - REEMPLAZADA

---

## 🟢 Feature 7.3 – Disponibilidad Docente

- Detectar disponibilidad en base a:
  - horarios asignados
  - clases existentes
  - reemplazos

---

## 🟢 Feature 7.4 – Trazabilidad Completa

- Dada una clase:
  - Ver asignación original
  - Ver incidencia (si aplica)
  - Ver reemplazo (si aplica)

---

# 🔵 EPIC 8 – Seguridad

## 🟢 Feature 8.1 – Autenticación

- Login con JWT
- Manejo de sesiones

---

## 🟢 Feature 8.2 – Roles

- Admin
- Operativo
- Directivo
- Consulta

---

## 🟢 Feature 8.3 – Autorización

- Middleware por rol
- Restricción por entidad (multi-tenant)

---

# 🔵 EPIC 9 – Interfaz Base (UI funcional)

## 🟢 Feature 9.1 – Layout

- Sidebar
- Header
- Navegación protegida

---

## 🟢 Feature 9.2 – Pantallas Operativas

- Clases programadas (vista calendario/lista)
- Incidencias
- Reemplazos
- Asignaciones

---

# 🔵 EPIC 10 – Testing

## 🟢 Feature 10.1 – Tests de Dominio

- Validaciones:
  - superposición
  - reemplazos
  - incidencias

---

## 🟢 Feature 10.2 – Tests de Integración

- Endpoints:
  - clases
  - reemplazos
  - incidencias

---

# 🔵 EPIC 11 – Observabilidad

## 🟢 Feature 11.1 – Logs

- Logs estructurados
- Errores centralizados

---

## 🟢 Feature 11.2 – Health Check

- Endpoint `/health`

---

# 🔵 EPIC 12 – Documentación

## 🟢 Feature 12.1 – Documentación Técnica

- API
- README
- Deploy
- Arquitectura

---

# 🧠 Definición de V1 (MVP Real)

## Incluye:

- Multi-tenant
- Gestión de personas
- Gestión de unidades organizativas
- Asignaciones
- Distribución horaria versionada
- Registro de incidencias
- Codigarios integrados
- Generación de clases
- Reemplazos operativos
- Motor de resolución de estado
- Consultas estructurales básicas
- Trazabilidad histórica

---

## No incluye:

- Motor legal complejo
- Liquidación
- Automatización normativa exhaustiva

---

# 🚀 Objetivo del MVP

Validar que el sistema funciona como infraestructura estructural confiable para organizaciones con gestión horaria formal, independientemente del sector.