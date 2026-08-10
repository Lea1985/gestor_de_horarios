# Punto de partida — Cierre 08-08-2026

Continuación directa de `punto-de-partida-clase-programada-2026-08-06-cierre.md`. Esa sesión cerró con la tarea #23 (titular más reciente vs. vigente en la fecha) recién descubierta y sin cerrar, con un alcance de 30+ ocurrencias sin acotar. Hoy se terminó de cerrar esa tarea por completo, y se armó la infraestructura para arrancar el plan de validación del Dashboard (#10) sin adivinar.

---

## Hilo 1 — Cierre total del sweep de "titular más reciente" (tarea #26, cerrada)

Instrucción explícita del usuario al arrancar el día: **"los vamos a revisar todos, para quedarnos tranquilos"** — no dar por cerrado nada sin revisar cada archivo sospechoso del grep original de 30+ ocurrencias, uno por uno.

**Revisados y confirmados como bugs reales, pero sin consumidor frontend hoy (documentados, no tocados):**

- `lib/repositories/claseProgramadaRepository.ts` (tarea #28) — `claseIncludeFull`/`claseIncludeList` (usados por `obtenerPorId`/`listar`) tienen el mismo patrón. Trazado hasta el frontend: el único consumidor real (`app/protected/dashboard/clases/page.tsx`) solo pide `?hoy=true` y ni siquiera tipa el campo titular. `obtenerPorId` no tiene consumidor de detalle en absoluto (confirmado con grep amplio, no solo el patrón de template literal). `claseIncludeConReemplazos`, que sí se usa activamente (tabla "Clases afectadas" de incidencias), no tiene el bug — no incluye `titularidades`.
- `lib/repositories/reemplazoRepository.ts` (tarea #29) — mismo patrón en `reemplazoIncludeFull`/`reemplazoIncludeList`. Trazado hasta el frontend: los únicos consumidores de `/api/reemplazos` (`useNuevaIncidencia.ts`, `incidenciasService.ts`) solo hacen POST (crear) y DELETE (eliminar), nunca GET — no hay pantalla que liste o muestre detalle de un Reemplazo.

Mismo caso que `horarioRepository.ts` (tarea #27, documentada el 06/08): bug real, código alcanzable por API pero no por ninguna pantalla real, así que no se puede verificar con datos reales y no se fuerza el fix.

**Revisados y confirmados limpios (sin bug — "estado actual" sin fecha de referencia histórica, donde tomar el titular más reciente es correcto por diseño):**

- `lib/pdf/datasets/profesores.ts` (plural)
- `lib/repositories/asignacionRepository.ts`
- `lib/usecases/asignaciones/crearAsignacion.ts` (recién crea la asignación, hay un único registro de titularidad en ese momento)
- `lib/pdf/datasets/horarios.ts` — reporte de horario vigente hoy, sin parámetro de fecha
- `lib/pdf/datasets/asignaciones.ts` — reporte de asignaciones actuales, sin parámetro de fecha
- `features/incidencias/components/PasoRevision.tsx` y `PasoSeleccion.tsx` — wizard de incidencia nueva, siempre sobre el titular actual
- `features/incidencias/hooks/useNuevaIncidencia.ts` — mismo contexto que el wizard
- `features/distribuciones/types/index.ts` y `DistribucionRow.tsx` — el titular se muestra como etiqueta identificadora de la asignación, no como dato histórico de una versión puntual
- `features/asignaciones/types/index.ts` (helper `titularVigente()`) y `useAsignacionDetalle.ts` — ficha de edición/detalle de asignación, siempre estado actual
- `app/protected/dashboard/distribuciones/[id]/page.tsx` — mismo caso que `DistribucionRow`

**Resultado:** no queda ningún archivo del sweep original sin revisar. Tarea #23 y #26 cerradas de verdad, con verificación explícita en vez de asunción — corrigiendo el error de la sesión anterior, donde se había dado por cerrado el sweep habiendo revisado solo 4 de los archivos de mayor riesgo.

---

## Hilo 2 — Decisión sobre #27/#28/#29 de cara al Dashboard

El usuario planteó si, al revisar el Dashboard e introducir mejoras de información, esas tres tareas (código con el bug real pero sin consumidor hoy) deberían quedar resueltas en ese momento.

**Análisis:** el plan de validación documentado (`plan-validacion-dashboard-2026-07-29.md`) es explícitamente de solo lectura — la Fase 1 audita "todo lo que hoy muestra `dashboard/page.tsx`", y la regla 1 prohíbe agregar funcionalidad nueva. Bajo ese alcance, #27/#28/#29 no se tocan porque ninguno de los tres es consumido hoy por el Dashboard.

**Decisión:** no arreglar de forma especulativa (rompería la regla de la semana de "no fixear sin poder verificar en vivo"). Se anotó en las tres tareas que deben revisarse de nuevo si en el futuro se define una fase de "mejoras de información" del Dashboard que agregue pantallas de horario semanal, detalle/listado de clases, o listado/detalle de reemplazos — recién ahí esos repos pasarían a ser alcanzables y el fix debería aplicarse como parte de esa implementación, con verificación real.

---

## Hilo 3 — Infraestructura para auditar el Dashboard sin adivinar

Antes de arrancar la Fase 1 del plan de validación (#10), el usuario pidió no ir "adivinando" y preparar una auditoría delegada a Claude Code (consola), con acceso directo al filesystem.

**Graphify actualizado:** existía una carpeta `graphify-out/` con un grafo de dependencias del repo, desactualizado (construido sobre el commit `8957d288`, más de 60 commits detrás de `HEAD` — quedaban afuera todos los fixes de esta semana, incluida toda la tanda de "titular vigente en la fecha"). Se corrió `graphify update .`: quedó reconstruido en 2425 nodos, 4348 edges, sobre el HEAD actual (`98b7b4e`), con backup del grafo anterior en `graphify-out/2026-08-08/`.

**CLAUDE.md revisado:** el proyecto ya tiene un archivo de gobernanza (reglas de oro de mínima intervención, no ampliar alcance, áreas protegidas — `schema.prisma` y multi-tenant requieren autorización explícita —, niveles de aprobación por tamaño de cambio, y el uso documentado de Graphify vía `graphify query`/`graphify explain`/`graphify path`). Se ajustó el prompt de auditoría para usar esa convención en vez de una genérica.

**Aclaración importante entregada al usuario:** las instrucciones de "solo lectura" dentro de un prompt son texto, no una restricción técnica — Claude Code podría igual escribir archivos si algo sale mal. La garantía real es correr la sesión con `claude --permission-mode plan` (o `--allowedTools "Read,Glob,Grep"`), que bloquea Edit/Write/Bash mutante a nivel de permisos, no de instrucción.

**Prompt de auditoría armado** (Fase 1 + Fase 2 del plan de validación, más chequeo explícito del patrón "titular más reciente" y de los otros 3 patrones de bug ya conocidos de la semana: timezone sin UTC, `activo:true` ocultando historial, fuga multi-tenant). Pide como salida un único markdown con: tabla completa de métrica → componente → hook → endpoint → usecase → repository/query → tabla de origen, la query real detrás de cada una, y una sección de "Hallazgos" separada, sin corregir nada.

---

## Hallazgos técnicos del día (detalle completo, para no perder nada)

**Bugs reales confirmados, código sin consumidor frontend — no corregidos, documentados:**

- `lib/repositories/claseProgramadaRepository.ts` → `claseIncludeFull` (usado por `obtenerPorId`) y `claseIncludeList` (usado por `listar`): ambos tienen `titularidades: { where: { activo: true, fecha_hasta: null }, take: 1 }` en el include de `asignacion`. Debería ser vigente en `clase.fecha`, no el más reciente. Fix pendiente cuando haya consumidor real: sacar el `where`/`take:1`, agregar `fecha_desde`/`fecha_hasta` al select, post-procesar con un `titularVigenteEn(titularidades, clase.fecha)` como el ya usado en `ausencias.ts`/`profesor.ts`.
  - `listar()` sí tiene consumidor (`app/protected/dashboard/clases/page.tsx`) pero esa pantalla solo pide `?hoy=true` y no tipa/muestra el campo titular — impacto cero hoy.
  - `obtenerPorId()` no tiene ningún consumidor frontend — confirmado con `grep -rn "api/clases" app/ features/ --include="*.tsx" --include="*.ts" | grep -v "app/api/clases"`, único resultado fue el mismo `?hoy=true`.
  - `claseIncludeConReemplazos` (usado por `listarPorIncidencia`, consumidor real: tabla "Clases afectadas" de incidencias) NO tiene el bug — no incluye `titularidades` en absoluto.
- `lib/repositories/reemplazoRepository.ts` → `reemplazoIncludeFull` (usado por `obtenerPorId`) y `reemplazoIncludeList` (usado por `listar`): mismo patrón en `asignacionTitular.titularidades`. Debería ser vigente en `clase.fecha` del reemplazo. Fix pendiente con el mismo patrón `titularVigenteEn`.
  - Consumidores frontend de `/api/reemplazos` confirmados: `features/incidencias/hooks/useNuevaIncidencia.ts` y `features/incidencias/services/incidenciasService.ts` — ambos solo hacen POST (crear) y DELETE (eliminar), nunca GET. No hay pantalla de listado/detalle de Reemplazo.
- `lib/repositories/horarioRepository.ts` (documentado el 06/08, tarea #27, sigue igual hoy): mismo patrón, sin consumidor frontend (`listarSemana`/`listarSemanaInstitucion` → `/api/horario` y `/api/horario/institucion` → ninguna página los llama).

**Archivos revisados hoy y confirmados SIN bug** (con la razón puntual de por qué el patrón "más reciente" es correcto en cada uno):

- `lib/pdf/datasets/profesores.ts` — reporte de plantilla actual, sin fecha de referencia.
- `lib/repositories/asignacionRepository.ts` — CRUD de estado actual de asignación.
- `lib/usecases/asignaciones/crearAsignacion.ts` — al crear, solo existe un registro de titularidad (el recién insertado); el `take:1` trae ese único registro por construcción, no hay ambigüedad temporal posible.
- `lib/pdf/datasets/horarios.ts` — reporte de horario de una comisión, sin parámetro de fecha en la función; el "a cargo ahora" usa `hoy`/`mañana` explícitos.
- `lib/pdf/datasets/asignaciones.ts` — reporte de asignaciones actuales, sin parámetro de fecha; el filtro por `agenteId` también es correcto en `activo:true` porque busca "quién es titular hoy".
- `features/incidencias/components/PasoRevision.tsx` y `PasoSeleccion.tsx` — pasos 1 y 3 del wizard de incidencia nueva: siempre titular actual de la asignación, la incidencia se crea ahora.
- `features/incidencias/hooks/useNuevaIncidencia.ts` — `nombreAgente()` y el filtro de `asignacionesFiltradas` usan `titularidades[0]` sobre el mismo dataset del wizard (estado actual).
- `features/distribuciones/types/index.ts` y `DistribucionRow.tsx` — el titular aparece como etiqueta identificadora de la asignación en el acordeón de distribuciones, no como dato de una versión histórica puntual.
- `features/asignaciones/types/index.ts` (helper `titularVigente()`) y `useAsignacionDetalle.ts` — ficha de edición/detalle de una asignación: siempre estado actual, incluye el pre-fill del formulario de cambio de titular.
- `app/protected/dashboard/distribuciones/[id]/page.tsx` — mismo caso que `DistribucionRow`, etiqueta identificadora en el header de edición de una versión.

**Hallazgos de infraestructura/herramientas (no son bugs de negocio, pero afectan el trabajo de mañana):**

- El grafo de `graphify-out/` estaba construido sobre el commit `8957d288`, **60+ commits detrás** de `HEAD` (`98b7b4e`) — quedaban afuera todos los commits de esta semana, incluida toda la tanda de fixes de titular vigente en la fecha (`755abd7`, `c66feae`, `b3d3098`, `d6476e7`, `98b7b4e`) y el fix de cadenas de incidencias (`570b9d7`). Se corrió `graphify update .`: quedó en 2425 nodos / 4348 edges sobre el HEAD actual, con backup del grafo viejo en `graphify-out/2026-08-08/`. Dos warnings menores sin impacto (2 archivos sin nodos, `.sql` sin parser instalado — no hay archivos `.sql` relevantes al Dashboard).
- El repo ya tiene un `CLAUDE.md` de gobernanza con reglas de mínima intervención, áreas protegidas (`schema.prisma`, multi-tenant requieren autorización explícita), niveles de aprobación por tamaño de cambio, y convención documentada de Graphify (`graphify query`/`graphify explain`/`graphify path`, `graphify-out/wiki/index.md`, `GRAPH_REPORT.md`). Se usó esa convención para ajustar el prompt de auditoría del Dashboard en vez de una genérica.
- Aclaración entregada al usuario: instrucciones de "solo lectura" dentro de un prompt de texto NO son una restricción técnica real — Claude Code podría igual escribir archivos. La garantía real es `claude --permission-mode plan` (o `--allowedTools "Read,Glob,Grep"`), que bloquea Edit/Write/Bash mutante a nivel de permisos del CLI, no de instrucción.

---

## Estado al cierre del 08/08

**⏳ EN CURSO — no cerrado en esta sesión.** El usuario está por correr, en otra terminal, la sesión de Claude Code consola:

```bash
claude --permission-mode plan
```

con el prompt de auditoría del Dashboard ya armado (Fase 1 — inventario de métricas, y Fase 2 — fuente de verdad por métrica, del plan de validación de julio). El resultado de esa corrida **todavía no fue revisado** al momento de cerrar esta sesión.

| # | Tarea | Estado |
|---|---|---|
| 23 | Titular más reciente vs. vigente en la fecha (hallazgo del 06/08) | ✅ cerrada de verdad hoy |
| 26 | Revisar sistemáticamente los ~15 archivos restantes del sweep | ✅ cerrada hoy — cobertura completa, sin asumir nada |
| 27 | horarioRepository.ts — sin consumidor real | ⏳ documentada, baja prioridad, revisar si el Dashboard agrega vista de horario semanal |
| 28 | claseProgramadaRepository.ts — sin consumidor real | ⏳ documentada, baja prioridad, revisar si el Dashboard agrega vista de detalle/listado de clases |
| 29 | reemplazoRepository.ts — sin consumidor real | ⏳ documentada, baja prioridad, revisar si el Dashboard agrega vista de listado/detalle de reemplazos |
| 24 | Banner de incidencia debería mostrar la cadena completa, no solo el último salto | ⏳ pendiente, mejora documentada, no bloqueante |
| 10 | Plan de validación del Dashboard | 🔄 **EN CURSO** — auditoría previa (Claude Code consola) corriendo, resultado pendiente de revisión |
| 11 | Seed real de Codigario + Colegio Ceferino | ⏳ pendiente, al final de la cola |

## Para la próxima sesión, en orden

1. **Primero:** revisar el resultado de la auditoría de Claude Code consola sobre el Dashboard (archivo markdown con inventario de métricas + fuente de verdad + hallazgos). Si encontró algo del patrón "titular más reciente" u otro de los 4 patrones conocidos, tratarlo con el mismo rigor de toda la semana (no corregir a ciegas, verificar con datos reales antes de dar por cerrado).
2. Con esa auditoría como base, decidir si la Fase 1-2 del plan de validación ya quedó cubierta o si falta algo, y seguir con las Fases 3-5 (Entrega A) del plan (`plan-validacion-dashboard-2026-07-29.md`).
3. Recién después, Entrega B (Fases 6-8) si la Entrega A justifica abrirla.
4. Al final de la cola, sin apuro: tarea #11 (seed real de Codigario + Colegio Ceferino).

Auditoria DASH

  Punto de entrada: app/protected/dashboard/page.tsx

  Tareas:
  1. Lee app/protected/dashboard/page.tsx completo. Lista TODOS los componentes hijos que importa y renderiza(tarjetas/cards, gráficos, rankings, cobertura, incidencias, reemplazos, etc.).
  2. Para cada componente hijo importado, encuentra su archivo real (ruta completa) y ábrelo. Si ese componente a su vezimporta otros subcomponentes de presentación/gráfico, sigue la cadena hasta encontrar los componentes "hoja" que realmente muestran datos (números, listas, gráficos).
  3. Para cada componente hoja o intermedio que consume datos, identifica:
     - Qué hook(s) de datos usa (useQuery, custom hooks, fetch directo, etc.) — nombre exacto y de qué archivo se importa.
     - Qué métrica(s) específica(s) muestra ese componente (ej: "total de clases dictadas este mes", "% de asistencia", "ranking de profesores con más ausencias", etc.) — sé exhaustivo, no te saltees ninguna métrica visible.
  4. No sigas todavía hasta Prisma — esa parte la hará otro agente. Enfócate en construir el árbol completo: page.tsx → componente → subcomponente → hook de datos → métrica mostrada.

  Devuelve un listado estructurado (puede ser texto plano, no hace falta markdown perfecto) con:
  - Ruta de archivo de cada componente
  - Qué métricas/datos muestra cada uno
  - Qué hook(s) usa cada uno y de dónde se importa

  Sé exhaustivo — es una auditoría completa, no busques solo lo obvio. Revisa también si hay filtros de fecha/periodo global en el dashboard (selector de mes, año, sede, etc.) que afecten a las queries, y documenta cómo se propaga esefiltro a los hooks.

  Searched for 4 patterns, read 14 files, listed 2 directories, ran 2 shell commands

I now have a complete map of the Dashboard tree, entirely from page.tsx down to the leaf data-consuming components and their hooks. No sede/año/mes global selector exists beyond what's documented below — I verified this by reading everycomponent in the render tree.

Árbol completo: page.tsx → componentes → hooks → métricas

Punto de entrada

/home/lea/gestor_clean/app/protected/dashboard/page.tsx ("use client")

Importa y usa 3 hooks de datos propios y renderiza 4 componentes de features/dashboard + 1 de app/ui, además de subcomponentes locales inline (BandaAlertas, BloquePendientes, KpiHero, RiesgoOperativo).

---
Hooks de datos usados directamente en page.tsx

1. useDashboardOverview(diasInicial=14)
Archivo: /home/lea/gestor_clean/features/dashboard/hooks/useDashboardOverview.ts
- Internamente usa useAuth() de /home/lea/gestor_clean/app/hooks/useAuth.ts (token/authHeaders desde sessionStorage).
- Llama a getDashboardOverview(authHeaders, dias) de/home/lea/gestor_clean/features/dashboard/services/dashboardService.ts, que hace fetch("/api/dashboard/overview?dias=" + dias).
- Ruta API: /home/lea/gestor_clean/app/api/dashboard/overview/route.ts (no explorada, es la capa Prisma — fuera de alcance).
- Expone: kpis, sinCobertura, reemplazosActivos, timeline, pendientes, loading, error, dias, setDias, refresh.
- Este hook es el "motor" del filtro de período: dias (7 | 14 | 30, tipo RangoDias) es state local de este hook,controlado por el segmented control dentro de TimelineCoberturaChart, y se propaga hacia useCoberturaPorComision(dias) también invocado en page.tsx. Es el único filtro global real del dashboard (no hay selector de sede/año/mes a nivelpágina).

2. useCoberturaPorComision(dias, limite=3)
Archivo: /home/lea/gestor_clean/features/dashboard/hooks/useCoberturaPorComision.ts
- Recibe dias desde el state de useDashboardOverview (propagación del filtro de período).
- Fetch a /api/dashboard/cobertura-comisiones?dias=X&limite=3 (headers de useAuth).
- Tipo de retorno: CoberturaPorComision[] importado de /home/lea/gestor_clean/lib/reporting/datasets/obtenerCoberturaPorComision.ts (dataset con lógica no-Prisma expuesta comotipo; el cálculo real de cobertura por comisión, desvío estándar y tendencia vive ahí, fuera de alcance de esta auditoría).
- Este resultado (comisionesData, comisionesLoading) se pasa como props a TimelineCoberturaChart y MapaCalorSemanal — ninguno de los dos vuelve a llamar a un hook propio de datos, son puramente de presentación sobre props.

3. useAuth() — usado también directamente en page.tsx para authHeaders (exportar PDF viafetch("/api/reportes/dashboard")).

---
Componentes hijos importados en page.tsx

A. TimelineCoberturaChart

Archivo: /home/lea/gestor_clean/app/ui/components/dashboard/TimelineCoberturaChart.tsx
- Es un componente hoja de presentación (Recharts AreaChart). No tiene hook propio; recibe todo por props: data (timeline institucional de useDashboardOverview), dias/setDias (controla el filtro global de período — UI del segmented control7d/14d/30d que vive físicamente acá), comisionesDisponibles/comisionesLoading (de useCoberturaPorComision).
- Tiene un <select> interno propio (state local comisionIdSelect, no global) para elegir una comisión específica asuperponer en el gráfico.
- Métricas mostradas:
  - Promedio institucional de cobertura del período (Math.round(avg(coberturaPorcentaje)), %).
  - Serie temporal de % de cobertura institucional por día (área/línea).
  - Serie temporal de % de cobertura de la comisión seleccionada (superpuesta, línea punteada).
  - Tooltip por día: % institución, % de la comisión seleccionada, total de clases, cantidad de suspendidas, cantidad sincobertura.
  - Línea de referencia fija en 80%.

B. MapaCalorSemanal

Archivo: /home/lea/gestor_clean/features/dashboard/components/MapaCalorSemanal.tsx
- Componente hoja de presentación. No tiene hook propio; recibe timelineInstitucional (de useDashboardOverview) y comisiones/comisionesLoading (de useCoberturaPorComision).
- <select> interno propio (state local comisionId) para alternar entre vista institucional y por comisión, independiente del select de TimelineCoberturaChart.
- Métricas mostradas:
  - Heatmap semanal (lunes a sábado) de % de cobertura por día, coloreado por rangos (≥90%, 75-90%, 60-75%, 40-60%, <40%,sin datos).
  - Promedio del período mostrado (institucional o de la comisión seleccionada).
  - Tooltip por celda: % de cobertura del día y cantidad total de clases ese día.

C. ProximosVencimientos

Archivo: /home/lea/gestor_clean/features/dashboard/components/ProximosVencimientos.tsx
- Componente hoja puro (sin hook propio, sin fetch). Recibe pendientes (objeto PendientesDashboard que viene deuseDashboardOverview), loading, onNavigate.
- Métricas mostradas (cada una es un contador simple del objeto pendientes):
  - reemplazosVencenSemana — reemplazos que vencen esta semana.
  - vencenHoy — incidencias que vencen hoy.
  - vencenManana — incidencias que vencen mañana.
  - vencenEstaSemana — incidencias que vencen esta semana.

D. RankingsBlock

Archivo: /home/lea/gestor_clean/features/dashboard/components/RankingsBlock.tsx
- Tiene su propio hook de datos: useRankings(rangoInicial="anio")
Archivo: /home/lea/gestor_clean/features/dashboard/hooks/useRankings.ts
  - Internamente usa useAuth().
  - Llama a fetchRankings(rango, headers, limite=5) de/home/lea/gestor_clean/features/dashboard/services/rankingsService.ts, que hace fetch("/api/dashboard/rankings?rango=X&limite=5").
  - Ruta API: /home/lea/gestor_clean/app/api/dashboard/rankings/route.ts (no explorada — Prisma, fuera de alcance).
  - Filtro propio e independiente del filtro global dias: rango es un selector local ("mes" | "semestre" | "anio" |"todo"), con UI tipo segmented control dentro del propio RankingsBlock. Este filtro NO se sincroniza con el dias del resto del dashboard — es un período distinto y desacoplado.
- Subcomponentes internos: Columna, FilaRanking, Barra, Skeleton, ModalVerTodos (todos en el mismo archivo, no en archivos separados).
- Métricas mostradas (3 columnas, cada una top-5 con botón "Ver todos" que abre modal con la lista completa):
  a. Agentes con más licencias (data.agentesConMasLicencias) — ranking de agentes/profesores por cantidad delicencias/ausencias en el período.
  b. Artículos más usados (data.articulosMasUsados) — ranking de artículos (tipo de licencia/normativa) más utilizados.
  c. Comisiones con más ausencias (data.comisionesConMasAusencias) — ranking de comisiones con mayor cantidad de ausencias.
  - Cada fila muestra: posición, label (nombre), sub-etiqueta opcional, total (número), barra de progreso proporcional al máximo de la columna.

---
Subcomponentes locales de page.tsx (definidos en el mismo archivo, no importados)

Todos consumen únicamente los datos ya traídos por useDashboardOverview (pasados por props), sin hooks propios:

- BandaAlertas — banda de alertas operativas del día. Deriva de kpis/sinCobertura:
  - Clases sin cobertura hoy (crítica).
  - Ausencias sin suplente asignado (crítica) — clases de sinCobertura sin incidenciaId.
  - Clases suspendidas hoy > 2 (advertencia).
  - Incidencias activas acumuladas > 4 (advertencia).
  - Estado "sin alertas" / "sin clases programadas hoy".
- BloquePendientes — resumen corto de pendientes: clases sin cobertura hoy (cantidad) + incidencias que vencen mañana (pendientes.vencenManana).
- KpiHero (usado 5 veces, fila de KPIs principales) — cada instancia muestra:
  a. Cobertura institucional hoy (kpis.coberturaPorcentaje, %) con meta fija 95% y delta vs. ayer (kpis.deltaCobertura).
  b. Reemplazos activos (kpis.reemplazosActivos, fallback a reemplazosActivos.length).
  c. Clases sin cobertura (kpis.sinCoberturaHoy, fallback a sinCobertura.length).
  d. Incidencias activas (kpis.incidenciasActivas).
  e. Continuidad pedagógica (kpis.continuidadPedagogica, %).
- RiesgoOperativo — indicador calculado localmente en page.tsx vía función calcularRiesgo(kpis) (no viene del backend): combina clasesHoy, sinCoberturaHoy, incidenciasActivas, suspendidasHoy en un nivel "ok"/"medio"/"alto" con umbraleshardcodeados (sinCobertura>3 o suspendidas>5 o incidencias>10 → alto; etc).
- Tabla "Sin cobertura hoy" (inline en page.tsx) — lista sinCobertura[]: Unidad, Identificador, Titular, botón "Asignar"(si tiene incidenciaId).
- Tabla "Reemplazos activos hoy" (inline en page.tsx) — lista reemplazosActivos[]: Unidad, Titular, Suplente, botón "Ver"(si tiene incidenciaId).
- Cards secundarias (grid de 3, solo 2 usadas: cardsSecundarias array) — "Clases hoy" (kpis.clasesHoy) y "Suspendidas hoy" (kpis.suspendidasHoy). El grid está declarado a 3 columnas pero solo hay 2 items (posible resto de una tercera card removida).
- Botón "Exportar PDF" — fetch("/api/reportes/dashboard", {headers: authHeaders}), descarga blob. Ruta API: /home/lea/gestor_clean/app/api/reportes/dashboard/route.ts → usa /home/lea/gestor_clean/lib/pdf/documents/dashboard.ts y/home/lea/gestor_clean/lib/pdf/generator.ts (visto vía grafo de dependencias, no explorado en detalle — es generación de PDF, no un componente visual del dashboard en sí).

---
Componentes de features/dashboard/components/ que existen pero NO están en el árbol de page.tsx (huérfanos/no usados en este dashboard)

Confirmado por grep — no hay ningún import de ellos en app/ ni en el resto de features/:
- /home/lea/gestor_clean/features/dashboard/components/ComisionesProblematicas.tsx (definido, cero usos encontrados).
- /home/lea/gestor_clean/features/dashboard/components/CoberturaDonut.tsx (definido, cero usos encontrados).

Vale la pena señalarlos en la auditoría como código muerto o funcionalidad pendiente de integrar.

---
Tipos compartidos (contratos de datos, no Prisma)

- /home/lea/gestor_clean/features/dashboard/types/index.ts — DashboardKPIs, TimelineItem, ResumenCobertura, ClaseSinCobertura, ReemplazoActivoHoy, PendientesDashboard, DashboardOverviewResponse, RangoDias (7|14|30).
- /home/lea/gestor_clean/features/dashboard/types/rankings.ts — RangoRankings ("todo"|"anio"|"semestre"|"mes"), RankingItem, RankingsData.
- /home/lea/gestor_clean/lib/reporting/datasets/obtenerCoberturaPorComision.ts — exporta también los tipos TendenciaComision, TimelineComisionItem, CoberturaPorComision usados por 3 componentes de presentación (este archivo sítoca Prisma internamente — queda para el otro agente).

---
Filtros de fecha/periodo — resumen de propagación

Hay dos filtros de período independientes y no sincronizados en el dashboard:

1. dias (7 | 14 | 30) — state en useDashboardOverview (page.tsx), controlado por el UI dentro de TimelineCoberturaChart(setDias pasado por props). Se propaga a:
  - getDashboardOverview(authHeaders, dias) → /api/dashboard/overview → afecta timeline (y por ende KPIs derivados quedependen de rango, aunque kpis como tal parecen ser "hoy").
  - useCoberturaPorComision(dias) → /api/dashboard/cobertura-comisiones → afecta datos de TimelineCoberturaChart yMapaCalorSemanal (ambos consumen el mismo comisionesData).
2. rango ("mes"|"semestre"|"anio"|"todo") — state interno de useRankings, encapsulado dentro de RankingsBlock. Controlaexclusivamente /api/dashboard/rankings. No hay ningún selector de sede/año en el nivel de página — cada bloque de rankings maneja su propio período de forma aislada.

No existe selector de "sede"/institución a nivel dashboard visible en el código leído (el scoping por tenant se maneja vía authHeaders/JWT, probablemente resuelto server-side — corresponde al agente de Prisma/backend confirmar el mecanismo de multi-tenancy).

 Plan: Auditoría de inventario del Dashboard ALNEXT

 Contexto

 El usuario está por iniciar un plan de validación funcional del Dashboard
 (app/protected/dashboard/page.tsx) y necesita primero un inventario
 completo y verificado de cada métrica mostrada: de qué componente viene,
 qué hook la trae, qué endpoint/usecase/repository la resuelve, y la query
 Prisma real que la calcula. Es tarea de auditoría, 100% de solo lectura
 — no se modifica ni corrige nada, solo se documenta. Se pide además
 verificar explícitamente un patrón de bug ya conocido y corregido esta
 semana (uso de titularidades[0]/take:1 con activo:true en vez del
 titular vigente en la fecha de referencia del dato mostrado), y otros tres
 patrones conocidos (timezone en toLocaleDateString, filtros activo:true
 que ocultan historial, falta de scoping por institucionId).

 Estado de la investigación (Fase 1, ya ejecutada)

 1. Árbol completo de componentes/hooks (agente Explore, completado):
 mapeado page.tsx → 4 componentes de features/dashboard + 1 de app/ui
   - subcomponentes locales inline (BandaAlertas, BloquePendientes,
 KpiHero, RiesgoOperativo) → hooks (useDashboardOverview,
 useCoberturaPorComision, useRankings) → servicios → endpoints API.
 Confirmado: dos filtros de período independientes y no sincronizados
 (dias 7/14/30 global, rango mes/semestre/año/todo solo en
 RankingsBlock). Sin selector de sede a nivel página. Dos componentes
 huérfanos detectados (ComisionesProblematicas.tsx, CoberturaDonut.tsx
 — código muerto, no importados en ningún lado).
 2. Tres agentes en paralelo trazando hasta Prisma (lanzados, en curso):
   - Agente A: /api/dashboard/overview completo (kpis, sinCobertura,
 reemplazosActivos, timeline, pendientes) + chequeo de patrón
 titularidades + timezone + activo:true + institucionId.
   - Agente B: /api/dashboard/cobertura-comisiones +
 lib/reporting/datasets/obtenerCoberturaPorComision.ts (usado por
 TimelineCoberturaChart y MapaCalorSemanal) + mismos chequeos.
   - Agente C: /api/dashboard/rankings (3 rankings: agentes con más
 licencias, artículos más usados, comisiones con más ausencias) +
 /api/reportes/dashboard (PDF) + mismos chequeos, más verificación
 de si el PDF duplica lógica de query en vez de reusar los mismos
 usecases que el dashboard en pantalla.

 Investigación completada (los 3 agentes en background fallaron repetidamente

 por un stall de infraestructura — se abandonó ese camino y se leyó cada
 archivo directamente, de forma síncrona, hasta agotar la cadena completa)

 Cadena confirmada archivo por archivo, desde los 3 endpoints hasta Prisma:
 - app/api/dashboard/overview/route.ts → obtenerKPIsDashboard /
 obtenerClasesOperativas(Hoy) / generarTimelineCobertura /
 calcularCobertura / obtenerCoberturaAyer / obtenerProximosVencimientos
 → todas via prisma.claseProgramada / prisma.incidencia /
 prisma.reemplazo, scoped por institucionId: tenantId.
 - app/api/dashboard/cobertura-comisiones/route.ts →
 obtenerCoberturaPorComision → prisma.claseProgramada.findMany
 agrupado por comisión/día en JS (no toca titularidades, no hay nombres
 de titular en esta cadena).
 - app/api/dashboard/rankings/route.ts → obtenerRankings →
 prisma.incidencia.groupBy / prisma.titularAsignacion.findMany /
 prisma.claseProgramada.groupBy / prisma.codigarioItem.findMany /
 prisma.comision.findMany.
 - app/api/reportes/dashboard/route.ts (botón "Exportar PDF") reusa
 obtenerKPIsDashboard y obtenerClasesOperativasHoy, pero reimplementa
 el mapeo de sinCobertura/reemplazosActivos en
 lib/pdf/datasets/dashboard.ts en vez de compartir la función con
 app/api/dashboard/overview/route.ts — duplicación menor, no bug hoy,
 documentar como hallazgo de mantenibilidad.

 Hallazgo confirmado (Tarea 3 — coincide con el patrón ya corregido esta
 semana): lib/reporting/datasets/obtenerRankings.ts líneas 57-79
 (ranking "Agentes con más licencias"). Agrupa incidencias por
 asignacionId sobre un período que puede ser de hasta 1 año o histórico
 completo (rango=anio|todo), y para asignarle un nombre de agente a cada
 grupo busca prisma.titularAsignacion.findMany({ where: { activo: true }, distinct: ["asignacionId"] }) — es decir, el titular actual, no el
 titular vigente en la fecha_desde de cada incidencia individual. Si el
 titular de una asignación cambió dentro del período, todas las licencias
 del titular anterior quedan atribuidas al titular actual; si la posición
 está vacante hoy, esas licencias se excluyen silenciosamente del ranking
 (if (!titular) continue, línea 70). Es el mismo patrón que
 obtenerClasesOperativas.ts ya corrigió esta semana con titularVigenteEn()
 — pero esa función no se reutiliza acá. Confirmado como sospechoso, no
 corregido (tarea de solo lectura).

 Verificado que NO aplica el patrón (correcto tal como está):
 lib/reporting/datasets/obtenerClasesOperativas.ts (usado por KPIs de hoy,
 sinCobertura, reemplazosActivos, timeline y el dataset del PDF) ya
 usa titularVigenteEn(titularidades, clase.fecha) (línea 45-53) — el fix
 de esta semana (commit 98b7b4e) cubre correctamente toda esta cadena,
 incluida la serie histórica timeline de hasta 30 días atrás.
 obtenerCoberturaPorComision.ts no muestra nombres de titular en ningún
 punto — no aplica.

 Otros hallazgos menores (Tarea 4):
 - lib/pdf/generator.ts:121 — toLocaleDateString sin timeZone en el
 timestamp "Generado el" del PDF (cosmético: hora de generación, no una
 fecha de negocio histórica; el mismo archivo sí usa timeZone: "UTC"
 correctamente en formatFecha línea 207 — inconsistencia interna).
 - MapaCalorSemanal.tsx:51,106 — toLocaleDateString sin timeZone
 explícito, pero seguro: todas las fechas se parsean con sufijo
 "T12:00:00" (mediodía), lo que evita cualquier corrimiento de día por
 huso horario. Verificado, no es bug.
 - Scoping por institucionId/tenant: consistente en las 3 cadenas — sin
 hallazgos.
 - Filtros activo:true que ocultan historial: el único caso real es el
 de titularAsignacion en rankings, ya reportado arriba.
 - RankingsBlock.tsx botón "Ver todos" abre un modal (ModalVerTodos)
 que muestra los mismos 5 ítems ya cargados — fetchRankings nunca pide
 más de limite=5 (default nunca sobreescrito en rankingsService.ts).
 El nombre "Ver todos" es engañoso: no trae la lista completa. No es un
 bug de datos, pero es relevante para la validación funcional que sigue.
 - Componentes huérfanos confirmados sin uso en ningún import:
 features/dashboard/components/ComisionesProblematicas.tsx y
 CoberturaDonut.tsx — código muerto.
 - page.tsx líneas 397-400 y 680: grid de "cards secundarias" declarado
 a 3 columnas pero el array cardsSecundarias solo tiene 2 ítems
 (queda un espacio vacío) — detalle de UI, no de datos.

 Próximos pasos (al aprobar este plan)

 La investigación ya está completa (ver sección anterior) — todos los
 archivos de la cadena fueron leídos directamente y verificados. Lo único
 que falta es redactar el entregable:

 1. Escribir un único archivo markdown en
 docs/punto-de-partida-clase-programada-2026-08-10.md con las 4 tareas
 como secciones:
   - Tarea 1: tabla completa sin resumir (Métrica | Componente |
 Hook | Endpoint | Usecase | Repository/query real | Tabla(s) origen),
 una fila por cada métrica individual — KPIs (5), tabla "sin
 cobertura", tabla "reemplazos activos", banda de alertas (4
 variantes derivadas), pendientes/próximos vencimientos (4 contadores),
 timeline institucional + por comisión, heatmap semanal, los 3
 rankings, y los datos del PDF.
   - Tarea 2: query Prisma exacta (where/select/include/groupBy/
 orderBy/take) y cálculo JS posterior de cada métrica, agrupado por
 endpoint.
   - Tarea 3: veredicto explícito por métrica que toque "titular"
 (sospechoso/no aplica/ya corregido), incluyendo el hallazgo
 confirmado en obtenerRankings.ts.
   - Tarea 4: recorrido de los otros 3 patrones conocidos, con lo ya
 verificado (timezone, activo:true, scoping institucionId).
   - Hallazgos: lista final con archivo:línea — el hallazgo real de
 rankings/titularAsignacion, los 3 hallazgos menores (timezone
 cosmético en PDF, duplicación de mapeo PDF vs overview, "Ver todos"
 que no trae más de 5, componentes huérfanos, grid de 3 con 2 ítems).
 2. No se implementa ninguna corrección — todo hallazgo queda solo
 documentado, tal como pidió el usuario.

 Verificación

 - No aplica testing tradicional (es un documento de auditoría, no código).
 - Verificación de calidad: cada fila de la tabla y cada query citada debe
 poder rastrearse a un archivo:línea real (no inferido), y el documento
 final debe poder ser releído por el usuario para confirmar que no falta
 ninguna métrica visible en el dashboard.