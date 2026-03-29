# 🗂 Sprint 04 – Backend: Incidencias y Encadenamiento

## 🎯 Objetivo del Sprint

Implementar la gestión de incidencias asociadas a asignaciones, incluyendo:

- Registro completo de incidencias (CRUD)
- Validación de superposición de fechas
- Encadenamiento de incidencias mediante referencia a otra
- Consultas recursivas para trazabilidad completa
- Soft delete y control de estado activo/inactivo

Esto sienta la base para la gestión de reemplazos y clases suspendidas o reprogramadas en próximos sprints.

---

## 📦 Sprint Backlog

| Modelo       | CRUD requerido                  | Detalles / Notas |
|--------------|---------------------------------|-----------------|
| **Incidencia** | Crear, Leer, Actualizar, Eliminar (soft delete) | - Validar superposición de fechas (`fecha_desde` / `fecha_hasta`) <br> - Manejar `incidenciaPadreId` para encadenamiento <br> - Controlar `activo` y `deletedAt` <br> - Soportar N niveles de encadenamiento <br> - Índices: `[asignacionId]`, `[tipo, fecha_desde]`, `[fecha_desde, fecha_hasta]` |
| **Asignacion** | Solo lectura (Read)            | - Validar existencia y estado activo antes de crear incidencia <br> - No requiere CRUD en este sprint |
| **ClaseProgramada** | Validación de integridad solo | - Relación con `incidenciaId` para consultas futuras |
| **Agente / UnidadOrganizativa** | Solo referencia | - No se modifican, solo lectura indirecta vía asignaciones |

---

## 🏗 Componentes del Sprint

1. **Servicios / Lógica de negocio**
   - Validación de superposición de fechas
   - Encadenamiento recursivo de incidencias
   - Soft delete e histórico de modificaciones
   - Queries para cadena completa de incidencias usando CTE recursiva

2. **Rutas / API**
   - POST `/incidencias` → crear nueva incidencia
   - GET `/incidencias/:id` → obtener incidencia por ID
   - GET `/incidencias/asignacion/:id` → listar incidencias de una asignación
   - PATCH `/incidencias/:id` → actualizar campos de incidencia
   - DELETE `/incidencias/:id` → soft delete de incidencia

3. **Pruebas automatizadas**
   - Crear incidencias válidas
   - Evitar superposición de fechas
   - Encadenamiento de N niveles
   - Validar soft delete y consultas filtrando `activo`

---

## ⏱ Estimación

- **Duración sugerida:** 1 semana  
- **Complejidad:** Media-Alta (validaciones + recursividad)  
- **Riesgo técnico:** Medio (CTE recursiva y control de superposición)

---

## 🧠 Resultado Esperado

Al finalizar el sprint:

- CRUD de `Incidencia` implementado y testeado  
- Encadenamiento de incidencias funcional (consultas recursivas)  
- Validaciones de fechas y estado activo funcionando  
- Integridad referencial con `Asignacion` asegurada  
- Base lista para integrar con Frontend y gestión de clases/reemplazos

---
