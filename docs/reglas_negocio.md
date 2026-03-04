# 📘 Reglas de Negocio – Sistema de Gestión Horaria Estructural

## Enfoque Operativo Transversal

Este documento define las reglas del núcleo estructural del sistema,
alineadas con la arquitectura v3 y el Product Backlog.

El núcleo es transversal, multi-tenant y desacoplado de normativa sectorial.

---

## 1. Sobre Persona

- Una persona puede tener múltiples asignaciones activas o históricas.
- Puede desempeñarse en distintas unidades organizativas simultáneamente.
- Puede existir una persona sin asignaciones.
- No puede eliminarse una persona que posea asignaciones o incidencias asociadas.
- El documento identificatorio es único por institución.
- El sistema debe validar superposición horaria efectiva entre asignaciones activas de una misma persona.
- Ante superposición, el sistema debe generar advertencia explícita antes de confirmar la operación.

---

## 2. Sobre Unidad Organizativa

- Representa cualquier unidad operativa dentro de una institución.
- Puede estar activa o inactiva.
- Puede existir sin asignaciones activas.
- No puede eliminarse si posee asignaciones asociadas.
- No depende de normativa externa para su existencia.

---

## 3. Sobre Asignación

La asignación representa la relación estructural entre una persona y una unidad organizativa.

- Puede estar Activa o Inactiva.
- Puede tener fecha de inicio y fecha de fin.
- Puede poseer un identificador estructural opcional (único por institución).
- No se elimina si tiene historial de distribución horaria o incidencias.
- La modificación estructural relevante debe preservar trazabilidad.
- Puede coexistir con otras asignaciones de la misma persona, sujeto a validación horaria.

---

## 4. Sobre Distribución Horaria

- Pertenece exclusivamente a una asignación.
- Es versionada por vigencia.
- No se sobreescriben versiones anteriores.
- Solo puede existir una versión activa por rango temporal.
- La duración del módulo es configurable por institución.
- El sistema debe validar:
  - No duplicación de módulos.
  - No superposición horaria efectiva por persona.
- Las inconsistencias generan advertencias antes de confirmar cambios.

---

## 5. Sobre Módulos Horarios

- Son configurables por institución.
- Definen bloques de tiempo estructural.
- No pueden superponerse dentro de la misma institución.
- Son reutilizables por múltiples asignaciones.

---

## 6. Sobre Incidencias

Una incidencia representa una alteración temporal sobre una asignación.

- Siempre se registra sobre una asignación existente.
- Define un rango de fechas obligatorio.
- Puede referenciar otra incidencia previa.
- Permite encadenamiento sin límite estructural.
- Es inmutable una vez registrada.
- No se eliminan incidencias históricas.

El sistema debe:

- Validar superposición incompatible de incidencias activas.
- Permitir consultar la cadena completa de incidencias.

---

## 7. Sobre Encadenamiento de Incidencias

- Una incidencia puede reemplazar o derivar de otra.
- El modelo soporta N niveles de encadenamiento.
- La cadena completa debe poder reconstruirse.
- La trazabilidad no puede perderse por modificaciones posteriores.
- El encadenamiento no altera la integridad histórica de la asignación original.

---

## 8. Sobre Historial y Versionado

- No se permite eliminación destructiva de registros estructurales.
- Las asignaciones se inactivan, no se eliminan.
- Las distribuciones horarias se versionan.
- Las incidencias son inmutables.
- Toda modificación estructural relevante debe ser auditable.

---

## 9. Sobre Validaciones Operativas

El sistema prioriza continuidad operativa con control explícito.

Las siguientes situaciones generan advertencia obligatoria:

- Superposición horaria por persona.
- Inconsistencias en distribución horaria.
- Duplicación de módulos.
- Rango temporal inválido.
- Conflictos de incidencias activas.

La institución puede configurar el nivel de bloqueo según política interna.

---

## 10. Sobre Multi-Tenant

- Toda entidad estructural pertenece a una institución.
- No puede existir cruce de datos entre instituciones.
- Las validaciones de unicidad se aplican dentro del contexto institucional.

---

## 11. Sobre Extensiones Configurables

El núcleo no depende de normativa sectorial.

Extensiones posibles incluyen:

- Régimen laboral.
- Catálogo configurable de tipos de incidencia.
- Identificadores externos oficiales.
- Reglas sectoriales específicas.

Estas extensiones no modifican el modelo estructural base.

---

## 12. Principios Fundamentales del Sistema

- La verdad del sistema es la estructura horaria versionada.
- La trazabilidad histórica es obligatoria.
- El núcleo debe operar en cualquier organización estructurada por horarios.
- Las reglas normativas son configuraciones, no estructuras.
- El diseño prioriza escalabilidad SaaS y neutralidad sectorial.