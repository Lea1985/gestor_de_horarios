📘 Reglas de Negocio – Sistema de Gestión Horaria Estructural
Enfoque Operativo Transversal

Este documento define las reglas del núcleo estructural del sistema, alineadas con la arquitectura v3 y el modelo de datos implementado.

El núcleo es transversal, multi-tenant, y desacoplado de normativa sectorial.

La estructura del sistema está basada en los siguientes componentes principales:

Instituciones (tenant del sistema)

Agentes

Unidades Organizativas

Asignaciones

Distribuciones Horarias versionadas

Módulos Horarios

Incidencias

El diseño prioriza:

trazabilidad histórica

consistencia estructural

neutralidad sectorial

escalabilidad SaaS.

1. Sobre Agente

Un Agente representa una persona que puede desempeñar funciones dentro de una o más instituciones.

El sistema distingue entre:

la identidad global del agente

su relación con una institución

Esta relación se gestiona mediante AgenteInstitucion.

Reglas:

Un agente puede pertenecer a múltiples instituciones.

Un agente puede tener múltiples asignaciones activas o históricas.

Puede desempeñarse en distintas unidades organizativas simultáneamente.

Puede existir un agente sin asignaciones.

El agente no se elimina físicamente del sistema.
Se utilizan mecanismos de desactivación o soft delete.

El documento identificatorio es único dentro de una institución.

El sistema debe validar superposición horaria efectiva entre asignaciones activas de un mismo agente.

Ante superposición, el sistema debe generar advertencia explícita antes de confirmar la operación.

Restricción estructural:

No puede existir más de una asignación del mismo agente en la misma unidad organizativa dentro de una institución.

2. Sobre Unidad Organizativa

La Unidad Organizativa representa cualquier estructura operativa dentro de una institución.

Ejemplos posibles:

aula

departamento

laboratorio

área administrativa

otra unidad estructural definida por la institución.

Reglas:

Pertenece siempre a una única institución.

Puede estar activa o inactiva.

Puede existir sin asignaciones activas.

No debe eliminarse físicamente si posee asignaciones asociadas.

Su existencia no depende de normativa externa.

La unicidad de la unidad se define por:

institución

código interno de unidad.

3. Sobre Asignación

La Asignación representa la relación estructural entre:

un agente

una unidad organizativa

una institución.

Equivale conceptualmente a un cargo estructural dentro de la organización.

Reglas:

Pertenece siempre a una institución.

Puede estar activa o inactiva.

Posee fecha de inicio obligatoria.

Puede poseer fecha de finalización.

Debe poseer un identificador estructural único dentro de la institución.

Puede coexistir con otras asignaciones del mismo agente, sujeto a validación horaria.

No se elimina si posee historial de:

distribución horaria

incidencias.

La modificación de datos estructurales debe preservar la trazabilidad histórica.

4. Sobre Distribución Horaria

La Distribución Horaria define la estructura de módulos asignados a una asignación en un período determinado.

Reglas:

Pertenece exclusivamente a una asignación.

Es versionada.

Cada versión posee:

fecha de vigencia desde

fecha de vigencia hasta (opcional).

Las versiones anteriores no se sobreescriben.

El historial de versiones debe preservarse.

Restricciones operativas:

El sistema debe validar a nivel de aplicación que no existan versiones con vigencias superpuestas para una misma asignación.

Validaciones obligatorias:

no duplicación de módulos dentro de una misma distribución

validación de superposición horaria efectiva por agente.

Las inconsistencias generan advertencias antes de confirmar cambios.

5. Sobre Módulos Horarios

Los Módulos Horarios representan bloques estructurales de tiempo definidos por la institución.

Reglas:

Son configurables por institución.

Definen:

día de la semana

hora de inicio

hora de finalización.

Pueden ser reutilizados por múltiples distribuciones horarias.

Son componentes estructurales reutilizables del sistema.

Validaciones:

El sistema debe validar a nivel de aplicación que no existan módulos superpuestos dentro de la misma institución.

6. Sobre Incidencias

Una Incidencia representa una alteración temporal sobre una asignación.

Ejemplos posibles:

licencia

suspensión

otra interrupción estructural.

Reglas:

Siempre se registra sobre una asignación existente.

Define obligatoriamente:

fecha desde

fecha hasta.

Puede incluir observaciones.

Puede referenciar otra incidencia previa.

Permite encadenamiento de incidencias.

Las incidencias:

no deben eliminarse

deben preservarse para consulta histórica.

Restricciones operativas:

El sistema debe validar:

superposición incompatible de incidencias activas.

7. Sobre Encadenamiento de Incidencias

El modelo permite encadenamiento jerárquico de incidencias.

Esto permite representar situaciones como:

licencia

extensión de licencia

reemplazo

modificación posterior.

Reglas:

Una incidencia puede referenciar otra incidencia previa.

El sistema soporta N niveles de encadenamiento.

La cadena completa debe poder reconstruirse.

La trazabilidad no debe perderse por modificaciones posteriores.

El encadenamiento no altera la integridad histórica de la asignación original.

8. Sobre Historial y Versionado

El sistema prioriza la preservación de la trazabilidad histórica.

Principios:

No se permite eliminación destructiva de registros estructurales.

Los agentes y unidades organizativas utilizan soft delete.

Las asignaciones pueden inactivarse, pero no eliminarse si poseen historial.

Las distribuciones horarias se versionan.

Las incidencias se preservan como registro histórico permanente.

Toda modificación estructural relevante debe ser auditable.

9. Sobre Validaciones Operativas

El sistema prioriza continuidad operativa con control explícito.

Las siguientes situaciones generan advertencia obligatoria:

superposición horaria por agente

inconsistencias en distribución horaria

duplicación de módulos dentro de una distribución

rango temporal inválido

conflictos entre incidencias activas.

Las validaciones se realizan principalmente a nivel de lógica de aplicación.

La institución puede configurar el nivel de bloqueo o advertencia según su política interna.

10. Sobre Arquitectura Multi-Tenant

El sistema está diseñado como una arquitectura multi-tenant.

Principios:

Cada institución representa un tenant independiente.

Toda entidad estructural pertenece a una institución o se relaciona con ella.

No puede existir cruce de datos entre instituciones.

Las validaciones de unicidad se aplican dentro del contexto institucional.

Las relaciones entre agentes e instituciones se gestionan mediante AgenteInstitucion, lo que permite que un agente pertenezca a múltiples instituciones.

11. Sobre Extensiones Configurables

El núcleo del sistema es neutral respecto a normativa sectorial.

Las siguientes extensiones pueden implementarse sin modificar el modelo estructural:

régimen laboral

catálogo ampliado de tipos de incidencia

identificadores oficiales externos

reglas sectoriales específicas.

Estas extensiones deben integrarse como capas adicionales de configuración, sin modificar la estructura base.

12. Principios Fundamentales del Sistema

El diseño del sistema se basa en los siguientes principios:

La verdad del sistema es la estructura horaria versionada.

La trazabilidad histórica es obligatoria.

El núcleo debe poder operar en cualquier organización estructurada por horarios.

Las reglas normativas deben implementarse como configuración, no como estructura rígida.

El diseño prioriza escalabilidad SaaS, modularidad y neutralidad sectorial.