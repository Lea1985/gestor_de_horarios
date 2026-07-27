# Punto de partida — ClaseProgramada (sesión 2026-07-20)

> Este documento es un **arranque de sesión**, no un plan de arquitectura. Las decisiones de fondo (invariantes, motores, precedencia de causas) siguen viviendo en `docs/Revisión de arquitectura de ClaseProgramada.md` — este archivo solo resume qué está verificado hoy en el código real y qué decisión concreta queda pendiente para retomar mañana.

---

## 1. Estado verificado contra el código real (no contra el documento)

Se auditó el código fuente directamente (no solo la documentación) el 2026-07-20. Confirmado:

- ✅ Migración de schema aplicada: `ClaseProgramada.causa` (enum `Causa`) y `ClaseProgramada.versionResolucion` existen en `prisma/schema.prisma` y están en uso.
- ✅ `claseProgramadaService.suspenderNoVigentes` implementado y en uso real en los 3 casos de uso de distribución: `asignarModulos.ts`, `nuevaVersionDistribucion.ts`, `eliminarDistribucion.ts`.
- ✅ `claseProgramadaService.recalcularSuspendidasPorCalendario` ya setea `causa: CALENDARIO_ESCOLAR` + `calendarioEscolarId` (el bug pre-existente descrito en la sección 11.5 del documento de arquitectura está corregido en el código actual).
- ✅ `lib/services/resolucionClaseService.ts` existe, compila correctamente y su lógica (`resolverEstadoYCausa`, `obtenerCondicionesVigentes`, `resolverClase`) es coherente con la tabla de precedencia acordada.
- ⚠️ **Confirmado por grep: `resolverClase` no tiene ningún llamador en todo el proyecto.** El Motor de Resolución está terminado pero completamente desconectado — cero casos de uso lo invocan.
- ⚠️ `generarClasesIncidencia.ts` sigue bypaseando `claseProgramadaService` (llama directo a `generarClases()` + `prisma.claseProgramada.createMany()`), tal como señala la sección 11.1 del documento de arquitectura. Sin resolver.
- ⚠️ `activarPeriodo.ts` tampoco fue migrado a ningún patrón nuevo relacionado con el Motor de Resolución.

**Nota:** `graphify-out/` está desactualizado — no indexaba `resolucionClaseService.ts`. Correr `graphify update .` al empezar la próxima sesión antes de cualquier query.

## 2. Código muerto detectado (auditoría independiente, no estaba en el doc de arquitectura)

Confirmado por grep que no tienen ningún llamador real:

| Archivo | Función | Nota |
|---|---|---|
| `lib/services/claseProgramadaService.ts` | `eliminarEnRango` | Ya señalado como candidato a limpieza en el doc de arquitectura (11.3). Es además la única función que borra `ClaseProgramada` físicamente — contradice el principio rector si algún día se reactiva por error. |
| `lib/repositories/claseProgramadaRepository.ts` | `generarParaDistribucion`, `eliminarFuturas`, `suspenderFuturas` | Ni siquiera el propio service los usa; el service llama a `prisma` directo. |
| `lib/repositories/reemplazoRepository.ts` | `detectarReemplazosParaMigrar`, `migrarReemplazosAIncidencias` | Mecanismo de migración de reemplazo alternativo al vigente (`claseProgramadaService.resolverCoberturaDelTramo` + `migrarReemplazoATramo`, por tramo de fechas). Este es por incidencia — semántica distinta, duplica responsabilidad. |

No se tocó nada de esto — queda como inventario para decidir si se limpia o se documenta como legacy intencional.

## 3. La decisión pendiente concreta (ya identificada en el doc de arquitectura, sección 11.6)

> "Falta decidir el punto de enganche" para `resolverClase`. Candidatos ya identificados ahí:
> 1. `activarPeriodo.ts`
> 2. `generarClasesIncidencia.ts` (resolvería de paso la inconsistencia arquitectónica del punto 11.1/1 de arriba)
> 3. Construir primero el **Motor de Reconciliación** (todavía no empezado — sección 5 del doc de arquitectura) para resolver en lote en vez de clase por clase.

Esta sigue siendo una decisión de arquitectura/comportamiento de negocio (afecta cuándo y cómo se recalcula el estado de una clase) — **no se toma acá**. Es lo primero a resolver mañana, presentando las tres opciones con su impacto antes de implementar cualquiera.

## 4. Agenda propuesta para la próxima sesión

1. `graphify update .` (el índice está desactualizado desde antes de esta sesión).
2. Decidir el punto de enganche del Motor de Resolución (sección 3 de este documento) — presentar impacto de las 3 opciones, esperar aprobación.
3. Resolver, en la misma conversación o en una aparte, qué hacer con el código muerto de la sección 2: ¿se borra, o se documenta como legacy intencional? (cambio pequeño si se decide borrar — son 3 archivos).
4. Recién después de eso, evaluar si conviene empezar el Motor de Reconciliación (sección 5 del doc de arquitectura, todavía sin empezar) o si el enganche directo alcanza por ahora.

No implementar nada de esto sin pasar primero por explicación + aprobación explícita, según las reglas del proyecto.
