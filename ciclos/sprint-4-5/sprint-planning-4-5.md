# 🚀 Sprint Planning – EPIC 4.5 Codigarios

## 🎯 Objetivo del Sprint
Construir la capa semántica del sistema mediante codigarios, permitiendo tipificar incidencias de forma flexible y escalable.

---

## 📌 Alcance

Incluye:
- Modelado de codigarios
- CRUD completo
- Validaciones multi-tenant
- Integración inicial con incidencias

No incluye:
- Refactor completo de incidencias
- Eliminación de `tipo`
- Reglas legales complejas

---

## 🧠 Estrategia

1. Crear estructuras base (Prisma)
2. Exponer APIs
3. Validar integridad
4. Integrar con incidencias (sin romper nada)

---

## 🏗️ Orden de implementación

### Fase 1 – Modelado
- Codigario
- CodigarioItem
- Migración Prisma

### Fase 2 – API
- CRUD Codigario
- CRUD CodigarioItem

### Fase 3 – Validaciones
- Multi-tenant
- Unicidad
- Activo/inactivo

### Fase 4 – Integración
- Incidencias con codigarioItemId

### Fase 5 – Testing
- Tests unitarios
- Tests de integración

---

## ⚠️ Riesgos

- Romper compatibilidad con incidencias existentes
- Mala validación multi-tenant
- Duplicación de códigos

### Mitigación
- Mantener `codigarioItemId` opcional
- Validaciones estrictas en backend
- Tests completos

---

## 📊 Criterios de aceptación

- Se pueden crear codigarios por institución
- Se pueden crear ítems dentro de codigarios
- No hay duplicados
- Incidencias pueden referenciar ítems válidos
- No se permite acceso cross-tenant

---

## 📦 Entregables

- Prisma schema actualizado
- Migraciones aplicadas
- Endpoints funcionales
- Tests automatizados
- Datos iniciales (seed)

---

## 🔜 Próximo paso (EPIC 5)

- Generación de clases programadas usando incidencias enriquecidas