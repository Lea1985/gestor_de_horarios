Punto de partida — ClaseProgramada — sesión 2026-07-25

## Contexto

Continuación directa de `docs/punto-de-partida-clase-programada-2026-07-24.md`. Los 9 archivos de esa sesión (motor de resolución conectado al camino INCIDENCIA) ya estaban aplicados al empezar hoy. Objetivo de hoy: punto 2 de esa lista — "actualizar/escribir tests para el camino INCIDENCIA antes de confiar en la suite vieja".

## Hallazgo bloqueante (no relacionado con el refactor de incidencias)

Antes de poder escribir un solo test hubo que confirmar que la suite corriera. Al ejecutarla contra la DB de test real (`gestor_test`, puerto 5433, server `npm run dev:test`) se confirmó que **10 archivos de test fallaban en el `beforeAll`**, sin llegar a ejecutar un solo `it`. Causa: `tests/helpers/factories.ts` (`createTestAgente`, `destroyInstitucion`) quedó desincronizado de dos refactors de schema anteriores a esta sesión:

- `Agente` ahora cuelga directo de `institucionId` (el modelo `AgenteInstitucion` ya no existe).
- `Asignacion.agenteId` fue eliminado — el titular vive en `TitularAsignacion` (historial).

Ya existía precedente: `tests/generacion-clases.test.ts` esquiva `factories.ts` a propósito y lo documenta en su cabecera. Se decidió con el usuario (no ampliar alcance) seguir ese mismo patrón: fixtures propios y autocontenidos en cada archivo tocado hoy, sin modificar `factories.ts`. Los otros 8 archivos (`asignaciones`, `distribuciones`, `horario`, `reportes.*`) **siguen rotos igual que antes** — deuda documentada, no tocada.

## Segundo hallazgo — sí relacionado con el camino INCIDENCIA

`reemplazoRepository.crear()` y `.eliminar()` todavía escriben `estado` a mano dentro de su propia transacción (mismo patrón que ya se corrigió en `reasignarReemplazoAIncidencia.ts` el 07-24). El usecase llama a `resolverClase()` inmediatamente después, que pisa ese valor. Mientras la clase tenga una incidencia activa da igual (el motor llega a la misma conclusión). Pero **un reemplazo creado sobre una clase sin incidencia nunca llega a `REEMPLAZADA`**, porque esa tabla de precedencia solo produce `REEMPLAZADA` bajo la rama INCIDENCIA (ver `resolucionClaseService.ts`, `resolverEstadoYCausa`).

Esto rompía el test preexistente `"crea un reemplazo y marca la clase como REEMPLAZADA"` (reemplazo standalone, sin incidencia). Decisión tomada con el usuario: **ajustar el test a la regla actual**, no el código — se documentó como comportamiento válido (reemplazo sin incidencia se registra pero no cambia el estado de la clase) en vez de asumir que falta una implementación. Sigue abierta la pregunta de si "reemplazo sin incidencia" debe seguir siendo un caso soportado por la API a futuro — no se tocó `crearReemplazo.ts` ni el repositorio.

También se encontró y removió `"rechaza titular igual a suplente (400)"` en `reemplazos.test.ts`: testeaba un campo (`asignacionSuplenteId`) que `crearReemplazo` nunca lee (el campo real es `agenteSuplenteId`, una entidad distinta — un Agente nunca puede ser "igual" a una Asignacion). No es un gap de negocio, es un test para una forma de request que ya no existe en el contrato actual. Se documenta acá por si en algún momento se quiere una validación real de "no reemplazarse a uno mismo" (comparando el agente titular vigente vs. el agente suplente) — hoy no existe.

## Trabajo de hoy

Reescritos con fixtures propios (sin `factories.createTestAgente`/`destroyInstitucion`), fechas desplazadas a partir de 2026-08-01 (todas posteriores a "hoy" para poder ejercitar reactivación, que bloquea `fecha_hasta < hoy`), y un `PeriodoOperativo` ACTIVO cubriendo todo el rango usado (para que, sin incidencia, la resolución dé `PROGRAMADA/NINGUNA` en vez de `SUSPENDIDA/PERIODO_OPERATIVO` y no ensucie las aserciones):

1. **`tests/incidencias.test.ts`** — conserva todos los tests de validación CRUD existentes (shifted), suma:
   - test nuevo de `SinClasesProgramadasError` (no existía cobertura).
   - describe nuevo **"Camino INCIDENCIA — resolución de estado de ClaseProgramada"**, en una asignación aislada (`asignacion2Id`), que ejercita secuencialmente todo lo que pedía el punto 2 de ayer:
     - crear incidencia sin reemplazo → `SUSPENDIDA`/`INCIDENCIA`, clases fuera del rango sin tocar.
     - asignar reemplazo a una clase de la incidencia → `REEMPLAZADA`.
     - eliminar ese reemplazo → vuelve a `SUSPENDIDA` (no a `PROGRAMADA`, porque la incidencia sigue activa).
     - extender `fecha_desde` hacia atrás (sin tocar `fecha_hasta`) → prueba puntual del fix de `actualizarIncidencia.ts` de ayer (antes solo miraba `fecha_hasta`).
     - eliminar la incidencia → clases se liberan, vuelven a `PROGRAMADA`/`NINGUNA`, `incidenciaId` null.
     - reactivar la incidencia → se re-vinculan y re-suspenden.

2. **`tests/reemplazos.test.ts`** — fixtures propios, ajuste del test standalone (ver hallazgo arriba), remoción del test obsoleto de "titular igual a suplente".

## Validación

Corrida real contra `gestor_test` (server `dev:test` levantado y bajado en esta sesión, no queda corriendo):

```
tests/incidencias.test.ts + tests/reemplazos.test.ts
Test Files  2 passed (2)
Tests       66 passed (66)
```

`graphify update .` **no se corrió todavía** — pendiente antes de cerrar el tema (ver abajo).

## Pendiente para mañana, en orden recomendado

1. **`graphify update .`** — no se ejecutó hoy. Correrlo antes de seguir para que el grafo refleje los archivos de test reescritos y los 9 archivos de ayer.
2. **Decisión de negocio pendiente**: ¿"reemplazo sin incidencia" sigue siendo un caso soportado por la API? Si la respuesta es no, `crearReemplazo.ts` debería exigir `incidenciaId` (o inferirla de la clase) en vez de aceptarlo opcional. Si la respuesta es sí, falta definir qué estado final le corresponde (hoy no cambia nada, lo cual puede ser confuso para quien use la API). No se tocó código, solo el test.
3. **Confirmar con código (no con grep) el gap de eliminar/reactivar calendario** — sigue siendo el punto 3 de la lista de ayer, no se tocó hoy.
4. **Diseñar la reconciliación en lote de PERIODO_OPERATIVO** (incluyendo `cerrarPeriodo.ts`) — punto 4 de ayer, sigue pendiente.
5. **Decisión sobre `factories.ts`/`cleanup.ts` globales** — hoy se evitó tocarlos (alcance acordado con el usuario), pero 8 archivos de test (`asignaciones`, `distribuciones`, `horario`, `reportes.*`) siguen sin poder correr por el mismo motivo (Agente/Asignacion desactualizados). Es una decisión de alcance mayor (toca infraestructura de test compartida) que requiere aprobación aparte si se quiere abordar.
6. **Código muerto sin decisión** (sigue igual que ayer, no tocado): `eliminarEnRango` en `claseProgramadaService`, funciones huérfanas en `claseProgramadaRepository` y `reemplazoRepository`. Sumar a esa lista: los escritos hardcodeados de `estado` en `reemplazoRepository.crear()`/`.eliminar()` (hallazgo de hoy) — no son incorrectos hoy (se pisan enseguida por `resolverClase`), pero son ruido que puede confundir a futuro; candidato a limpieza cuando se resuelva el punto 2 de esta lista.
