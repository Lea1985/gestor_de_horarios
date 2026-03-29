# 🟢 Sprint Backlog – EPIC 4.5 Codigarios

## 🎯 Objetivo del Sprint
Implementar el sistema de codigarios y sus ítems como base semántica para incidencias, asegurando multi-tenant, validaciones y consistencia.

---

## 🧩 Feature 4.5.1 – Modelo Codigario

### Tareas
- [ ] Crear modelo `Codigario` en Prisma
- [ ] Agregar relación con `institucionId`
- [ ] Agregar campo `nombre`
- [ ] Agregar campo `activo`
- [ ] Agregar `timestamps` (`createdAt`, `updatedAt`)
- [ ] Agregar `deletedAt` (soft delete)
- [ ] Crear índices necesarios

### Validaciones
- [ ] Nombre obligatorio
- [ ] Nombre único por institución

---

## 🧩 Feature 4.5.2 – Modelo CodigarioItem

### Tareas
- [ ] Crear modelo `CodigarioItem`
- [ ] Relación con `Codigario`
- [ ] Campo `codigo` (ej: ART_114)
- [ ] Campo `descripcion`
- [ ] Campo `activo`
- [ ] Agregar `timestamps`
- [ ] Agregar `deletedAt`
- [ ] Índices

### Validaciones
- [ ] Código obligatorio
- [ ] Código único por codigario
- [ ] No permitir ítems duplicados

---

## 🧩 Feature 4.5.3 – API Codigarios

### Endpoints
- [ ] POST /api/codigarios
- [ ] GET /api/codigarios
- [ ] GET /api/codigarios/:id
- [ ] PATCH /api/codigarios/:id
- [ ] DELETE (soft delete)

### Validaciones
- [ ] Multi-tenant (institucionId)
- [ ] No acceder a datos de otra institución

---

## 🧩 Feature 4.5.4 – API CodigarioItems

### Endpoints
- [ ] POST /api/codigarioItems
- [ ] GET /api/codigarioItems
- [ ] GET /api/codigarioItems/:id
- [ ] PATCH /api/codigarioItems/:id
- [ ] DELETE (soft delete)

### Validaciones
- [ ] Codigario pertenece a la institución
- [ ] Código único dentro del codigario
- [ ] Ítem activo

---

## 🧩 Feature 4.5.5 – Integración inicial con Incidencias

### Tareas
- [ ] Usar campo `codigarioItemId` existente
- [ ] Validar existencia del item
- [ ] Validar pertenencia al tenant
- [ ] Validar que esté activo

### Reglas
- [ ] No obligatorio en esta etapa (transición)
- [ ] Mantener compatibilidad con `tipo`

---

## 🧩 Feature 4.5.6 – Tests

### Codigarios
- [ ] Crear codigario ✅
- [ ] No permitir duplicados ❌
- [ ] Validar multi-tenant ❌

### CodigarioItems
- [ ] Crear item ✅
- [ ] No duplicar código ❌
- [ ] Validar pertenencia ❌

### Incidencias
- [ ] Crear con codigarioItem válido ✅
- [ ] Rechazar item de otra institución ❌
- [ ] Rechazar item inactivo ❌

---

## 🧩 Feature 4.5.7 – Seed inicial (opcional pero recomendado)

- [ ] Crear codigario "LICENCIAS"
- [ ] Crear items:
  - ART_114
  - ART_115
- [ ] Crear codigario "SUSPENSIONES"

---

## ✅ Definition of Done

- [ ] Modelos creados y migrados
- [ ] APIs funcionando
- [ ] Validaciones completas
- [ ] Tests pasando
- [ ] Multi-tenant asegurado
- [ ] Integración básica con incidencias lista