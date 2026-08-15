# Auditoría de Reportes — 15/08/2026

Auditoría de solo lectura de `/protected/dashboard/reportes/*`, siguiendo la misma metodología de 5 fases usada para el Dashboard (`docs/fase1-fase2-inventario-metricas-dashboard.md`). No se modificó código, no se corrieron migraciones, no se hicieron commits. Toda verificación contra base de datos fue con `SELECT`.

**Alcance**: `reportes/asignaciones`, `reportes/ausencias`, `reportes/codigarios`, `reportes/horarios`, `reportes/modulos-computables`, `reportes/profesor`, `reportes/profesores`. (Existe además `app/api/reportes/dashboard/route.ts`, pero no cuelga de ninguna pantalla dentro de `reportes/*` — fuera de alcance, no auditado.)

**Dataset controlado (Fase 3)**: Institución 1 — Escuela Primaria N°12 (mismo tenant usado en la auditoría del Dashboard). 9 incidencias activas, dos cadenas reales de reemplazo-de-reemplazo (asignación 4 / identificador `666666`, y asignación 2).

---

## 1. Inventario por reporte (Fase 1 y 2)

Patrón común a los 7 reportes: cada uno tiene **un único dataset** en `lib/pdf/datasets/*.ts` (o `lib/reporting/datasets/*.ts` para módulos-computables) que alimenta tanto la vista en pantalla (`GET .../route.ts?formato=json`) como el PDF (`GET .../route.ts` sin `formato`, vía `lib/pdf/documents/*.ts`). Confirmado leyendo los 7 `route.ts`: en todos los casos ambos caminos llaman a la misma función de dataset — **no hay duplicación de lógica pantalla vs. PDF en ningún reporte**. Esto es distinto de lo que pasaba en el Dashboard (que sí tenía cálculos duplicados entre KPIs/timeline/mapa de calor).

| Reporte | Dataset (fuente única) | Campos/agregados principales | Fecha/período | ¿PDF? |
|---|---|---|---|---|
| `asignaciones` | `lib/pdf/datasets/asignaciones.ts` → `obtenerDatosAsignaciones` | Identificador, titular (DNI), materia, comisión, turno, unidad, distribuciones (versión, vigente, desde/hasta, módulos) | No usa rango de fechas — solo "titular actual" (`activo:true, fecha_hasta:null`) | Sí |
| `ausencias` | `lib/pdf/datasets/ausencias.ts` → `obtenerDatosAusencias` | Por incidencia: período, código/nombre de artículo, titular vigente en la fecha, reemplazante, cadena (`incidenciaPadreId`/`esRaiz`) | Rango `desde`/`hasta` explícito | Sí |
| `codigarios` | `lib/pdf/datasets/codigarios.ts` → `obtenerDatosCodigarios` | Catálogo estático: codigario → items (código, nombre, descripción, activo) | Sin fecha | Sí |
| `horarios` | `lib/pdf/datasets/horarios.ts` → `obtenerDatosHorarios` | Por comisión: día/hora, materia, identificador, titular (DNI), y opcionalmente "a cargo ahora" (reemplazante activo hoy) | Solo si se pide "a cargo ahora": usa "hoy" | Sí |
| `modulos-computables` | `lib/reporting/datasets/obtenerModulosComputables.ts` | Por clase del docente: fecha, incidencia, % computable; totales | Período flexible (mes / período operativo / rango), resuelto por `lib/reporting/resolverPeriodo.ts` | No (no existe `lib/pdf/datasets|documents` para este reporte; la pantalla no tiene botón "Descargar PDF") |
| `profesor` | `lib/pdf/datasets/profesor.ts` → `obtenerDatosProfesor` | Ficha de 1 agente: datos personales, asignaciones (con distribuciones e incidencias), reemplazos realizados como suplente (histórico completo) | Sin rango — historial completo | Sí |
| `profesores` | `lib/pdf/datasets/profesores.ts` → `obtenerDatosProfesores` | Listado: apellido/nombre, DNI, contacto, `esPlanta`, asignaciones vigentes. Filtro `todos\|planta\|suplentes` | Sin fecha | Sí |

### Fase 2 — nota de duplicación de código (no de datos)

`titularVigenteEn()` (busca el titular vigente en una fecha puntual recorriendo `TitularAsignacion`, la versión *correcta* del patrón, no "más reciente") está **reimplementada de forma idéntica** en `lib/pdf/datasets/ausencias.ts:40-48` y en `lib/pdf/datasets/profesor.ts:50-58`, en vez de importarse de un solo lugar compartido. Hoy las dos copias son correctas y coinciden, pero es el mismo tipo de riesgo de divergencia que causó los hallazgos del Dashboard — si mañana alguien corrige un caso borde en una copia y no en la otra, van a divergir sin que nada lo marque. **Riesgo de duplicación, sin bug activo.**

---

## 2. Chequeo de los 5 patrones de bug del Dashboard

| # | Patrón | asignaciones | ausencias | codigarios | horarios | modulos-computables | profesor/profesores |
|---|---|---|---|---|---|---|---|
| 1 | Timezone local vs UTC | N/A (sin fechas calculadas) | OK (`new Date("YYYY-MM-DD")` de un `<input type=date>` parsea UTC nativamente; sin `setHours`/`setDate`) | N/A | **BUG confirmado** (ver §3.3) | OK (`Date.UTC` explícito en `resolverPeriodo.ts`) | N/A (sin fechas calculadas, solo comparaciones directas) |
| 2 | Titular "más reciente" vs "vigente en la fecha" | OK — no aplica (siempre titular actual, no hay fecha pasada a resolver) | **OK, correcto** — usa `titularVigenteEn` propio | N/A | OK — no aplica (siempre "hoy", no hay fecha histórica que resolver; confirmado que NO consume `horarioRepository.ts`, que sí tiene el bug pero sin consumidor en Reportes) | OK — resuelve por tramos de `TitularAsignacion` | OK — `profesor.ts` usa `titularVigenteEn` propio para `reemplazosComoSuplente` |
| 3 | Filtro por `causa=INCIDENCIA` vs `estado=SUSPENDIDA` a secas | N/A | N/A — consulta `Incidencia` directamente, no `ClaseProgramada.estado`, así que no aplica la ambigüedad | N/A | N/A | N/A — usa `incidenciaId != null`, no `estado` | N/A — ídem, consulta `Incidencia` directamente |
| 4 | Reemplazos sin filtrar `activo:true` | N/A | OK — trae todos los reemplazos (activos e inactivos) *a propósito*, para reconstruir la cadena; el "activo" se distingue explícitamente en JS | N/A | OK — filtra `where:{activo:true}` (línea 114) | N/A | OK — `profesor.ts` trae histórico completo a propósito (comentario explícito, línea 130-134); `profesores.ts` filtra `activo:true` para `suplentesIds` |
| 5 | Cadena de 3+ niveles: primer eslabón vs inmediatamente anterior | N/A | **BUG confirmado** (ver §3.1) — la lógica de "saliente = último desactivado" está bien, pero la elección de **qué clase representa a la incidencia** no lo está | N/A | N/A | N/A | N/A |

---

## 3. Hallazgos

### 3.1 — BUG CONFIRMADO: `reportes/ausencias` elige una clase no determinística para representar la cadena de reemplazos

**Archivo**: `lib/pdf/datasets/ausencias.ts:183-219`
**Causa raíz**: la query que busca las `ClaseProgramada` de una incidencia para extraer su reemplazo no tiene `orderBy`, y el loop corta (`break`, línea 218) en la **primera** clase que tenga algún reemplazo — sin garantía de qué clase es esa, porque SQL no define orden sin `ORDER BY` explícito.

```ts
const clases = await prisma.claseProgramada.findMany({
  where: {
    institucionId: tenantId,
    asignacionId:  inc.asignacionId,
    fecha: { gte: inc.fecha_desde, lte: inc.fecha_hasta },   // sin orderBy
  },
  select: { reemplazos: { orderBy: { id: "asc" }, select: {...} } },
})

for (const clase of clases) {
  if (clase.reemplazos.length === 0) continue
  const inactivos = clase.reemplazos.filter(r => !r.activo)
  const saliente   = inactivos[inactivos.length - 1] ?? null   // correcto DENTRO de la clase elegida
  const activo     = clase.reemplazos.find(r => r.activo)
  ...
  break   // corta en la PRIMERA clase con reemplazos, sea cual sea
}
```

El problema aparece cuando el rango de fechas de una incidencia **se solapa con el de su propia incidencia-hija** (algo que pasa siempre que hay cadena, porque la hija nace dentro del rango del padre) — en ese caso la query trae clases que pertenecen a distintos "momentos" de la cadena (antes y después de que el reemplazante original también se ausentara), y cuál de ellas se usa para representar la fila depende de un orden no garantizado.

**Evidencia — caso limpio (asignación 4, identificador `666666`)**:

Cadena real en la DB: incidencia #10 (raíz, 06/08→14/08) → incidencia #11 (hija de #10, 07/08→14/08) → incidencia #12 (nieta, 14/08→14/08). Clases de esa asignación en el rango:

```
clase 110 (07/08): Pepo,Pipo INACTIVO → Perez,Juan ACTIVO
clase 111 (07/08): Pepo,Pipo INACTIVO → Perez,Juan ACTIVO
clase 112 (14/08): Pepo,Pipo INACTIVO → Perez,Juan INACTIVO → Federico,Pepo ACTIVO
clase 113 (14/08): Pepo,Pipo INACTIVO → Perez,Juan INACTIVO → Federico,Pepo ACTIVO
```

Cadena real de cobertura: Pepo,Pipo cubre inicialmente → se ausenta (incidencia #11) → Perez,Juan cubre → también se ausenta (incidencia #12) → Federico,Pepo cubre.

Para la fila de la incidencia **#11** (rango 07/08→14/08, que se solapa con el rango de #12), la query `claseProgramada.findMany` sin `orderBy` trae las 4 clases (110,111,112,113):

```sql
-- Orden físico real devuelto por Postgres HOY para este dataset (sin ORDER BY, igual que el código):
SELECT id, fecha FROM "ClaseProgramada" WHERE "asignacionId"=4 AND fecha BETWEEN '2026-08-07' AND '2026-08-14';
-- → 110, 111, 112, 113  (coincide con orden cronológico por casualidad)
```

Con ese orden, la fila #11 sale bien: "REEMPLAZA A" = Pepo,Pipo / "NUEVO REEMPLAZO" = Perez,Juan.

Pero SQL no garantiza ningún orden sin `ORDER BY`. Forzando el mismo filtro con un orden igual de válido para Postgres (`ORDER BY id DESC`, simulando otro plan de ejecución):

```sql
SELECT id FROM "ClaseProgramada" WHERE "asignacionId"=4 AND fecha BETWEEN '2026-08-07' AND '2026-08-14' ORDER BY id DESC LIMIT 1;
-- → 113 (en vez de 110)
```

Con clase 113 como primera, el resultado de la fila #11 sería: "REEMPLAZA A" = **Perez,Juan** (en vez de Pepo,Pipo) / "NUEVO REEMPLAZO" = **Federico,Pepo** (en vez de Perez,Juan) — mismos datos, misma incidencia, personas equivocadas.

**Evidencia secundaria — manifestándose HOY con datos reales (asignación 2, incidencia #4)**: la query real (sin `ORDER BY`, ejecutada tal cual la genera Prisma) para el rango de la incidencia raíz #4 (12/08→14/08) devuelve las clases en este orden: `47, 55, 56, 72, 71, 48`. La clase 47 (primera) solo tiene un reemplazo **inactivo** (Perez,Juan, id=8) y ningún reemplazo activo — mientras que las clases 55 y 71 de la **misma incidencia** sí tienen a Perez,Juan activo. Como el `break` corta en la clase 47, la fila de la incidencia #4 nunca llega a mirar esas otras clases: la elección de qué módulo "representa" a toda la incidencia es arbitraria incluso dentro de un mismo día/incidencia con módulos en estados distintos.

**Impacto**: en una institución con cadenas de reemplazo de 3+ niveles (que existen en los datos reales de prueba), el reporte de ausencias puede mostrar la persona equivocada en "Reemplaza a" / "Nuevo reemplazo" para las incidencias intermedias de la cadena, de forma no reproducible (puede cambiar entre corridas si cambia el plan de ejecución de Postgres). Mismo tipo de fragilidad "no se manifiesta en dev pero no está garantizada" que los bugs de timezone del Dashboard.

**Fix sugerido (no implementado en esta sesión)**: agregar `orderBy: { fecha: "asc" }` a la query de `clases` como mínimo indispensable, y revisar si además hace falta acotar el sub-rango de fechas consideradas para que no se solape con el rango de una incidencia-hija posterior (para no mezclar estados de distintos eslabones de la cadena dentro de una misma fila).

---

### 3.2 — BUG CONFIRMADO: `reportes/profesores` etiqueta "Suplente" a cualquiera sin titularidad activa, no a quien fue realmente suplente

**Archivo**: `lib/pdf/datasets/profesores.ts:54-61` y `96-114`

El dataset calcula explícitamente quiénes son suplentes reales (`suplentesIds`, a partir de `Reemplazo` con `activo:true`) pero **nunca usa ese resultado**:

```ts
// 2. Agentes que aparecen como suplentes (puede ser distinto de planta)
const suplentesIds = new Set(
  (await prisma.reemplazo.findMany({
    where:  { activo: true, agenteSuplente: { institucionId: tenantId } },
    select: { agenteSuplenteId: true },
    distinct: ["agenteSuplenteId"],
  })).map(r => r.agenteSuplenteId)
)
...
const esSuplente = suplentesIds.has(a.id)   // ← calculado y nunca usado

return {
  ...
  esPlanta,
  // esSuplente no está en el objeto devuelto ni en el tipo FilaProfesor
}
}).filter(a => {
  if (filtro === "planta")    return a.esPlanta
  if (filtro === "suplentes") return !a.esPlanta   // ← usa "no es planta", no "es suplente"
  return true
})
```

Tanto la pantalla como el PDF etiquetan "Suplente" con la misma condición: `!esPlanta` (confirmado en `app/protected/dashboard/reportes/profesores/page.tsx:142` y `lib/pdf/documents/profesores.ts:28`). El filtro `?filtro=suplentes` y la columna "Tipo" no preguntan "¿fue alguna vez reemplazante?", preguntan "¿no tiene hoy una titularidad activa?" — dos cosas distintas.

**Evidencia con datos reales (tenant 1)**:

```sql
SELECT ag.id, ag.apellido, ag.nombre,
  EXISTS (SELECT 1 FROM "TitularAsignacion" ta WHERE ta."agenteId"=ag.id AND ta.activo=true AND ta.fecha_hasta IS NULL) AS es_planta,
  EXISTS (SELECT 1 FROM "Reemplazo" r WHERE r."agenteSuplenteId"=ag.id AND r.activo=true) AS es_suplente_real
FROM "Agente" ag WHERE ag."institucionId"=1 AND ag.activo=true AND ag."deletedAt" IS NULL;
```

| id | Agente | es_planta | es_suplente_real |
|---|---|---|---|
| 5 | Juarez, Romina | **false** | **false** |

Juarez, Romina fue titular de la asignación `666666` hasta el 06/08 (`fecha_hasta` no nula → hoy no cuenta como planta) y **nunca** figura como suplente activo de nadie. Con el filtro actual, aparece igual bajo "Solo suplentes (sin asignación titular)" y con la etiqueta "Suplente" en pantalla y PDF — describiéndola como algo que nunca fue.

**Impacto**: bajo, pero es un dato engañoso en un reporte que probablemente se usa para gestión de personal/RRHH. Cualquier agente sin titularidad activa hoy (ex-titular, agente recién dado de alta, etc.) queda mal etiquetado como "suplente".

**Fix sugerido (no implementado)**: usar `esSuplente` (ya calculado) para la etiqueta/filtro, o renombrar la columna a algo que refleje lo que realmente mide (p. ej. "Sin asignación titular vigente").

---

### 3.3 — BUG CONFIRMADO: `reportes/horarios` usa timezone local para "a cargo ahora"

**Archivo**: `lib/pdf/datasets/horarios.ts:100-109`

```ts
if (conACargoAhora) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)              // ← timezone local del proceso, no UTC
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)  // ← ídem

  const clasesHoy = await prisma.claseProgramada.findMany({
    where: { institucionId: tenantId, comisionId, fecha: { gte: hoy, lt: manana } },
    ...
```

Mismo patrón exacto que las 8 instancias ya corregidas en el Dashboard (`setHours`/`setDate` en vez de `setUTCHours`/`setUTCDate`), sobre `ClaseProgramada.fecha`, que se guarda como medianoche UTC. En un servidor con TZ distinta de UTC, el filtro `gte: hoy, lt: manana` puede traer las clases del día equivocado (0 filas, o las de ayer/mañana), y el reporte mostraría "a cargo ahora" vacío o incorrecto aunque sí exista un reemplazo activo hoy.

**Estado**: latente, no observable en el entorno de desarrollo actual porque el proceso resuelve en UTC (mismo diagnóstico que los casos del Dashboard el 03/08 y 09/08).

**Fix sugerido (no implementado)**: `setUTCHours`/`setUTCDate`, igual que se hizo en los 8 casos del Dashboard (commit `ae79980`).

---

### 3.4 — Riesgo de duplicación (no bug): `titularVigenteEn` reimplementada en 2 archivos

Ver §2. `lib/pdf/datasets/ausencias.ts:40-48` y `lib/pdf/datasets/profesor.ts:50-58` tienen copias idénticas de la misma función. No hay divergencia hoy, pero cualquier fix futuro aplicado a una copia no se propaga a la otra automáticamente.

---

### 3.5 — Sin hallazgos: `asignaciones`, `codigarios`, `modulos-computables`

- **`asignaciones`**: sin lógica de fechas relativas, sin conteo de incidencias, fuente única pantalla/PDF. Sin hallazgos.
- **`codigarios`**: catálogo estático (codigario → items), sin fechas ni agregados. Sin hallazgos.
- **`modulos-computables`**: usa `Date.UTC` explícito para resolver "mes calendario" (`lib/reporting/resolverPeriodo.ts:30-31`), resuelve correctamente los tramos de titularidad histórica (`TitularAsignacion`) en vez de asumir "titular actual", y usa presencia de `incidenciaId` en vez de clasificar por `estado`. Es el reporte con la implementación más prolija de los 7. Sin hallazgos.

---

## 4. Lista priorizada de qué conviene arreglar primero

1. **§3.1 — Cadena de reemplazos en `reportes/ausencias`** (bug confirmado, no determinístico, ya se manifiesta parcialmente con datos reales de prueba). Prioridad alta: afecta directamente la confiabilidad del reporte que más se usa para justificar pagos/licencias de reemplazos.
2. **§3.3 — Timezone en `reportes/horarios`** (bug confirmado, mismo patrón ya conocido y con fix ya validado en el Dashboard — debería ser rápido de portar). Prioridad media-alta: fix mecánico, bajo riesgo, alta consistencia con el resto del sistema.
3. **§3.2 — Etiqueta "Suplente" en `reportes/profesores`** (bug confirmado, impacto acotado a un reporte de listado/RRHH). Prioridad media.
4. **§3.4 — Duplicación de `titularVigenteEn`** (riesgo, no bug). Prioridad baja: extraer a un helper compartido (p. ej. `lib/reporting/` o `lib/repositories/claseProgramadaRepository.ts`, que ya tiene la versión de referencia) la próxima vez que se toque alguno de los dos archivos.

## 5. Pendientes / preguntas abiertas para la próxima sesión

- No se pudo levantar el dev server para comparar visualmente pantalla vs. PDF (auditoría hecha por trazado estático de código + SQL); si se quiere el nivel de confianza visual que se logró con el Dashboard, falta ese paso.
- El fix de §3.1 requiere decidir la regla exacta cuando una incidencia-hija arranca a mitad del rango del padre (¿acotar la ventana de clases al sub-rango que precede a la hija siguiente, o marcar la fila como "múltiples reemplazantes"?) — vale la pena discutirlo antes de implementar, no es un simple `orderBy`.
- `horarioRepository.ts` sigue con el patrón "titular más reciente" sin consumidor confirmado dentro de `reportes/*` (confirma lo ya documentado como pendiente #27) — si en el futuro se audita `/protected/dashboard/modulosHorarios` (fuera de este alcance), revisar ahí.
