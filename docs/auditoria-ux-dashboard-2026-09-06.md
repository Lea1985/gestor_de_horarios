# Auditoría UX funcional y operativa — Dashboard principal

## 1. Resumen ejecutivo

El Dashboard principal (`/protected/dashboard`) ya pasó por una ronda completa de validación de datos (Fases 1-5, 11-14/08/2026) que corrigió 8 discrepancias reales entre DB/API/UI y cerró explícitamente varios hallazgos de navegación (404 del KPI de cobertura, semáforo indebido en "Suspendidas", falta de Materia/Comisión en las tablas, links no clickeables a la incidencia, filtro de fecha en "próximos vencimientos"). Esa ronda se dio por cerrada el 13/08 con la frase "no quedan hallazgos abiertos". Esta auditoría confirma que los 5 puntos señalados como ya resueltos **siguen resueltos en el código actual** (sección 7).

Sin embargo, desde ese cierre se agregaron al menos 3 features nuevas sin una revalidación UX dedicada (`Personal no docente — hoy`, exclusión de cargos no-frente-a-curso de las métricas de cobertura, `AvisoPeriodoOperativo` embebido en el Dashboard) y esta auditoría encontró un problema transversal no cubierto antes: **cuando falla la carga de datos del Dashboard, cuatro widgets distintos (Riesgo operativo, Banda de alertas, Pendientes hoy, y dos de los cinco KPIs) no reflejan el error — muestran activamente un estado de "todo en orden" (0, verde, "Sin pendientes ✓", "Operación estable") que contradice el propio cartel de error visible arriba de ellos.** En la pantalla de mayor tráfico esperado del sistema, esto es exactamente el patrón que esta auditoría busca detectar: el sistema no le explica al usuario qué pasó, y en este caso además le dice lo contrario de lo que pasó.

También se encontró que la exportación de PDF no informa ningún error al usuario si falla (falla silenciosa), y una serie de inconsistencias menores de manejo de error entre los distintos hooks/servicios del módulo.

No se encontraron problemas en: los datos y links ya corregidos en la ronda de agosto, el flujo de filtros de "Próximos vencimientos", el modal "Ver todos" de Rankings, ni en la lógica de definición de "Sin cobertura"/cobertura de aula (ya validada en sesiones previas y sin cambios desde entonces).

**Distribución de hallazgos:** 1 P0, 2 P1, 3 P2, 3 P3.

## 2. Rama y commit auditado

- Rama: `develop`
- Commit: `11f49821422f4277d0124240e1bc84247868fb38`
- **Acceso a navegador:** NO se usó navegador/DevTools interactivo en esta auditoría (no hay herramienta de automatización de browser disponible en este entorno). El servidor de desarrollo (`next dev`, puerto 3000) está corriendo y responde `200`, pero la verificación fue por **lectura de código** exclusivamente. Todos los hallazgos están marcados `Fuente: código (inferido)`. Se recomienda una pasada en vivo (con el tenant de prueba "Escuela Primaria N°12", ya usado en las auditorías previas) antes de priorizar implementación, en particular para el hallazgo UX-DSH-001 (requiere forzar un error de red/servidor para confirmar visualmente el estado contradictorio).

## 3. Alcance auditado

Pantalla única: `app/protected/dashboard/page.tsx` (`/protected/dashboard`) y los componentes/hooks/endpoints que consume directamente:

- KPIs (`KpiHero` ×5), Riesgo operativo, Banda de alertas, Pendientes hoy
- Tablas "Sin cobertura hoy" / "Reemplazos activos hoy" (inline en `page.tsx`)
- Tabla "Personal no docente — hoy" (inline en `page.tsx`)
- Cards secundarias "Clases hoy" / "Suspendidas hoy"
- `RankingsBlock` (agentes con más licencias, artículos más usados, comisiones con más ausencias) + modal "Ver todos"
- `TimelineCoberturaChart` + `MapaCalorSemanal`
- `ProximosVencimientos`
- `AvisoPeriodoOperativo` (mencionado, no auditado de nuevo — ver nota abajo)
- Exportación de PDF (`handleExportarPDF` → `/api/reportes/dashboard`)

**Explícitamente fuera de alcance** (módulos propios, ya auditados o a auditar aparte): `/protected/dashboard/clases`, `/protected/dashboard/incidencias*`, `/protected/dashboard/periodos-operativos`, `/protected/dashboard/calendario`, `/protected/dashboard/comisiones`, `/protected/dashboard/reportes/*`, `/protected/dashboard/distribuciones*`. Se los menciona únicamente como destino de navegación para evaluar si el link "lleva a donde dice llevar".

**Nota sobre `AvisoPeriodoOperativo`:** se muestra en el Dashboard (`page.tsx:494`, `linkDestino` por defecto → `/protected/dashboard/periodos-operativos`). Es el mismo componente compartido auditado en `docs/auditoria-ux-periodos-calendario-2026-09-01.md` (UX-PER-001: el cierre automático de un período vencido es silencioso — el aviso solo es preventivo, antes del vencimiento). Como el Dashboard es la pantalla de aterrizaje principal, este es de hecho el punto de mayor visibilidad de ese hallazgo ya documentado — no se re-lista aquí como hallazgo nuevo.

## 4. Inventario de pantallas

| Pantalla | Ruta | Objetivo | Rol esperado | Acciones disponibles | Filtros | Navegación posterior |
|---|---|---|---|---|---|---|
| Dashboard principal | `/protected/dashboard` | Vista de lectura del estado operativo institucional del día + tendencia | Cualquier usuario autenticado (sin distinción de rol visible en código) | Exportar PDF, cambiar rango de días del timeline (7/14/30), cambiar rango de rankings (mes/6 meses/año/todo), navegar a otras pantallas desde KPIs/tablas/links | Rango de días (timeline), rango de rankings | `/clases`, `/incidencias` (con query `?hoy=1` / `?vence=X`), `/incidencias/nueva`, `/periodos-operativos`, `/calendario`, incidencia individual `/incidencias/{id}` |

No hay formularios, modales de confirmación ni acciones destructivas en este módulo — es 100% lectura y navegación, consistente con lo indicado en el alcance del pedido.

## 5. Matriz de acciones críticas

| Pantalla | Acción | API/UseCase | Resultado esperado |
|---|---|---|---|
| Dashboard | Carga inicial | `GET /api/dashboard/overview?dias=N` → `useDashboardOverview` | KPIs, tablas y alertas reflejan el estado real de hoy |
| Dashboard | Cambiar rango de timeline | mismo endpoint, param `dias` | Timeline/mapa de calor/continuidad recalculados sobre el nuevo rango |
| Dashboard | Click KPI/card/alerta | `router.push(path)` (client-side, sin API propia) | Navega a la pantalla y filtro correcto para esa métrica |
| Dashboard | Exportar PDF | `GET /api/reportes/dashboard` → `useDescargarPDF`-like inline hook | Descarga un PDF con el snapshot actual del Dashboard |
| Dashboard | Cambiar rango de Rankings | `GET /api/dashboard/rankings?rango=X` → `useRankings` | Top-5 de cada columna recalculado |
| Dashboard | "Ver todos" en Rankings | `GET /api/dashboard/rankings?rango=X&limite=100` (bajo demanda) → modal | Modal con el listado completo del rango activo |
| Dashboard | Timeline/mapa de calor por comisión | `GET /api/dashboard/cobertura-comisiones?dias=N&limite=3` → `useCoberturaPorComision` | Selector de comisiones con su propia serie superpuesta |

## 6. Hallazgos

### UX-DSH-001 — Cuando falla la carga del Dashboard, 4 widgets muestran "todo en orden" en vez del error
**Prioridad:** P0  **Tipo:** ERROR NO INFORMADO / ESTADO
**Fuente:** código (inferido)
**Pantalla:** `/protected/dashboard`
**Acción:** Carga inicial de `GET /api/dashboard/overview` falla (red caída, 401/403, 500, timeout)
**Resultado esperado:** Todos los bloques que dependen de esos datos deberían quedar en un estado explícito de "no se pudo cargar" (o al menos neutro/desconocido), no en un estado que afirma positivamente que no hay problemas.
**Resultado actual:** `useDashboardOverview` (`features/dashboard/hooks/useDashboardOverview.ts:62-73`), ante cualquier error, hace `setState({ kpis: null, sinCobertura: [], reemplazosActivos: [], ..., error: "No se pudo cargar el dashboard" })`. El banner de error sí se muestra (`page.tsx:482-491`), pero río abajo:
- `RiesgoOperativo` (`page.tsx:353-382`, alimentado por `calcularRiesgo(kpis)` en `page.tsx:55-72`): con `kpis=null`, `calcularRiesgo` devuelve `"ok"` en la primera línea (`if (!kpis) return "ok"`) → tarjeta verde "Riesgo operativo: Bajo — Operación estable".
- `BandaAlertas` (`page.tsx:150-181`): con `sinCobertura=[]`, `clasesHoy = toNum(kpis?.clasesHoy) ?? 0 = 0` → early return con "Sin clases programadas para hoy" (fondo gris neutro, no error).
- `BloquePendientes` (`page.tsx:83-147`): con `sinCobertura.length=0` y `vencenManana=0`, `items` queda vacío → "Sin pendientes ✓" en verde.
- KPI "Reemplazos activos" (`page.tsx:535-540`) y KPI "Clases sin cobertura" (`page.tsx:541-547`): a diferencia de los otros 3 KPIs (que caen a `VALOR_VACIO = "—"` porque dependen solo de `toNum(kpis?.x)`), estos dos tienen un *fallback* a `String(reemplazosActivos.length)` / `String(sinCobertura.length)` — ambos arrays vacíos en error → muestran **"0"**, y "Clases sin cobertura" además pinta ese "0" en **verde** (`colorValor={sinCobertura.length > 0 ? "#dc2626" : "#16a34a"}`).
**Impacto para el usuario:** En la pantalla que un usuario mira primero para saber "¿está todo bien hoy?", un fallo de carga se ve visualmente casi idéntico a un día sin problemas: riesgo bajo, sin alertas, sin pendientes, 0 reemplazos, 0 sin cobertura en verde. El único indicio de que algo falló es un cartel de texto rojo pequeño arriba (`role="alert"`, sin ícono ni énfasis visual fuerte) que compite con cuatro bloques grandes y coloridos diciendo lo contrario. Un usuario apurado (el caso de uso principal de esta pantalla, según el propio pedido de auditoría) puede perfectamente no leer el cartel y asumir que no hay incidentes.
**Recomendación:** (no implementar) que `kpis === null && error` fuerce un estado visual distinto de "sin problemas" en `RiesgoOperativo`, `BandaAlertas`, `BloquePendientes` y en los 2 KPIs con fallback a longitud de array (mostrar "—" igual que los otros 3, no `0`/verde).

### UX-DSH-002 — Fallo al exportar el PDF del Dashboard es completamente silencioso
**Prioridad:** P1  **Tipo:** ERROR NO INFORMADO
**Fuente:** código (inferido)
**Pantalla:** `/protected/dashboard`
**Acción:** Click en "Exportar PDF" cuando `GET /api/reportes/dashboard` responde con error (404 institución no encontrada, 500 al construir el PDF, etc. — ver `app/api/reportes/dashboard/route.ts:16-26`)
**Resultado esperado:** El usuario debería enterarse de que la descarga no se generó y por qué (al menos un mensaje genérico).
**Resultado actual:** `handleExportarPDF` (`page.tsx:413-431`): `catch (err) { console.error("Error exportando PDF:", err) } finally { setExportando(false) }`. No hay `setState` de error, ni toast, ni cambio visual más allá de que el botón vuelve de "Generando…" a "Exportar PDF" tal cual estaba antes de hacer click.
**Impacto para el usuario:** El usuario hace click, ve el spinner de "Generando…", y luego el botón vuelve a la normalidad sin descarga ni explicación. La única señal de que algo salió mal es la ausencia de un archivo descargado — indistinguible de un usuario que simplemente no miró la carpeta de descargas. Nada le indica si debe reintentar, si es un problema transitorio, o a quién avisar.
**Recomendación:** (no implementar) capturar el error y mostrar un mensaje visible (mismo patrón que el banner de error del overview) en vez de solo loguearlo a consola.

### UX-DSH-003 — 4 métricas distintas del Dashboard navegan al mismo destino sin filtro, sin distinguir cuál subconjunto se quiso ver
**Prioridad:** P2  **Tipo:** NAVEGACIÓN
**Fuente:** código (inferido)
**Pantalla:** `/protected/dashboard`
**Acción:** Click en KPI "Cobertura institucional hoy" (`page.tsx:528`), KPI "Reemplazos activos" (`page.tsx:539`), KPI "Clases sin cobertura" (`page.tsx:546`), o card secundaria "Suspendidas hoy" (`cardsSecundarias`, `page.tsx:399-401`)
**Resultado esperado:** El pedido de auditoría pide explícitamente que "los links de navegación lleven al contexto correcto (mismo filtro/fecha que el KPI mostraba)".
**Resultado actual:** Los 4 destinos son literalmente el mismo `router.push("/protected/dashboard/clases")`, sin ningún query param que distinga "quiero ver las sin cobertura" de "quiero ver las suspendidas" de "quiero ver el % de cobertura general". `/clases` (fuera de alcance de este módulo, pero confirmado por lectura de `app/protected/dashboard/clases/page.tsx`) sí muestra todas las clases de hoy con badge de color y una leyenda (`LEYENDA`, líneas 78-84) que permite identificar visualmente cada estado, pero no aplica ningún filtro ni scroll automático al subconjunto relevante — el usuario debe escanear la tabla manualmente.
**Impacto para el usuario:** Fricción moderada con workaround claro (la leyenda de colores permite ubicar el estado buscado), pero no cumple el criterio "mismo filtro que el KPI mostraba" pedido explícitamente para esta auditoría. Es un patrón distinto al usado en el resto del Dashboard: los links de "Próximos vencimientos" y de "Incidencias activas" sí pasan un filtro específico (`?vence=X`, `?hoy=1`) a su destino — la inconsistencia es notoria dentro del mismo módulo.
**Recomendación:** (no implementar) si `/clases` soporta filtro por estado en el futuro, pasar un query param equivalente desde cada uno de los 4 orígenes.

### UX-DSH-004 — La alerta "ausencias sin suplente asignado" es lógica muerta desde la redefinición de "Sin cobertura" (13/08)
**Prioridad:** P2  **Tipo:** CONSISTENCIA / VALIDACIÓN DE NEGOCIO
**Fuente:** código (inferido)
**Pantalla:** `/protected/dashboard` — bloque "Banda de alertas"
**Acción:** N/A — evaluación de una rama de código que en la práctica nunca se ejecuta
**Resultado esperado:** Cada alerta de `BandaAlertas` debería poder dispararse con datos reales.
**Resultado actual:** `page.tsx:190`: `const sinSuplente = sinCobertura.filter((c: any) => !c.incidenciaId).length`. Esto ya estaba señalado como una particularidad a revisar en `docs/fase1-fase2-inventario-metricas-dashboard.md:17` ("sinSuplente se calcula en el frontend filtrando sinCobertura por !incidenciaId"), escrito **antes** de la redefinición de "Sin cobertura" del 13/08 (commit `e1a8427`). Con la definición vigente, `mapearCoberturaHoy` (`lib/reporting/datasets/obtenerClasesOperativas.ts:212-223`) solo clasifica como `SIN_COBERTURA` a clases `SUSPENDIDA` con `causa === "INCIDENCIA"`, y ese estado es alcanzable únicamente a través de `resolverClasesIncidencia` (que siempre asocia una incidencia antes de suspender — confirmado en `docs/punto-de-partida-clase-programada-2026-08-12.md:70`). Es decir, en el flujo normal del sistema **todo elemento de `sinCobertura` tiene `incidenciaId` no nulo**, por lo que `sinSuplente` es siempre `0` y la alerta "X ausencias sin suplente asignado" (`page.tsx:194-195`) nunca se muestra en la práctica.
**Impacto para el usuario:** Bajo impacto directo (la alerta simplemente no aparece, no hay dato falso mostrado), pero es una alerta “muerta” que da una falsa sensación de cobertura de casos (parece que el sistema distingue "sin cobertura, con incidencia" de "sin cobertura, sin ni siquiera incidencia", pero no puede pasar). Riesgo latente si en el futuro se relaja la restricción de que suspender siempre requiera incidencia. Además, si alguna vez se disparara, su destino (`/protected/dashboard/incidencias/nueva`, confirmado sin soporte de preselección de clase/agente vía query params — no hay `searchParams` en `app/protected/dashboard/incidencias/nueva/page.tsx`) abriría un formulario en blanco sin contexto de qué cubrir.
**Recomendación:** (no implementar) eliminar esta rama muerta o documentar explícitamente por qué se mantiene como salvaguarda, y si se reactiva, decidir un destino con contexto (no un formulario en blanco).

### UX-DSH-005 — El error de `useCoberturaPorComision` (Timeline/Mapa de calor por comisión) nunca llega a la UI
**Prioridad:** P2  **Tipo:** ERROR NO INFORMADO
**Fuente:** código (inferido)
**Pantalla:** `/protected/dashboard` — Timeline de cobertura y Mapa de calor semanal
**Acción:** Falla `GET /api/dashboard/cobertura-comisiones`
**Resultado esperado:** Algún indicio de que los datos de comisiones no cargaron.
**Resultado actual:** `useCoberturaPorComision` (`features/dashboard/hooks/useCoberturaPorComision.ts:11,29,46-47`) expone un `error: string | null` propio. `page.tsx:404-407` lo consume así: `const { data: comisionesData, loading: comisionesLoading } = useCoberturaPorComision(dias)` — **el campo `error` ni siquiera se destructura**. Si el fetch falla, `data` queda en `[]` (su valor inicial) y `loading` en `false`; `TimelineCoberturaChart` y `MapaCalorSemanal` reciben `comisionesDisponibles=[]`, indistinguible de "esta institución no tiene comisiones con suficientes datos".
**Impacto para el usuario:** El selector de comparación por comisión simplemente no aparece, sin ningún mensaje. No es tan grave como UX-DSH-001 porque no afirma nada positivo falso, pero sigue siendo una falla silenciosa en un componente cuyo propio hook ya calcula el mensaje de error correcto y simplemente se descarta.
**Recomendación:** (no implementar) propagar `error` de `useCoberturaPorComision` a algún indicador visible, aunque sea menor (ej. dentro del propio gráfico).

### UX-DSH-006 — Mensaje de error genérico no distingue causa (permisos vs. servidor) ni entre servicios del mismo módulo
**Prioridad:** P3  **Tipo:** MENSAJE / CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** `/protected/dashboard`
**Acción:** Falla cualquier fetch del Dashboard
**Resultado esperado:** Mensajes de error consistentes entre los distintos hooks del mismo feature, e idealmente informativos sobre la causa.
**Resultado actual:** `features/dashboard/services/dashboardService.ts:9-11` descarta cualquier cuerpo de respuesta y siempre lanza `new Error("Error al obtener dashboard overview")`, sin distinguir 401/403/500 — texto final al usuario siempre `"No se pudo cargar el dashboard"` (fijado en `useDashboardOverview.ts:71`). En cambio `features/dashboard/services/rankingsService.ts:12-14` sí intenta leer `body.error` del backend antes de usar un genérico. Dos servicios hermanos del mismo módulo con dos criterios distintos de manejo de error.
**Impacto para el usuario:** Menor — el mensaje es siempre el mismo sin importar si el problema es de permisos, de red o del servidor, lo que no ayuda a decidir si reintentar o pedir acceso. Fricción baja, con el "reload de página" como workaround universal.
**Recomendación:** (no implementar) unificar el criterio de extracción de mensaje de error entre `dashboardService.ts` y `rankingsService.ts`.

### UX-DSH-007 — Tres patrones visuales distintos de "cargando" dentro de la misma pantalla
**Prioridad:** P3  **Tipo:** CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** `/protected/dashboard`
**Acción:** Estado de carga inicial
**Resultado esperado:** Un criterio consistente de loading state dentro del mismo módulo (pedido explícito de la auditoría: "mismo patrón... entre las pantallas de este módulo").
**Resultado actual:** Conviven 3 patrones en la misma carga de página: (1) KPIs muestran un simple `"…"` (`KpiHero`, `page.tsx:331`); (2) tablas ("Sin cobertura hoy", "Reemplazos activos hoy") y "Pendientes hoy" muestran el texto literal `"Cargando..."` (`page.tsx:586,643,126`); (3) `RankingsBlock` y `ProximosVencimientos` usan skeletons grises animados (`RankingsBlock.tsx:104-117`, `ProximosVencimientos.tsx:57-68`).
**Impacto para el usuario:** Bajo — es un detalle de pulido, no bloquea ninguna tarea, pero contribuye a que la pantalla se sienta como un collage de piezas construidas en momentos distintos en vez de un solo sistema coherente.
**Recomendación:** (no implementar) converger a un único patrón de loading (idealmente skeleton, ya usado en 2 de los 5 bloques).

## 7. Puntos de la ronda de agosto verificados como resueltos (no re-reportados)

Confirmado contra el código actual (commit auditado), todos siguen corregidos:

- **Materia y Comisión visibles** en "Sin cobertura hoy" y "Reemplazos activos hoy": columnas presentes en ambas tablas (`page.tsx:597,604-605,654,661-662`).
- **Link a la incidencia clickeable** desde ambas tablas: botones "Asignar →" / "Ver →" que navegan a `/protected/dashboard/incidencias/{id}` (`page.tsx:607-619,665-677`).
- **Filtro de fecha correcto en "próximos vencimientos"**: los 4 links de `ProximosVencimientos` (`vence=7dias/hoy/manana/resto-semana`) tienen soporte real y completo en `app/protected/dashboard/incidencias/page.tsx:8-10,42` vía `VenceFiltro`.
- **404 del KPI "Cobertura institucional hoy"**: ya no apunta a `/protected/dashboard/reportes` (ruta inexistente) — apunta a `/protected/dashboard/clases` (`page.tsx:528`), igual que "Reemplazos activos" y "Clases sin cobertura".
- **Color rojo/verde de "Suspendidas hoy"**: la card secundaria "Suspendidas hoy" en el Dashboard principal no tiene semáforo — usa el mismo color neutro que "Clases hoy" (`cardsSecundarias`, sin `colorValor` condicional en su render, `page.tsx:745-775`). Consistente con la decisión documentada del 13/08 de que "Suspendidas" ya no es una métrica de alerta (solo causas administrativas tras la redefinición de "Sin cobertura").

## 8. Áreas auditadas sin problemas relevantes

- Definición y cálculo de "Sin cobertura" / cobertura de aula (`calcularCobertura`, `filtrarFrenteACurso`): sin cambios desde la validación de agosto, lógica revisada y consistente con lo documentado.
- Modal "Ver todos" de Rankings: carga bajo demanda, botón deshabilitado mientras carga (`cargandoModal`), sin riesgo de doble-envío, cierre por click fuera o ✕.
- Selector de rango de Rankings (mes/6 meses/año/todo) y de días del timeline (7/14/30): cambian estado y refetchean correctamente, sin acciones destructivas.
- KPI "Incidencias activas" → `/incidencias?hoy=1`: filtro soportado extremo a extremo, comportamiento intencionalmente distinto del listado general de `/incidencias` (decisión documentada explícitamente el 12/08, no es un bug).
- Tabla "Personal no docente — hoy": patrón de botón Asignar/Ver consistente con las otras dos tablas; no se encontraron problemas funcionales en su lógica de agregación (`mapearPersonalNoDocenteHoy`), aunque ver nota en sección 9 sobre falta de validación UX dedicada por ser feature nueva.
- El propio manejo de "sin datos" (0 clases hoy, 0 pendientes, sin comisiones en rankings) está bien diferenciado del estado de carga cuando la petición efectivamente tiene éxito — el problema (UX-DSH-001) es específicamente la confusión entre "éxito con datos vacíos" y "fallo de carga".

## 9. Áreas que no pudieron verificarse

- **Ninguna prueba en vivo**: no se confirmó visualmente ningún hallazgo en un navegador real ni contra datos reales del tenant de prueba (Escuela Primaria N°12). Todo el análisis es por lectura de código. En particular, UX-DSH-001 requeriría forzar artificialmente un fallo de red/servidor para verificar el comportamiento exacto en pantalla.
- **Verificación de roles/permisos**: no se encontró en el código del Dashboard ninguna lógica de visibilidad condicionada por rol (a diferencia de otros módulos auditados que sí la tienen). RIESGO / NO CONFIRMADO: no se pudo determinar si esto es intencional (Dashboard visible para todos los roles autenticados) o un vacío de permisos, porque `withContext` (capa de autenticación) está fuera del alcance de este módulo.
- **`Personal no docente — hoy`** (commit `98b7ac5`, posterior al cierre de la auditoría de agosto) y la **exclusión de cargos no-frente-a-curso** (commit `df04c39`) son features agregadas después de la última ronda de validación de datos del Dashboard y no pasaron por una comparación DB vs. API vs. UI dedicada (el método usado en Fases 4/5 de agosto). No se encontraron bugs evidentes por lectura de código, pero no está confirmado con datos reales.
- **Comportamiento del PDF exportado** (contenido, formato, sincronía con lo que se ve en pantalla): fuera de alcance de esta auditoría UX de pantalla, solo se evaluó el ciclo de feedback del botón de descarga.

## 10. Lista priorizada de correcciones (sin implementar)

1. **UX-DSH-001** (P0) — hacer que un fallo de carga del overview no se disfrace de "todo en orden" en Riesgo operativo, Banda de alertas, Pendientes hoy y los 2 KPIs con fallback a longitud de array.
2. **UX-DSH-002** (P1) — informar al usuario cuando falla la exportación del PDF.
3. **UX-DSH-003** (P2) — decidir si vale la pena diferenciar el destino de los 4 links que hoy van todos a `/clases` sin filtro.
4. **UX-DSH-005** (P2) — exponer el error de `useCoberturaPorComision` en algún punto de la UI.
5. **UX-DSH-004** (P2) — limpiar o documentar la alerta "sin suplente asignado" que nunca se dispara.
6. **UX-DSH-006** (P3) — unificar manejo de error entre `dashboardService.ts` y `rankingsService.ts`.
7. **UX-DSH-007** (P3) — converger los 3 patrones de loading a uno solo.
8. Pendiente administrativo, no bloqueante: programar una revalidación de datos (método Fase 4/5 de agosto) para "Personal no docente — hoy" y la exclusión de cargos no-frente-a-curso, ya que se agregaron después del cierre de esa auditoría y nunca se compararon DB vs. API vs. UI.
