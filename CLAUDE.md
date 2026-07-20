## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.
Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
---

# ALNEXT Development Guide
## Proyecto
ALNEXT es un sistema de gestión integral para instituciones educativas.

El objetivo principal es mantener:

- arquitectura limpia;
- reglas de negocio claras;
- alta mantenibilidad;
- trazabilidad;
- bajo riesgo de regresiones.

La prioridad siempre es la calidad del sistema por sobre la velocidad de implementación.

---

# ALNEXT - Reglas de Oro (Para Claude)

**ANTES DE CADA ACCIÓN:**

1. **Graphify primero** - Siempre query → explain → path
2. **Schema protegido** - NO tocar sin aprobación explícita
3. **Código funcionando** - NO tocar sin necesidad
4. **Multi-tenant** -NO tocar ningún campo, modelo o lógica relacionada 
   con institution/tenant/organization (fuera de alcance)
5. **Cambios grandes** - Dividir en etapas + aprobación

**SIEMPRE:**
- Explicar antes de implementar
- Esperar aprobación si es mediano/grande
- Usar Graphify después de cambios

**NUNCA:**
- Asumir cambios en arquitectura
- Refactorizar oportunistamente
- Modificar comportamiento existente sin necesidad

Nunca asumir cambios sobre:

- arquitectura;
- modelo de datos;
- reglas de negocio.

Si una modificación afecta alguno de estos puntos:
- Detener la implementación.
- Explicar el impacto.
- Solicitar aprobación explícita antes de continuar.

# Stack Tecnológico

- Next.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Arquitectura por capas
- Casos de Uso (Use Cases)
- Services
- Repositories
- DTOs
- Validaciones centralizadas

---
# Arquitectura

Respetar siempre la arquitectura existente.

Flujo esperado:

API
↓
Use Cases
↓
Services
↓
Repositories
↓
Prisma

Las reglas de negocio deben permanecer en los Use Cases y Services.

Evitar colocar lógica de negocio en:

- API Routes
- Controllers
- Pages
- Componentes UI

---
# Principios de Desarrollo

Antes de escribir código:

1. Comprender completamente el problema.
2. Analizar la arquitectura involucrada.
3. Utilizar Graphify para identificar relaciones.
4. Identificar archivos afectados.
5. Explicar el impacto.
6. Proponer una estrategia.
7. Esperar aprobación antes de cambios importantes.

Nunca realizar modificaciones masivas sin justificar previamente la necesidad.

---
# Protección del Modelo de Datos Prisma (CRÍTICO)

El archivo `schema.prisma` representa una parte crítica del sistema.

Reglas obligatorias:

- Nunca modificar `schema.prisma` sin autorización explícita.
- Nunca crear migraciones automáticamente.
- Nunca modificar modelos existentes sin explicar el impacto.
- Nunca agregar, eliminar o modificar:
  - modelos;
  - relaciones;
  - claves foráneas;
  - índices;
  - restricciones.

Si una solución requiere cambios en el schema:

1. Explicar por qué es necesario.
2. Mostrar alternativas posibles.
3. Explicar impacto funcional.
4. Explicar impacto técnico.
5. Proponer la migración necesaria.
6. Esperar aprobación.

Siempre asumir que el schema está protegido.

---
# Reglas de Negocio Principales

Las entidades principales del sistema son:

PeriodoOperativo
↓
Distribucion
↓
Asignacion
↓
ClaseProgramada
↓
Incidencia
↓
Reemplazo

Estas relaciones representan el núcleo funcional del sistema.

Antes de modificar cualquiera de estas entidades analizar el impacto completo.

---
# Prioridad Actual (Temporal)

Actualmente la prioridad del desarrollo es finalizar correctamente la arquitectura y comportamiento del módulo:

## ClaseProgramada
Antes de realizar cambios relacionados con ClaseProgramada:

- revisar la arquitectura existente;
- analizar el flujo completo;
- identificar casos de uso involucrados;
- revisar servicios;
- revisar repositorios;
- revisar APIs;
- analizar impacto sobre:
  - PeriodoOperativo;
  - Distribucion;
  - Asignacion;
  - Incidencia;
  - Reemplazo.

No implementar cambios directamente.

Primero realizar una revisión arquitectónica y presentar una propuesta.

---
# Revisión Arquitectónica de ClaseProgramada

ClaseProgramada es una funcionalidad central del sistema.

Antes de modificarla:

- comprender cómo se generan las clases;
- comprender cómo se actualizan;
- comprender cómo se cancelan;
- comprender la relación con incidencias;
- comprender la relación con reemplazos;
- identificar posibles inconsistencias.

Las mejoras arquitectónicas deben ser propuestas primero.

No realizar refactorizaciones oportunistas durante una tarea funcional.

---
# Principio de Mínima Intervención

Modificar únicamente los archivos necesarios para cumplir el objetivo solicitado.

No:
- realizar mejoras no solicitadas;
- refactorizar código cercano solamente porque fue encontrado;
- cambiar nombres o estructuras sin necesidad;
- modificar módulos relacionados sin justificación.

Si se detecta una oportunidad de mejora:

1. Documentarla.
2. Explicar el beneficio.
3. Presentarla como propuesta independiente.

---
# Definición del Tamaño de Cambios

## Cambio pequeño
Características:

- Hasta 3 archivos.
- Sin cambios arquitectónicos.
- Sin cambios de schema.
- Sin cambios importantes de reglas de negocio.

Puede implementarse luego de una explicación breve y confirmación del usuario.

---
## Cambio mediano

Características:

- Entre 3 y 8 archivos.
- Puede afectar servicios o casos de uso.
- Puede modificar comportamiento funcional.

Requiere:
- análisis previo;
- propuesta;
- aprobación antes de implementar.

---
## Cambio grande

Características:

- Más de 8 archivos.
- Cambios arquitectónicos.
- Cambios de reglas de negocio.
- Cambios de modelo de datos.
- Refactorizaciones importantes.

Debe:

- dividirse en etapas;
- implementarse progresivamente;
- validarse después de cada etapa.

---
# Checklist Antes de Implementar

Antes de modificar código verificar:

- [ ] Graphify fue utilizado.
- [ ] El flujo funcional fue comprendido.
- [ ] Los archivos afectados fueron identificados.
- [ ] El impacto arquitectónico fue analizado.
- [ ] Las reglas de negocio fueron revisadas.
- [ ] Las alternativas fueron consideradas.
- [ ] El plan fue presentado.
- [ ] La aprobación fue recibida.

---
# Manejo de Código Legacy

Si se encuentra código que no cumple con las reglas actuales:

- No modificar automáticamente.
- No refactorizar dentro de otra tarea.
- Documentar la observación.
- Proponer una mejora separada.

El objetivo es evolucionar el sistema de manera segura.

---
# Flujo de Trabajo Esperado

Ejemplo:

Usuario:

"Necesito agregar una validación en asignaciones."

Proceso esperado:

1. Ejecutar Graphify:

graphify query "validacion asignaciones"

2. Identificar componentes involucrados.
3. Explicar dónde debería implementarse.
4. Analizar impacto.
5. Proponer solución.
6. Esperar aprobación.
7. Implementar solamente los cambios aprobados.
8. Ejecutar:
graphify update .

9. Informar cambios realizados.

---
# Respuestas Esperadas

Antes de escribir código:

Explicar:

- qué problema se está resolviendo;
- qué archivos intervienen;
- qué impacto tiene;
- cuál es la estrategia propuesta.

No comenzar implementando directamente.

---

# Control de Versiones

Antes de cambios importantes:

- verificar estado de Git;
- recomendar commit previo si corresponde.

Después de cambios importantes:

- informar archivos modificados;
- sugerir commit descriptivo.

---
# Testing y Validación

El proyecto posee cobertura de testing parcial.

El objetivo es aumentar progresivamente la confiabilidad del sistema sin introducir complejidad innecesaria.

## Principios

Antes de implementar cambios:

- Revisar si existen tests relacionados con la funcionalidad afectada.
- Analizar qué escenarios críticos deberían validarse.
- Identificar riesgos de regresión.
- No asumir que existe cobertura completa.

## Creación de Tests

No crear nuevos frameworks, herramientas o estructuras de testing sin aprobación explícita.

Antes de agregar tests nuevos:

1. Explicar qué comportamiento se desea validar.
2. Identificar la capa adecuada para realizar la prueba.
3. Proponer la estrategia de testing.
4. Esperar aprobación.

## Prioridad de Testing

Priorizar pruebas sobre reglas de negocio críticas:

- generación de ClaseProgramada;
- modificación de PeriodoOperativo;
- cambios de Distribucion;
- cambios de Asignacion;
- cancelaciones;
- incidencias;
- reemplazos.

Las pruebas deben enfocarse primero en comportamientos de negocio, no solamente en cobertura de líneas.

## Validación Manual

Cuando no existan tests automatizados adecuados:

- indicar qué validaciones manuales deben realizarse;
- describir los escenarios a probar;
- identificar posibles impactos.

## Regla importante

Nunca eliminar, modificar o ignorar un test existente solamente para hacer pasar una implementación.

Si un test falla:
1. Analizar si el error está en el código.
2. Analizar si el test quedó desactualizado.
3. Explicar la causa antes de modificarlo.
---
# Restricción Arquitectónica: Multi-tenant

Importante: La implementación multi-tenant está fuera del alcance actual. No modificar, ni eliminar lo existen. 
Reglas obligatorias:

- No agregar conceptos de tenant
- No agregar campos como tenantId, organizationId, institutionId
- No modificar modelos existentes para soportar múltiples instituciones
- No crear middleware de aislamiento por tenant
- No modificar autenticación o autorización con criterios multi-tenant
- No diseñar repositorios pensando en separación multi-tenant
- No proponer migraciones relacionadas con multi-tenant

Si durante el análisis aparece una necesidad relacionada con multi-tenant:

1. Explicar el impacto arquitectónico.
3. No implementarla.
4. Esperar una decisión explícita del proyecto.

Nunca introducir decisiones arquitectónicas futuras sin aprobación explícita.

Ejemplos de decisiones fuera de alcance actual:

- Multi-tenant.
- Cambios profundos del modelo de datos.
- Reemplazo de arquitectura.
- Migración tecnológica.

---
# Preservación del Sistema Existente (CRÍTICO)

El código, configuraciones y funcionalidades existentes deben considerarse estables salvo evidencia concreta de un problema o una necesidad funcional.

Regla principal:

No modificar comportamiento existente salvo que sea estrictamente necesario para cumplir el objetivo solicitado y exista aprobación explícita.

Esto incluye:

- lógica de negocio existente;
- modelos Prisma;
- migraciones;
- APIs existentes;
- middleware;
- proxy;
- autenticación;
- autorización;
- configuración del proyecto;
- infraestructura;
- componentes funcionales;
- flujos operativos.

Antes de modificar cualquier componente existente:

1. Explicar por qué es necesario.
2. Identificar qué comportamiento puede verse afectado.
3. Analizar alternativas que eviten la modificación.
4. Proponer el cambio.
5. Esperar aprobación.

No realizar mejoras oportunistas sobre código estable.

No reemplazar implementaciones existentes por alternativas nuevas solamente por considerarlas más modernas.

La prioridad es evolucionar el sistema preservando la estabilidad actual.

# Frontend

El frontend debe respetar los contratos existentes.

Antes de modificar componentes:

- verificar APIs existentes;
- verificar DTOs;
- verificar validaciones del backend;
- evitar duplicar reglas de negocio en UI.

No trasladar lógica de negocio al frontend solamente para simplificar componentes.

---
# Jerarquía de Fuentes de Verdad del Proyecto

El proyecto contiene documentación histórica, análisis previos y antiguos planes de desarrollo.

No toda la documentación representa el estado actual del sistema.

La prioridad de información debe ser:

1. Instrucciones explícitas dadas por el usuario durante la tarea actual.
2. Código existente funcionando actualmente.
3. Modelo de datos actual (`schema.prisma`).
4. Reglas de negocio actuales documentadas.
5. Documentación técnica vigente.
6. Documentación histórica y antiguos sprints.

IMPORTANTE: Los documentos históricos dentro de docs/ y carpetas de sprint pueden consultarse para comprender la evolución del proyecto, decisiones anteriores y contexto técnico.
No representan requerimientos activos salvo confirmación explícita del usuario.

No deben utilizarse para:

- definir nuevas funcionalidades;
- crear tareas pendientes;
- continuar planes abandonados;
- modificar la arquitectura actual;
- justificar cambios no solicitados.

Si una documentación histórica contradice una instrucción actual o el comportamiento existente del sistema:
- priorizar la instrucción actual;
- respetar el código vigente;
- informar la diferencia encontrada.
Nunca asumir que una tarea mencionada en un sprint antiguo continúa vigente.

Antes de implementar cualquier cambio, validar que el requerimiento proviene de una solicitud actual del usuario.