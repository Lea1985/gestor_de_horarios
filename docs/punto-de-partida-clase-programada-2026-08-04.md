# Punto de partida — continuación del testeo manual (para el 04/08/2026)

Continuación directa de `punto-de-partida-2026-08-03.md` (mismo día de calendario, sesión extendida). Ese documento cerraba con 5 bugs encontrados/corregidos y una lista de 9 pendientes cargada como tareas. Esta sesión atacó esa lista una por una, encontró 2 bugs más (uno de ellos grande, con un rediseño de arquitectura de por medio), y terminó con un fix escrito pero **todavía sin pegar ni verificar** — es lo primero para mañana.

---

## Lo que se avanzó

**Commit de los 5 fixes anteriores.** Se separaron en 12 commits lógicos por tema (limpieza de entorno, bcrypt→bcryptjs, tsconfig, seed Ceferino, docs de sesión, dump de codigarios, scripts de seed/verificación, y los 5 fixes de bugs uno por uno) en vez de un commit gigante. Todo en la rama `refactor-clases-programadas-frontend`.

**Task #3 — `suspenderNoVigentes` vs. clase `SUSPENDIDA`/`INCIDENCIA` → Bug 6 encontrado y corregido.** Se armó el test sospechado: una clase suspendida por incidencia, y después un cambio de distribución que ya no la contempla. Confirmado con datos reales: la causa `INCIDENCIA` se pisaba silenciosamente con `CAMBIO_DISTRIBUCION` — el mismo `incidenciaId` quedaba huérfano en la fila (FK sin borrar, pero la causa ya no reflejaba la realidad). Fix: en `lib/services/claseProgramadaService.ts`, `suspenderNoVigentes` ahora excluye del barrido cualquier clase cuya causa actual sea `INCIDENCIA` (protegida, por estar por encima de `CAMBIO_DISTRIBUCION` en la precedencia acordada). Verificado con un caso limpio (incidencia nueva sobre el 07/08, cambio de distribución de por medio) — la protección funcionó, quedó `SUSPENDIDA`/`INCIDENCIA` intacta mientras otras fechas sin protección sí pasaron a `CAMBIO_DISTRIBUCION` como corresponde.

**Task #6 — causa `PERIODO_OPERATIVO` → validado, sin bugs.** Se cerró "Periodo de prueba 1" y se activó uno nuevo, más angosto (15–20/08). `reconciliarPorPeriodoOperativo` suspendió correctamente con `PERIODO_OPERATIVO` las clases fuera del rango nuevo, respetando la protección de `INCIDENCIA`/`CAMBIO_DISTRIBUCION` (no las tocó, aunque también estaban fuera del rango). Sin sorpresas.

**Task #4 — flujo completo de "nueva versión" → validado, sin bugs.** Se ejecutó de punta a punta sobre Asignación 1: cierra la versión vieja, suspende el tramo vigente respetando precedencia (`DICTADA` protegida, `PERIODO_OPERATIVO` correctamente superado por `CAMBIO_DISTRIBUCION` según el orden documentado), la versión nueva nace vacía. Aparecieron dos filas nuevas inesperadas (19/08) que en un primer momento parecían un bug — se confirmó que eran el resultado normal de asignarle módulos de miércoles a la versión nueva justo después (la UI navega ahí automáticamente al confirmar "nueva versión"), y de paso reconfirmó que el fix del Bug 1 de la sesión anterior (`asignarModulos`) sigue funcionando bien en un escenario nuevo.

**Task #7 — editar incidencia y reactivar → en curso, sin terminar.** Se leyó `actualizarIncidencia.ts` y se encontró un comentario del propio desarrollador: si se **achica** el rango de fechas de una incidencia, las clases que quedan afuera del nuevo rango no se desvinculan — queda marcado en el código como "caso pendiente", no es un bug escondido. Se armó el test para confirmarlo empíricamente (incidencia sobre Asignación 2, 12/08–21/08) y se llegó hasta el paso de asignar reemplazos en el wizard, pero **el paso de achicar el rango y verificar el resultado nunca se completó** — quedó interrumpido cuando apareció el hallazgo de abajo. `reactivarIncidencia.ts` se leyó pero no se probó en absoluto.

### Hallazgo grande, fuera de la lista original — Bug 7: `cerrarPeriodo` marcaba `DICTADA` sin mirar la fecha

Durante el test de "achicar rango", el usuario notó algo raro en el wizard de incidencias: aparecían clases futuras (17/08, 20/08, etc., con "hoy" = 03/08) ya marcadas `DICTADA`. Investigado: `cerrarPeriodo.ts` marcaba como `DICTADA` **todas** las `PROGRAMADA` dentro del rango del período cerrado, sin distinguir si la fecha ya había pasado o no — se había cerrado "Periodo de prueba 1" un rato antes para probar `PERIODO_OPERATIVO`, y esto marcó como "ya dictadas" clases que ni siquiera habían ocurrido todavía. Confirmado con datos reales: 17/08, 31/08 (asignación 1) y 06, 13, 20, 27/08 (asignación 2) quedaron `DICTADA` estando en el futuro respecto de "hoy".

**Decisión de diseño tomada con el usuario:** en vez de parchear `cerrarPeriodo.ts` con lógica de fechas ad-hoc, se integró la regla directamente en el motor central (`resolverEstadoYCausa`), como último escalón de la tabla de precedencia — reemplazando el `NINGUNA -> PROGRAMADA` fijo por: si ninguna otra causa aplica y la fecha ya pasó, `DICTADA`; si no, `PROGRAMADA`. Esto simplifica mucho `cerrarPeriodo.ts` (ya no necesita saber nada de fechas, solo dispara `resolverClase` por cada clase residual) y hace que **cualquier** disparador existente (incidencia, calendario, cambio de distribución, activar/cerrar período) herede la regla gratis, sin duplicar lógica.

**Fix escrito, sin verificar todavía:**
- `lib/types/claseProgramada.ts`: se agregó `fechaYaPaso: boolean` a `CondicionesVigentes`.
- `lib/services/resolucionClaseService.ts`: `obtenerCondicionesVigentes` calcula `fechaYaPaso` (fecha de la clase <= hoy); `resolverEstadoYCausa` agrega el escalón nuevo antes del fallback final.
- `lib/usecases/periodosOperativos/cerrarPeriodo.ts`: reescrito para delegar 100% al motor. Detalle importante resuelto durante el diseño: **resuelve las clases residuales antes de marcar el período como `CERRADO`**, no después — si se cierra primero, el motor ya no ve el período como vigente al resolver, y las fechas pasadas quedarían mal como `SUSPENDIDA`/`PERIODO_OPERATIVO` en vez de `DICTADA`.

**Pendiente inmediato:** pegar los tres archivos (probablemente ya están pegados si se hizo antes de cortar la sesión, confirmar) y correr un ciclo real de cerrar/activar período con datos frescos para verificar con evidencia, mismo rigor que el resto de los bugs de hoy. No se llegó a hacer.

---

## Pregunta abierta que hay que resolver de alguna manera — clases que llegan a "hoy" sin que nada las toque

Este es el límite real del fix de arriba, y no se resuelve solo con el cambio al motor: la regla nueva (`fechaYaPaso -> DICTADA`) **solo se aplica cuando algo dispara `resolverClase`** sobre esa clase puntual (crear/editar/borrar una incidencia, cambiar una distribución, cerrar un período, etc.). Si una clase queda `PROGRAMADA`, su fecha pasa, y **nada** la toca en el medio (ningún evento ocurre para esa asignación en ese lapso), se queda `PROGRAMADA` para siempre — el sistema no tiene ningún mecanismo que reaccione al simple paso del tiempo.

Esto ya se había anotado como problema en sesiones anteriores, a raíz de la investigación original sobre la métrica de "dictadas" del Dashboard: en ese momento se había descartado escribir el estado real vía un job programado porque "no existe ninguna infraestructura de jobs/cron en el proyecto", y se había inclinado la balanza hacia calcular "dictada" al leer, no al escribir. El fix de hoy resuelve el problema *cuando hay un disparador*, pero no cambia esa conclusión de fondo. Faltan decidir, no excluyentes entre sí:

1. **Job programado** (cron / tarea periódica) que recorra las `PROGRAMADA` con `fecha <= hoy` de todas las instituciones y llame a `resolverClase` — requiere infraestructura nueva, ya señalado como costo real en su momento.
2. **Resolución perezosa al leer**: en vez (o además) de escribir el estado real, cualquier pantalla/reporte que necesite saber si una clase "ya se dictó" aplica la regla `PROGRAMADA + fecha <= hoy` al momento de mostrarla, sin depender de que el estado en la base ya haya sido actualizado. Es lo que se había planteado originalmente para el Dashboard.
3. **Híbrido**: dejar la resolución perezosa para lectura rápida (Dashboard, reportes), y un job programado más espaciado (ej. una vez por día) solo para mantener la base consistente a mediano plazo, sin depender de que alguien abra un reporte para que se actualice.

No se tomó una decisión — queda para una conversación aparte, probablemente ligada a cuando se retome el plan de validación del Dashboard (donde esta misma pregunta ya había aparecido).

---

## Estado de las tareas al cierre

| # | Tarea | Estado |
|---|---|---|
| 2 | Auditar 9 archivos con `toLocaleDateString`/`toLocaleString` | Pendiente (con una confirmación extra hoy: el bug también aparece en la pantalla de períodos operativos) |
| 3 | `suspenderNoVigentes` vs. `INCIDENCIA` | **Hecho** — bug 6 encontrado, corregido y verificado |
| 4 | Flujo completo de "nueva versión" | **Hecho** — validado sin bugs |
| 5 | Incidencias encadenadas (`incidenciaPadreId`) | Pendiente, sin tocar |
| 6 | Causa `PERIODO_OPERATIVO` | **Hecho** — validado sin bugs |
| 7 | Editar incidencia y reactivar | **En curso, sin terminar** — gap de "achicar rango" identificado en el código pero no confirmado con datos; reactivar sin probar; el bug 7 (`cerrarPeriodo`) salió de acá y quedó sin verificar |
| 8 | Eliminar distribución y fin de asignación | Pendiente, sin tocar |
| 9 | Commitear fixes | **Hecho** |
| 10 | Retomar plan del Dashboard | Pendiente, pospuesto de nuevo |
| 11 | Seed real de Codigario + Colegio Ceferino | Pendiente, sin cambios |

---

## Plan para mañana, en orden

1. **Verificar el fix del Bug 7** (`fechaYaPaso` en el motor + `cerrarPeriodo.ts` simplificado) con un ciclo real de cerrar/activar período y datos frescos — quedó escrito pero sin confirmar con evidencia.
2. **Terminar el test de "achicar rango" de incidencia** (task #7, interrumpido): achicar la incidencia de Asignación 2 (12/08–21/08) y confirmar si las fechas que quedan afuera del nuevo rango siguen mal vinculadas, tal como advierte el comentario del código.
3. **Probar reactivar una incidencia eliminada** (`reactivarIncidencia.ts`, nunca probado) y, si da tiempo, `reactivarCalendarioEscolar.ts`.
4. Seguir con las tareas #5 (incidencias encadenadas), #8 (eliminar distribución / fin de asignación) y #2 (barrido de fechas en los 9 archivos restantes).
5. Definir qué hacer con la pregunta abierta de arriba (job programado vs. resolución perezosa vs. híbrido) antes o al retomar el plan del Dashboard.
6. Commitear el fix del Bug 7 una vez verificado.
7. Retomar el plan del Dashboard (#10) y el seed real de Ceferino (#11) siguen al final de la cola.

## Estado general al cierre

Van 7 bugs reales encontrados y corregidos en dos días de testeo manual (5 el primer día, 2 más hoy), todos confirmados con evidencia empírica antes y después del fix. El de hoy más importante no es un bug puntual sino un hallazgo de diseño: el motor de resolución ahora decide también cuándo una clase "ya se dictó" por el simple paso del tiempo, en vez de que esa lógica viviera suelta en el cierre de período — pero expuso un límite real y ya conocido de la arquitectura (nada reacciona al paso del tiempo sin un disparador), que sigue sin resolverse y quedó documentado explícitamente para retomar. El motor generador de clases y el de reconciliación siguen sin estar validados al 100%, pero cada sesión reduce la lista de zonas grises con evidencia real, no solo con lectura de código.