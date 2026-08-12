# Punto de partida — cierre de sesión (12/08/2026)

Continuación de `docs/punto-de-partida-clase-programada-2026-08-12.md` (11/08, guardado con fecha corrida) y de `docs/fase1-fase2-inventario-metricas-dashboard.md`. Esta sesión completó las Fases 4 y 5 del plan de validación del Dashboard (que quedaban pendientes), y de ahí se derivaron dos hilos nuevos: la navegación real de los KPIs del Dashboard, y una discusión de fondo sobre qué debería significar "Sin cobertura".

**Nota:** el documento `docs/fase1-fase2-inventario-metricas-dashboard.md` que está en el repo solo cubre hasta Fase 2 (commit `e3171b9`, 11/08) — el contenido de Fase 4/5 de hoy quedó documentado acá, no se volvió a pegar en ese archivo. Si se quiere tener todo en un solo doc, hay que fusionarlos en la próxima sesión.

---

## Fase 4/5 del plan de validación del Dashboard — completadas

Comparación de 3 niveles (DB vs API vs UI) sobre el dataset de Escuela N°12, para todas las métricas del inventario de Fase 1.

**KPIs simples de "hoy":** los 6 (clasesHoy=6, reemplazosActivos=0, suspendidasHoy=4, sinCoberturaHoy=0, incidenciasActivas=1, coberturaPorcentaje=100%) coinciden exacto entre SQL crudo, API y UI. Verificado también `continuidadPedagogica` (100%, recalculado a mano desde el timeline: 18/18) y `deltaCobertura` (null, correcto porque ayer tuvo denominador 0).

**Riesgo operativo y Banda de alertas** (lógica 100% frontend, sin backend): verificados a mano contra `calcularRiesgo`/`BandaAlertas` — con suspendidas=4>2 corresponde "Medio" y exactamente 1 alerta. Coincide con la UI.

**Tendencia de cobertura + Mapa de calor:** el "Promedio institucional: 75%" es el promedio simple de los 8 `coberturaPorcentaje` diarios del timeline. Cada celda coincide con el timeline institucional.

**Próximos vencimientos:** validado exacto contra SQL (vencenHoy=0, vencenManana=0, vencenEstaSemana=5, reemplazosVencenSemana=5).

**Rankings — los 3, validados:** "Agentes con más licencias" y "Artículos más usados" exactos contra SQL independiente, sin hallazgos.

### Bugs reales encontrados y corregidos en Fase 4/5

1. **"Comisiones con más ausencias" cortaba incidencias en curso.** El filtro de fecha se aplicaba sobre `ClaseProgramada.fecha` en vez de `Incidencia.fecha_desde` — una incidencia multi-día ya iniciada perdía del conteo los días que todavía no habían pasado. Corregido para usar `incidencia.fecha_desde`, igual criterio que los otros 2 rankings de la función. Verificado con datos reales: 7→9 (correcto, excluye 2 incidencias que todavía no habían arrancado). Commit `620cccb`.

2. **Cobertura institucional daba 0% en vez de 100% cuando todas las clases del día estaban suspendidas.** Detectado comparando la vista institucional contra la vista por comisión del mismo día exacto (03/08, comisión 1ro A, 6 clases todas SUSPENDIDA): el timeline institucional mostraba 0%, la vista por comisión (mismos datos) mostraba 100%. `calcularCobertura()` devolvía `0` en el caso límite "todo suspendido"; `obtenerCoberturaPorComision.ts` ya usaba `100` a propósito. Inconsistencia preexistente al fix del 11/08, nunca se había probado ese caso límite. Corregido: mismo criterio en los dos archivos. Commit `08ba5d2`.

**Con esto, el plan de validación del Dashboard queda completo: 5 fases, 8 discrepancias reales encontradas y corregidas en total entre las dos sesiones (6 el 11/08, 2 el 12/08), todas con evidencia empírica.**

---

## Hilo nuevo — navegación desde los KPIs del Dashboard (fuera del plan original)

Se probó a qué pantalla lleva cada uno de los 5 KPIs principales al hacer clic.

- **"Cobertura institucional hoy" → 404.** El link apunta a `/protected/dashboard/reportes`, que no existe como página índice. Bug de UI real, sin corregir.
- **"Incidencias activas" → `/incidencias` (8 activas) vs. KPI del Dashboard (1 hoy).** No es un bug: son métricas distintas a propósito. `/incidencias` es una pantalla de uso general (accesible también desde el menú, para gestión), lista *todas* las incidencias activas. El KPI del Dashboard cuenta solo las de hoy. Se decidió explícitamente no tocar esa pantalla.
- **"Reemplazos activos"/"Clases sin cobertura" → `/clases`, bug real.** Esta pantalla sí es un drill-down exclusivo del Dashboard (confirmado con el usuario, no se accede por otro flujo), así que se decidió corregirla.

### Causa raíz y fix de `/clases`

`app/protected/dashboard/clases/page.tsx` tenía su propia lógica de conteo, separada de `calcularCobertura.ts`. El bug puntual: contaba `clase.reemplazos.length > 0` sin filtrar por el campo `activo` (que el include del repository ya trae pero se ignoraba) — un reemplazo histórico desactivado se seguía contando como si siguiera vigente. Efecto visible: el Dashboard decía "Reemplazos activos: 0" hoy, `/clases` decía "1", mismo día; y una fila con estado `SUSPENDIDA` mostraba igual un suplente de un reemplazo viejo.

Se corrigió en dos pasadas:
1. Parche rápido: filtrar `reemplazos` por `r.activo` en el cliente, clasificando cada clase con el mismo criterio que `calcularCobertura.ts` (SUSPENDIDA > reemplazo activo > incidencia sin reemplazo > normal). Funcionó, los números coincidieron.
2. **Fix de fondo (decisión explícita del usuario: "yo iría por ese camino, creo que es el correcto"):** en vez de mantener dos implementaciones sincronizadas a mano, se eliminó la duplicación de raíz.
   - `lib/reporting/datasets/obtenerClasesOperativas.ts` extendido (aditivo, sin romper consumidores existentes) con `modulo` y `asignacion.materia`, los dos campos que le faltaban para cubrir la tabla de `/clases`.
   - Endpoint nuevo `app/api/dashboard/clases-hoy/route.ts`, que solo expone `obtenerClasesOperativasHoy(tenantId)` sin lógica propia.
   - `app/protected/dashboard/clases/page.tsx` reescrita: ya no calcula nada por su cuenta, consume `/api/dashboard/clases-hoy` y usa el `coberturaEstado` que viene resuelto del servidor.
   - De paso se agregó color rojo/verde a las tarjetas "Suspendidas" y "Sin cobertura" de `/clases`, mismo criterio que ya usaba "Clases sin cobertura" en el Dashboard principal.
   - Verificado en vivo tras reiniciar el servidor de dev (necesario, ruta de API nueva no la toma el hot-reload): los 4 números vuelven a coincidir exacto con el Dashboard principal.

**Pendiente: no se confirmó si el commit de este refactor (3 archivos) se ejecutó** — se dieron los comandos pero la conversación siguió para otro lado antes de ver la confirmación. Revisar con `git log` al empezar la próxima sesión.

Hallazgo colateral: `claseProgramadaRepository.ts` (`claseIncludeList`) trae `titularidades` con el mismo patrón de "titular más reciente" (no "vigente en la fecha") que ya se había auditado y dado por "sin consumidor real" (tarea histórica #29). Ahora `/clases` sí lo consume vía `listarClases`, aunque no se ve en pantalla hoy (la tabla no muestra columna de titular). Tarea reabierta, sin resolver — riesgo latente si se agrega esa columna en el futuro.

También se encontró, sin corregir, una 7ma y 8va instancia del mismo bug de timezone local (`setHours` en vez de `setUTCHours`) en `app/api/clases/route.ts` y `lib/usecases/clases/listarClases.ts`. Se decidió no tocarlos porque `/clases` ya no los usa tras el refactor — pero el bug sigue latente para cualquier otro consumidor de `/api/clases` que use fechas.

---

## Hilo nuevo — qué debería significar "Sin cobertura" (acordado en diseño, sin implementar)

El usuario cuestionó el indicador "Sin cobertura" al ver que decía 0 con 4 clases suspendidas en pantalla. Después de una ronda de preguntas para entender la confusión real (no era el número, era que el nombre no representa bien qué mide), se llegó a un acuerdo:

**Definición actual** (la que se validó todo el día de hoy): "Sin cobertura" = clases que siguen `PROGRAMADA` (no suspendidas), tienen incidencia activa, sin reemplazo asignado.

**Definición propuesta por el usuario, con la que coincido:** "Sin cobertura" = clases `SUSPENDIDA` con `causa = INCIDENCIA` específicamente (la ausencia nunca se cubrió, por eso la clase se canceló) — no cualquier motivo de suspensión (un feriado no es una falla de cobertura).

Se verificó por código un detalle importante antes de cerrar el acuerdo: ¿puede existir una clase "PROGRAMADA con incidencia activa y sin reemplazo" (el caso de la definición actual)? Se confirmó que **no** — `lib/usecases/incidencias/resolverClasesIncidencia.ts` (llamado desde `crearIncidencia.ts`) vincula la incidencia a todas las clases afectadas y corre `resolverClase` sobre cada una de forma síncrona, en el momento de crear la incidencia. Como en ese instante todavía no existe ningún reemplazo, toda clase afectada queda `SUSPENDIDA` de inmediato — nunca queda "flotando" en PROGRAMADA. Esto simplifica la nueva definición: no hace falta cubrir ese caso porque es imposible en este sistema.

**Definición final acordada:**
- Sin cobertura = `SUSPENDIDA` con `causa = INCIDENCIA`
- Cubierta = normal (sin incidencia) + `REEMPLAZADA` + `DICTADA`
- Neutral (no cuenta ni a favor ni en contra) = `SUSPENDIDA` por cualquier otra causa (CALENDARIO_ESCOLAR, CAMBIO_DISTRIBUCION, PERIODO_OPERATIVO, MANUAL, FIN_ASIGNACION)

**No se implementó todavía.** Es un cambio grande: toca directamente `calcularCobertura.ts` (el denominador cambiaría de "total menos todas las suspendidas" a "total menos las suspendidas que no son por incidencia sin cubrir"), lo que en cascada afecta el KPI "Cobertura institucional hoy", `deltaCobertura`, `continuidadPedagogica`, el timeline, el mapa de calor, `mapearCoberturaHoy` (la lista de "sin cobertura"), `BandaAlertas`, y el PDF exportado. Todo lo que se validó hoy contra SQL con la definición vieja habría que re-validarlo con la nueva.

---

## Pendiente para la próxima sesión

1. **Confirmar/ejecutar el commit del refactor de `/clases`** (3 archivos) — verificar con `git log` si quedó pendiente.
2. **Implementar la redefinición de "Sin cobertura"** (acordada en diseño) y re-validar contra SQL todo lo que depende de `calcularCobertura`.
3. **Arreglar el 404** de "Cobertura institucional hoy" → decidir destino correcto.
4. Decidir si colorear "Suspendidas hoy" en el Dashboard principal (mismo criterio que ya se aplicó en `/clases`) — pausado por el tema de la redefinición, tiene sentido resolverlo después de esa para no colorear con un criterio que va a cambiar.
5. Timezone sin corregir en `app/api/clases/route.ts` / `listarClases.ts` — confirmar si `/api/clases` tiene otros consumidores antes de decidir si corregirlo.
6. `claseProgramadaRepository.ts` titular más reciente (tarea reabierta) — sin consumidor visible hoy, pero ya tiene consumidor real. Evaluar si corregir preventivamente.
7. Fusionar el contenido de Fase 4/5 de este documento en `docs/fase1-fase2-inventario-metricas-dashboard.md`, que en el repo solo llega hasta Fase 2.
8. Lo ya arrastrado de sesiones anteriores, sin cambios: seed de Codigario/Ceferino, banner de cadena de reemplazo completa, y las 2 implementaciones de baja prioridad de "titular más reciente" sin consumidor real (`horarioRepository.ts`, y la de `claseProgramadaRepository.ts` para otros métodos distintos de `listar`).

---

## Estado general al cierre

Sesión de continuación directa de ayer: se cerró el plan de validación del Dashboard de punta a punta (Fases 1 a 5), con 2 bugs reales más encontrados con el mismo método de siempre (comparar vistas que deberían coincidir y no coinciden). Después, probar la navegación real de los KPIs — algo que no estaba en el plan original pero surgió naturalmente de "clickear y ver qué pasa" — encontró un 404 real y una duplicación de lógica que ya había desalineado un número del Dashboard. Se optó por el fix estructural (una sola fuente de datos) en vez del parche, decisión explícita del usuario. La sesión cerró con una discusión de diseño genuina sobre qué debería medir "Sin cobertura", que quedó acordada pero no implementada — es la tarea más grande para la próxima sesión, con impacto directo en casi todo lo que se validó hoy.