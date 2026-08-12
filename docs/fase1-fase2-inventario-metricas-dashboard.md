# Fase 1 — Inventario de métricas del Dashboard

Cobertura: `app/protected/dashboard/page.tsx` y sus 3 hijos activos (`RankingsBlock`, `MapaCalorSemanal`, `ProximosVencimientos`) más `TimelineCoberturaChart`. Todo lo que se ve en pantalla sale de 3 endpoints.

## Ruta de datos por endpoint

| Endpoint | Hook que lo llama | Usecase/dataset detrás |
|---|---|---|
| `GET /api/dashboard/overview?dias=N` | `useDashboardOverview` | `obtenerKPIsDashboard`, `obtenerClasesOperativas`, `obtenerClasesOperativasHoy` + `mapearCoberturaHoy`, `generarTimelineCobertura`, y 2 funciones inline en el route (`obtenerCoberturaAyer`, `obtenerProximosVencimientos`, `calcularContinuidad`) |
| `GET /api/dashboard/cobertura-comisiones?dias=N&limite=3` | `useCoberturaPorComision` | `obtenerCoberturaPorComision` |
| `GET /api/dashboard/rankings?rango=X&limite=5` | `useRankings` | `obtenerRankings` |

## Tabla de métricas

| Métrica / bloque UI | Componente | Hook | Endpoint | Usecase | Fuente de datos |
|---|---|---|---|---|---|
| Banda de alertas (sin cobertura / sin suplente / suspendidas / incidencias) | `BandaAlertas` | `useDashboardOverview` | overview | `obtenerKPIsDashboard` + `mapearCoberturaHoy`. `sinSuplente` se calcula **en el frontend** filtrando `sinCobertura` por `!incidenciaId` | ClaseProgramada, Incidencia, Reemplazo |
| Pendientes hoy (sin cobertura, vencen mañana) | `BloquePendientes` | `useDashboardOverview` | overview | `mapearCoberturaHoy` (sinCobertura.length) + `obtenerProximosVencimientos` (inline en route, vencenManana) | ClaseProgramada, Incidencia |
| Riesgo operativo | `RiesgoOperativo` | — (sin fetch propio) | — | `calcularRiesgo()`, **lógica y umbrales 100% en el frontend** (`page.tsx`), no hay equivalente backend | Deriva de `kpis` (mismo overview) |
| KPI Cobertura institucional hoy + delta vs ayer | `KpiHero` | `useDashboardOverview` | overview | `obtenerKPIsDashboard` (coberturaPorcentaje) + `obtenerCoberturaAyer` (inline en route, delta) | ClaseProgramada (estado, incidencia, reemplazos activos) |
| KPI Reemplazos activos | `KpiHero` | `useDashboardOverview` | overview | `obtenerKPIsDashboard` | Reemplazo (activo=true) |
| KPI Clases sin cobertura | `KpiHero` | `useDashboardOverview` | overview | `obtenerKPIsDashboard` | ClaseProgramada |
| KPI Incidencias activas | `KpiHero` | `useDashboardOverview` | overview | `obtenerKPIsDashboard` | Incidencia (activo=true) |
| KPI Continuidad pedagógica | `KpiHero` | `useDashboardOverview` | overview | `calcularContinuidad(timeline)` inline en route, sobre `generarTimelineCobertura(obtenerClasesOperativas(desde,hasta))` — usa el **rango de días seleccionado**, no "hoy" | ClaseProgramada del rango [desde,hasta] |
| Tabla "Sin cobertura hoy" | tabla inline en `page.tsx` | `useDashboardOverview` | overview | `obtenerClasesOperativasHoy` + `mapearCoberturaHoy` | ClaseProgramada + Asignacion/Agente (titular) + UnidadOrganizativa |
| Tabla "Reemplazos activos hoy" | tabla inline en `page.tsx` | `useDashboardOverview` | overview | `mapearCoberturaHoy` | ClaseProgramada + Reemplazo + Agente (titular/suplente) |
| Card secundaria "Clases hoy" | inline en `page.tsx` | `useDashboardOverview` | overview | `obtenerKPIsDashboard` | ClaseProgramada (hoy) |
| Card secundaria "Suspendidas hoy" | inline en `page.tsx` | `useDashboardOverview` | overview | `obtenerKPIsDashboard` | ClaseProgramada (hoy) |
| Gráfico de tendencia de cobertura | `TimelineCoberturaChart` | `useDashboardOverview` (timeline) + `useCoberturaPorComision` (selector de comisión) | overview + cobertura-comisiones | `generarTimelineCobertura` + `obtenerCoberturaPorComision` | ClaseProgramada |
| Mapa de calor semanal | `MapaCalorSemanal` | mismos que arriba (recibe por props, sin fetch propio) | overview + cobertura-comisiones | mismos | ClaseProgramada |
| Próximos vencimientos (hoy/mañana/semana + reemplazos que vencen) | `ProximosVencimientos` | `useDashboardOverview` | overview | `obtenerProximosVencimientos` (inline en route) | Incidencia, Reemplazo |
| Ranking "Agentes con más licencias" | `RankingsBlock` | `useRankings` | rankings | `obtenerRankings` | Incidencia (por agente) — ya validado el 09/08 (tarea #30): usa titular vigente en la fecha de la incidencia, no el actual |
| Ranking "Artículos más usados" | `RankingsBlock` | `useRankings` | rankings | `obtenerRankings` | Incidencia + CodigarioItem (confirmado, ver abajo) |
| Ranking "Comisiones con más ausencias" | `RankingsBlock` | `useRankings` | rankings | `obtenerRankings` | ClaseProgramada (filtrada por causa=INCIDENCIA) + Comision |

## Notas de Fase 1

- **Riesgo operativo no tiene fuente de verdad backend** — es puro frontend con umbrales hardcoded (`sinCobertura > 3`, `suspendidas > 5`, etc. en `calcularRiesgo`). La validación tiene que ser "¿la lógica de umbrales hace lo que dice hacer?", no "¿coincide con la DB?".
- **Continuidad pedagógica usa el rango de días seleccionado** (7/14/30), no "hoy" — hay que tenerlo en cuenta al armar valores esperados en Fase 4, así no se compara contra la fecha equivocada.
- **"Artículos más usados" confirmado**: `prisma.incidencia.groupBy({ by: ["codigarioItemId"] })` sobre incidencias activas del tenant/rango, unido contra `CodigarioItem` (nombre, código). Fuente: Incidencia + CodigarioItem.

## Fase 2 — Fuente de verdad por métrica

6 hallazgos reales encontrados y corregidos, todos commiteados en `refactor-clases-programadas-frontend`:

1. **`causa` no seteada al generar clases suspendidas por feriado preexistente.** `generarClases()` (lib/helpers/clases.ts) calculaba bien el `estado: SUSPENDIDA` cuando la fecha coincidía con un feriado ya cargado, pero nunca seteaba `causa` — caía al default de schema (`NINGUNA`). Afecta solo a feriados que ya existen ANTES de generar la clase. Dato histórico corregido a mano (`UPDATE` puntual, verificado que no quedan más casos). Commit `ca92442`.

2. **"Comisiones con más ausencias" sin filtrar por causa.** `obtenerRankings.ts` contaba `ClaseProgramada` con `estado in [SUSPENDIDA, REEMPLAZADA]` sin filtrar `causa` — sumaba feriados y cambios de distribución como si fueran ausencias reales. Se agregó `causa: "INCIDENCIA"`, alineado con la convención ya usada en `obtenerDatosAusencias` (el reporte de ausencias real, que siempre define "ausencia" a partir de `Incidencia`). Commit `39ccac0`.

3. **Cobertura con denominador inconsistente + incidencias activas duplicadas.** `calcularCobertura()` incluía las `SUSPENDIDA` en el denominador (`cubiertas/total`), mientras `obtenerCoberturaAyer` y `calcularContinuidad` ya las excluían (`cubiertas/(total-suspendidas)`) — el delta ▲/▼ "vs ayer" comparaba dos fórmulas distintas. Se alineó `calcularCobertura()` al criterio mayoritario; al ser compartida por `obtenerKPIsDashboard` y `generarTimelineCobertura`, el fix propaga al KPI principal, al gráfico de tendencia y al mapa de calor. Además, `incidenciasActivas` contaba clases con incidencia, no incidencias distintas (una incidencia con 2 módulos el mismo día se contaba 2 veces) — ahora deduplica por `incidencia.id`. Commit `aa93426`.

4. **Timezone local vs UTC en el cálculo de "hoy"/"ayer" (backend).** `obtenerClasesOperativasHoy`, `obtenerCoberturaAyer`, `obtenerProximosVencimientos` y el cálculo de `desde` en el handler GET de `overview/route.ts` usaban `setHours`/`getDate`/`setDate` (timezone local del proceso) en vez de sus equivalentes UTC, mientras `ClaseProgramada.fecha` se guarda como medianoche UTC. En dev el proceso resuelve a UTC así que no se manifestaba, pero es un riesgo latente ante cualquier servidor con otra TZ — mismo root cause que el bug transversal de fechas documentado el 03/08 (ahí era de display, acá de queries). Corregido a UTC explícito en los 4 puntos. Commit `ae79980`.

5. **Mismo bug de timezone en `obtenerCoberturaPorComision.ts`.** Además desalineaba el timeline por comisión respecto del timeline institucional ya corregido — dos gráficos del mismo Dashboard podían agrupar "hoy" distinto entre sí. Commit `3a3d52a`.

6. **Mismo bug de timezone en `calcularPeriodo` de `obtenerRankings.ts`.** Impacto menor (solo se nota en el límite de mes/semestre/año), mismo root cause. Commit `438fd12`.

Con las 6 correcciones de timezone, todo el Dashboard usa UTC como criterio único para "hoy"/rangos de fecha, independiente de la TZ del servidor.

### SQL crudo de referencia — KPIs simples de "hoy"

Para clasesHoy, reemplazosActivos, suspendidasHoy, sinCoberturaHoy, incidenciasActivas y coberturaPorcentaje:

```sql
WITH clases_hoy AS (
  SELECT
    cp.id,
    cp.estado,
    cp."incidenciaId",
    EXISTS (
      SELECT 1 FROM "Reemplazo" r
      WHERE r."claseId" = cp.id AND r.activo = true
    ) AS tiene_reemplazo_activo
  FROM "ClaseProgramada" cp
  WHERE cp."institucionId" = :tenantId
    AND cp.fecha >= date_trunc('day', now() AT TIME ZONE 'UTC')
    AND cp.fecha <  date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'
),
clasificadas AS (
  SELECT
    id,
    "incidenciaId",
    CASE
      WHEN estado = 'SUSPENDIDA'       THEN 'SUSPENDIDA'
      WHEN tiene_reemplazo_activo      THEN 'REEMPLAZADA'
      WHEN "incidenciaId" IS NOT NULL  THEN 'SIN_COBERTURA'
      ELSE 'NORMAL'
    END AS cobertura_estado
  FROM clases_hoy
)
SELECT
  COUNT(*)                                                                  AS clases_hoy,
  COUNT(*) FILTER (WHERE cobertura_estado = 'REEMPLAZADA')                  AS reemplazos_activos,
  COUNT(*) FILTER (WHERE cobertura_estado = 'SUSPENDIDA')                   AS suspendidas_hoy,
  COUNT(*) FILTER (WHERE cobertura_estado = 'SIN_COBERTURA')                AS sin_cobertura_hoy,
  COUNT(DISTINCT "incidenciaId") FILTER (WHERE "incidenciaId" IS NOT NULL)  AS incidencias_activas,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE cobertura_estado IN ('NORMAL','REEMPLAZADA'))
    / NULLIF(COUNT(*) FILTER (WHERE cobertura_estado <> 'SUSPENDIDA'), 0)
  ) AS cobertura_porcentaje
FROM clasificadas;
```

Pendiente para Fase 4: valores esperados de las agregaciones complejas (rankings, cobertura por comisión) sobre el dataset controlado de Fase 3 — evaluar caso por caso si hace falta una segunda vía en código o alcanza con cálculo manual, según el plan original.