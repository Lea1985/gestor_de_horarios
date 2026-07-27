Punto de partida — ClaseProgramada — sesión de estabilización 2026-07-24

## Diagnóstico de partida

El Motor de Resolución (`resolucionClaseService.ts` — `resolverClase`, `resolverEstadoYCausa`, `obtenerCondicionesVigentes`) estaba terminado pero sin ningún llamador en todo el proyecto. Al auditar el flujo real de incidencias/reemplazos se confirmó algo más grave que lo ya documentado: la rama INCIDENCIA de la tabla de precedencia nunca se ejecutó en producción. Crear una incidencia no suspendía ninguna clase. Asignar un reemplazo no marcaba la clase como cubierta. Editar, eliminar o reactivar una incidencia no tocaba las clases para nada.

Causa raíz de `generarClasesIncidencia.ts` (el archivo original): intentaba generar clases nuevas con `prisma.claseProgramada.createMany` + `skipDuplicates`, pero las clases ya existían (creadas por `generarParaRango` al armar la distribución). El `@@unique([asignacionId, moduloId, fecha])` hacía que `skipDuplicates` descartara el insert en silencio — la incidencia quedaba creada, pero nunca vinculada a ninguna clase.

## Cambios de código de esta sesión (9 archivos, listos para aplicar)

1. **`lib/usecases/incidencias/resolverClasesIncidencia.ts`** (nuevo) — reemplaza a `generarClasesIncidencia.ts` (borrar el viejo). No genera clases: busca las existentes en el rango de la incidencia, las vincula (`incidenciaId`) y llama a `resolverClase` por cada una.

2. **`lib/services/claseProgramadaService.ts`** — dos métodos nuevos:
   - `vincularIncidencia({ asignacionId, incidenciaId, desde, hasta })` — busca clases existentes en rango y les setea `incidenciaId`. Usado por `resolverClasesIncidencia`.
   - `desvincularIncidencia(incidenciaId)` — libera `incidenciaId` de las clases de una incidencia (para eliminar). El llamador debe volver a llamar `resolverClase` sobre las que devuelve.

3. **`lib/usecases/incidencias/crearIncidencia.ts`** — ahora llama a `resolverClasesIncidencia(nueva.id, tenantId)` después de crear el registro. Sin esto, la incidencia se creaba pero nunca resolvía nada (el bug central).

4. **`lib/usecases/reemplazos/crearReemplazo.ts`** — ahora llama a `resolverClase(claseId, tenantId)` después de crear el reemplazo, para que la clase pase a REEMPLAZADA.

5. **`lib/usecases/incidencias/actualizarIncidencia.ts`** — el chequeo de "cambió el rango" ahora mira `fecha_desde` **y** `fecha_hasta` (antes solo miraba `fecha_hasta`, así que extender el inicio de una incidencia no volvía a resolver nada).

6. **`lib/usecases/incidencias/eliminarIncidencia.ts`** — ahora desvincula (`desvincularIncidencia`) y vuelve a resolver (`resolverClase`) las clases afectadas al borrar, en vez de dejarlas huérfanas en SUSPENDIDA/REEMPLAZADA para siempre.

7. **`lib/usecases/incidencias/reactivarIncidencia.ts`** — ahora llama a `resolverClasesIncidencia(id, tenantId)` después de reactivar (gap simétrico al de crear).

8. **`lib/usecases/reemplazos/eliminarReemplazo.ts`** — ahora llama a `resolverClase(reemplazo.claseId, tenantId)` después de borrar el reemplazo, para que la clase vuelva a SUSPENDIDA por INCIDENCIA (no se quede en REEMPLAZADA con el reemplazo ya inexistente).

9. **`lib/usecases/reemplazos/reasignarReemplazoAIncidencia.ts`** — se sacó el `estado: "REEMPLAZADA"` hardcodeado dentro de la transacción (bypaseaba el motor: no seteaba `causa`, no incrementaba `versionResolucion`, no respetaba el guard de DICTADA). Ahora la transacción solo mueve el FK y los reemplazos; `resolverClase` decide el estado después.

Principio aplicado en los 9: ningún usecase toca `prisma.claseProgramada` directo. Todo pasa por `claseProgramadaService` (mutaciones de vínculo) o `resolucionClaseService` (decisión de estado/causa).

## Confirmado funcionando — no tocar

- `recalcularSuspendidasPorCalendario` (causa CALENDARIO_ESCOLAR) está conectada en `crearCalendarioEscolar.ts` y `actualizarCalendarioEscolar.ts`. Lógica correcta: solo toca su propia causa, respeta precedencia.
- `suspenderNoVigentes` (causa CAMBIO_DISTRIBUCION) en uso real en `asignarModulos.ts`, `nuevaVersionDistribucion.ts`, `eliminarDistribucion.ts`.
- `activarPeriodo.ts` genera clases nuevas correctamente vía `generarParaRango` — no bypasea el service para eso.

## Pendiente — no resuelto en esta sesión

1. **Tests desactualizados.** No se corrió la suite porque no refleja el flujo nuevo (crear incidencia ahora resuelve clases; antes no hacía nada). Antes de considerar esto estable hace falta actualizar o escribir tests que ejerciten el camino completo: crear incidencia sin reemplazo → SUSPENDIDA; con reemplazo → REEMPLAZADA; editar rango (ambas fechas); eliminar → clases se liberan; reactivar → clases se re-vinculan; eliminar reemplazo → clase vuelve a SUSPENDIDA.

2. **`eliminarCalendarioEscolar.ts` / `reactivarCalendarioEscolar.ts`** — no confirmado con código, solo por ausencia en un grep: probablemente no llaman a `recalcularSuspendidasPorCalendario`, mismo patrón que se encontró y arregló en incidencias (eliminar/reactivar no reconcilian).

3. **PERIODO_OPERATIVO sin conectar.** `activarPeriodo.ts` genera clases nuevas pero nunca re-evalúa las clases existentes que quedan fuera del rango del período recién activado (deberían pasar a SUSPENDIDA por PERIODO_OPERATIVO) ni las que vuelven a estar en rango al reactivar un período (deberían revertir). Por escala — puede afectar todas las clases de la institución — no conviene resolver clase por clase en loop; hace falta un mecanismo en lote, en el mismo espíritu que `recalcularSuspendidasPorCalendario`. No diseñado todavía.

4. **`cerrarPeriodo.ts`** — no revisado en esta sesión. Podría necesitar reconciliación simétrica a la de `activarPeriodo`.

5. **Caso borde en `actualizarIncidencia.ts`**: si el rango se achica, las clases que quedan afuera del nuevo rango no se desvinculan ni revierten. Identificado, no resuelto (bajo riesgo: la Regla 2 ya bloquea la edición si alguna clase afectada tiene reemplazo activo).

6. **Atomicidad**: `crearIncidencia` + `resolverClasesIncidencia` no están en una misma transacción. Si la resolución falla, la incidencia queda creada sin resolver. No bloqueante, sí una mejora pendiente.

7. **Código muerto sin decisión** (ya inventariado antes de esta sesión, sigue sin tocar): `eliminarEnRango` en `claseProgramadaService`, funciones huérfanas en `claseProgramadaRepository` (`generarParaDistribucion`, `eliminarFuturas`, `suspenderFuturas`), y en `reemplazoRepository` (`detectarReemplazosParaMigrar`, `migrarReemplazosAIncidencias`).

## Orden recomendado para la próxima sesión

1. Aplicar los 9 archivos de esta sesión.
2. Actualizar/escribir tests para el camino INCIDENCIA antes de confiar en la suite vieja — es la única forma real de verificar que esto quedó bien, dado que no se corrió nada todavía.
3. Confirmar con código (no con grep) el gap de eliminar/reactivar calendario y cerrarlo si es real.
4. Diseñar la reconciliación en lote de PERIODO_OPERATIVO (incluyendo `cerrarPeriodo.ts`).
5. Recién ahí, decidir qué hacer con el código muerto.