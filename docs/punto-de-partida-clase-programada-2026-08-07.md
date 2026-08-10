# Punto de partida — Cierre 06-08-2026

Continuación de `punto-de-partida-clase-programada-2026-08-06.md` (el doc del 05/08 que dejó la lista de 5 puntos prioritarios + 1 opcional). Hoy se cerraron los 6, sin excepción. Esta sesión terminó de resolver la última duda abierta sobre "¿está el motor validado?": bajo el criterio acordado ayer (todas las causas y transiciones alcanzables ejercitadas al menos una vez con datos reales, sin bugs conocidos sin cerrar), la respuesta hoy es sí.

---

## Hilo 1 — Corrección de un commit incompleto (tarea #16, cerrada de verdad)

Al arrancar el día se descubrió que el fix de `reactivarAsignacion.ts` (documentado ayer como cerrado, commit 33c5a64) nunca se había subido realmente: el archivo quedó afuera del `git add` de aquel commit, y lo que se subió fue la versión vieja (sin el `resolverClase` de las clases `FIN_ASIGNACION`). El código en disco sí tenía el fix correcto — quedaba sin commitear.

**Lección para el futuro:** revisar `git status`/`git diff` antes de dar por cerrada una tarea, no alcanza con la verificación en vivo si después no se confirma que el commit realmente contiene lo que dice contener.

---

## Hilo 2 — `eliminarReemplazo.ts` revisado con rigor (tarea #19, cerrada)

Código leído completo. Dos caminos:

- **Camino sin bloqueo** (quitar un reemplazo cuando no hay una incidencia hija activa cubriendo esa fecha): probado con datos reales sobre la clase 71 (incidencia 9, reemplazo de Pérez). Resultado correcto: `SUSPENDIDA`/`INCIDENCIA`, `incidenciaId` intacto (no vuelve a `PROGRAMADA`, la incidencia sigue activa), reemplazo desactivado.
- **Camino bloqueado** (`ReemplazoConIncidenciaHijaError`): revisado por código, no forzado con datos. El flujo real de la UI (`reasignarReemplazoAIncidencia`, disparado por "Ausencia del suplente") crea la incidencia hija y reasigna el reemplazo de forma atómica — no deja la ventana de estado intermedio que el guard protege. El guard es defensivo y correcto, pero hoy no es alcanzable desde la UI normal. Se decidió no forzarlo artificialmente.

---

## Hilo 3 — Bug real: cadena de incidencias de 3+ niveles rota (tarea #20, cerrada con fix)

Se armó una asignación de prueba nueva (Romina Juárez, aula 1) para no pisar el escenario de Ramos/Alegre/Pérez ya usado. Antes de tocar incidencias, se verificó que el motor generador respeta el período operativo por sobre el rango más amplio de asignación/distribución (asignación 10/07→19/09, distribución 16/07→22/08, período activo 01/08→15/08): solo se generaron las clases de los viernes dentro del período (07/08 y 14/08), sin generar el viernes 21/08 que cae afuera — correcto, sin bugs.

Al armar la cadena de 3 niveles (incidencia 10 → hija 11 → nieta 12, cada una reasignando el reemplazo: Pepo Pipo → Pérez → Federico Pepo) apareció un bug real: crear la nieta fallaba con "Superposición de fechas con otra incidencia".

**Causa:** `incidenciaRepository.verificarSuperposicion` excluía del chequeo de solapamiento únicamente el `incidenciaPadreId` directo, no toda la cadena de ancestros. El rango de una nieta siempre cae dentro del rango de su abuela (es condición necesaria de la jerarquía), así que cualquier cadena de 3+ niveles chocaba inevitablemente.

**Fix:** se agregó `incidenciaRepository.obtenerAncestros` (CTE recursiva, mismo patrón que el método `cadena()` ya existente), y `verificarSuperposicion` ahora recibe una lista de ids a excluir en vez de uno solo. Se revisaron los otros 3 call sites del método (`actualizarIncidencia`, `reactivarIncidencia`, la ruta `validar-superposicion`) — ninguno pasaba el 6to parámetro, así que no se vieron afectados.

**Verificado con datos reales:** incidencias 10/11/12 con rangos y padres correctos; clases 112/113 (14/08) movieron su `incidenciaId` a la nieta (12); reemplazos viejos `activo=false`, nuevo `activo=true` en cada nivel; clases 110/111 (07/08) siguen bajo la incidencia 11 (correcto, la nieta solo cubre el 14/08).

**Commit** (junto con el fix de reactivarAsignacion, ver Hilo 1 — quedaron mezclados en un solo commit por un error de staging, corregido con `git commit --amend` para documentar ambos):
```
570b9d7 fix(asignaciones,incidencias): reactivarAsignacion no re-resolvía FIN_ASIGNACION + verificarSuperposicion rompía cadenas de 3+ niveles
```

---

## Hilo 4 — Causa MANUAL y `cambiarTitularAsignacion.ts` (tarea #21, opcional, cerrada)

**`MANUAL`:** confirmado por grep que ningún código la dispara — es causa muerta en el enum, igual que estaba `FIN_ASIGNACION` antes de esta semana. A diferencia de aquel caso, no hay un usecase huérfano esperando usarla (no se encontró una necesidad de negocio concreta sin cubrir), así que queda documentada como hallazgo, sin implementar nada.

**`cambiarTitularAsignacion.ts`:** revisado completo. No toca `ClaseProgramada` en absoluto, y está bien que no lo haga — el titular no participa en la tabla de precedencia del motor (`resolverEstadoYCausa` solo mira incidencia/período/calendario/reemplazo). Verificado con datos reales: se cambió el titular de la asignación de Romina Juárez; `TitularAsignacion` quedó con el historial bien cerrado/abierto por fecha (sin solapamiento), y las 4 clases de esa asignación no se movieron de `REEMPLAZADA`/`INCIDENCIA`.

**Hallazgo menor, fuera de alcance del motor:** el patrón `titularidades: { orderBy: fecha_desde desc, take: 1 }`, usado en varios repositorios, siempre trae el titular *más reciente* sin filtrar por fecha relativa a una clase puntual. Un reporte que muestre "quién dio esta clase" para una clase pasada podría mostrar el titular nuevo en vez del que realmente estuvo a cargo en ese momento. Es un tema de reporting/visualización histórica, no del motor de resolución de estado/causa — no se tocó hoy.

---

## Hilo 5 — Hallazgo grande de último momento: "titular más reciente" en vez de "titular vigente en la fecha" (tarea #23, NO cerrada)

Verificando en vivo el hallazgo menor del Hilo 4 (reporting histórico), apareció confirmado y visible: después de cambiar el titular de la asignación de Romina Juárez, la página de detalle de la incidencia #10 (creada bajo Romina, antes del cambio) pasó a mostrar el nombre del titular **nuevo** tanto en "Agente y asignación" como en el panel "Cobertura por tramos" ("Perez, Juan cubrió como reemplazante al titular **Lila, Pilo**" — debería decir Romina Juárez). No es un problema de reporte lejano, es la propia ficha de la incidencia mostrando mal el dato central.

**Causa confirmada:** `IncidenciaDetalleHeader.tsx` (líneas 26 y 31) hace `incidencia.asignacion?.titularidades[0]?.agente` — toma el índice 0 de un array ordenado `fecha_desde desc` sin filtrar por ninguna fecha de referencia, así que siempre trae el titular más reciente en vez del vigente en `incidencia.fecha_desde`. La causa raíz está en el include compartido de `incidenciaRepository.ts` (`titularidades: { orderBy: fecha_desde desc, take: 1 }`).

**Alcance real, todavía sin acotar del todo:** un grep de `titularidades[0]` / `titularidades: {` encontró **30+ ocurrencias** en `lib/` y `features/`. La mayoría son usos legítimos de "titular actual" (asignación vigente, wizard de nueva incidencia, distribución, horarios) donde tomar el más reciente es lo correcto. Pero al menos 3-5 lugares manejan datos con fecha propia (histórica) y son sospechosos serios del mismo bug: la tabla/búsqueda de incidencias (`IncidenciasTable.tsx`, `useIncidencias.ts`) y los reportes PDF de ausencias y de profesor (`lib/pdf/datasets/ausencias.ts`, `profesor.ts`).

**Decisión explícita del usuario:** este hallazgo no se toma a la ligera. No se apura un fix parcial hoy. Queda como tarea #23, con prioridad **antes** de arrancar el plan de validación del Dashboard (tarea #10) — hay que revisar cada sospechoso uno por uno, con el mismo rigor de toda la semana (leer código, diseñar test con datos reales, verificar con SQL), no asumir cuáles son bugs y cuáles no.

**Sin commitear ni tocar código todavía** — ni siquiera el fix de `IncidenciaDetalleHeader.tsx` se implementó, queda para la próxima sesión junto con el resto del sweep.

---

## Estado de la tarea list al cierre del 06/08

| # | Tarea | Estado |
|---|---|---|
| 16 | `reactivarAsignacion.ts` | ✅ cerrada de verdad hoy (el commit de ayer estaba incompleto) |
| 17 | `CALENDARIO_ESCOLAR` sobre fecha pasada | ✅ (cerrada ayer) |
| 18 | Aislamiento multi-tenant | ✅ (cerrada ayer) |
| 19 | `eliminarReemplazo.ts` | ✅ completada hoy |
| 20 | Cadena de incidencias multinivel | ✅ completada hoy (con bug real encontrado y arreglado) |
| 21 | Causa `MANUAL` + `cambiarTitularAsignacion.ts` (opcional) | ✅ completada hoy |
| 23 | Titular más reciente vs. vigente en la fecha (hallazgo de último momento) | ⏳ pendiente — **prioridad 1 para la próxima sesión, antes del Dashboard** |
| 10 | Retomar plan de validación del Dashboard | ⏳ pendiente, sigue pospuesta, ahora detrás de #23 |
| 11 | Seed real de Codigario + Colegio Ceferino | ⏳ pendiente, al final de la cola |

## Estado general al cierre del 06/08

Con los 5 puntos prioritarios + el opcional cerrados, el motor de generación y resolución de clases queda validado bajo el criterio acordado: todas las causas y transiciones alcanzables se ejercitaron con datos reales, y no queda ningún bug conocido sin cerrar. En el camino aparecieron tres hallazgos más: un commit de ayer que documentaba un fix pero no lo incluía realmente (corregido con amend), un bug real en la validación de superposición de fechas que rompía cualquier cadena de incidencias de 3 o más niveles (encontrado y arreglado hoy mismo), y — ya sobre el cierre, verificando en vivo el hallazgo menor de la tarea #21 — un bug real y visible de "titular más reciente en vez de titular vigente en la fecha", con alcance potencial de 30+ archivos, sin acotar ni arreglar todavía (tarea #23). Un solo commit hoy: `570b9d7`.

**Para la próxima sesión, en orden:** primero la tarea #23 (revisar meticulosamente cada sospechoso del sweep de `titularidades[0]`, uno por uno, con el mismo rigor de toda la semana), recién después retomar el plan de validación del Dashboard (#10). El seed real de Codigario + Colegio Ceferino (#11) sigue al final de la cola.