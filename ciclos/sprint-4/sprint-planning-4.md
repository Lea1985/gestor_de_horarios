
# 🗂 Sprint Planning 04

## 🎯 Objetivo

Garantizar que el sistema pueda:

- Registrar y gestionar incidencias asociadas a asignaciones
- Evitar conflictos de fechas
- Permitir encadenamiento con trazabilidad completa
- Servir como base para la planificación de reemplazos y clases suspendidas

---

## 📝 Tareas

### Backend

1. **Servicios Incidencia**
   - Crear incidencia con validación de fechas y estado
   - Actualizar incidencia
   - Soft delete de incidencia
   - Consultas de encadenamiento recursivo

2. **Rutas / API**
   - Implementar POST, GET, PATCH, DELETE
   - Endpoint para listar incidencias por asignación

3. **Pruebas unitarias y de integración**
   - CRUD completo de incidencias
   - Validación de superposición
   - Consultas recursivas
   - Soft delete y filtrado por `activo`

### Validaciones y Constraints

- Evitar superposición de fechas en la misma asignación
- Validar que `incidenciaPadreId` exista y esté activa
- Controlar N niveles de encadenamiento sin loops

### Base de datos / Prisma

- Crear índices para consultas rápidas (`asignacionId`, `tipo`, `fecha_desde`, `fecha_hasta`)  
- Ajustar relaciones para soportar `padre` → `hijos`  

---

## ✅ Definition of Done (DoD)

- CRUD de `Incidencia` completo y testeado
- Validaciones de superposición implementadas
- Encadenamiento recursivo funcional
- Soft delete operativo
- Endpoints documentados y testeados
- Integridad referencial con `Asignacion` asegurada
- Tests unitarios y de integración pasan correctamente
- Migraciones Prisma actualizadas y aplicadas

---

## ⚠️ Riesgos y Mitigaciones

- **Duplicación de fechas:** validar al crear/incidencia
- **Loops en encadenamiento:** limitar recursividad a N niveles o detectar ciclos
- **Dependencias con asignaciones:** validar existencia y estado activo

---

## 📊 Estimación

- **Duración:** 1 semana  
- **Complejidad:** Media-Alta  
- **Riesgo técnico:** Medio  
- **Entregables:** CRUD de incidencias + encadenamiento + tests