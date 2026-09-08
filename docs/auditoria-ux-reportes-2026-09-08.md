# Auditoría UX Funcional y Operativa — Módulo Reportes (08/09/2026)

## 1. Resumen ejecutivo

El módulo Reportes tiene una base de consistencia fuerte: los 8 reportes comparten dos hooks únicos (`useVistaReporte`, `useDescargarPDF`) que centralizan fetch, loading, error y descarga de PDF — por eso el manejo de errores HTTP, el estado de carga y el patrón de "vista en pantalla" son, en su mayoría, idénticos entre reportes. Los 3 bugs de integridad de datos documentados en la auditoría previa (`auditoria-reportes-2026-08-15.md`) fueron revisados contra el código actual: **los 3 aparentan estar resueltos** (ver §4 y hallazgos marcados "RESUELTO").

El foco de esta auditoría — consistencia funcional entre reportes — encontró **9 inconsistencias reales**, ninguna de tipo "el usuario no puede operar", pero una (UX-REP-001) es de prioridad alta porque puede llevar a descargar un CSV desincronizado con el PDF/pantalla en un reporte que se usa para liquidar sueldos. El resto son inconsistencias de mensajes, validación y patrones de botón que aumentan el riesgo de que el usuario interprete mal lo que ve o descargue datos distintos de los que espera, sin que el sistema lo avise.

No se detectaron acciones destructivas/irreversibles en este módulo: **Reportes es de solo lectura** (no crea, edita ni elimina nada), por lo que no aplica la clasificación SEGURO/RIESGO MODERADO/RIESGO ALTO de acciones destructivas.

## 2. Rama y commit auditado

- Rama: `develop`
- Commit: `08f00c9809b0342a4a06d6ae557951ea7a4c396d`
- **Acceso a navegador**: no disponible (no hay herramienta de automatización de navegador en este entorno). Hay un dev server corriendo en `localhost:3000` y se confirmó en vivo que los 7 endpoints `GET /api/reportes/*` devuelven `401` sin autenticación (comportamiento uniforme, vía `withContext`). No se pudo obtener un token de sesión para probar filtros/mensajes de negocio en vivo (no hay credenciales de prueba documentadas en `docs/` ni en `tests/helpers/`). Por lo tanto, salvo el chequeo de 401 citado, todos los hallazgos están marcados **"Fuente: código (inferido)"**.
- No se generaron datos de prueba (no hizo falta: todo el análisis fue por lectura de código; si se requiere validación visual, se recomienda usar el tenant "Escuela Primaria N°12" ya usado en auditorías previas).

## 3. Alcance auditado

Inventario confirmado con `find`/`ls` sobre `app/protected/dashboard/reportes/` y `app/api/reportes/` (no se asumió la lista de referencia del prompt):

| Pantalla | Ruta | API |
|---|---|---|
| Asignaciones y distribuciones | `/reportes/asignaciones` | `GET /api/reportes/asignaciones` |
| Ausencias y reemplazos | `/reportes/ausencias` | `GET /api/reportes/ausencias` |
| Codigarios y artículos | `/reportes/codigarios` | `GET /api/reportes/codigarios` |
| Horarios por comisión | `/reportes/horarios` | `GET /api/reportes/horarios` |
| Jornadas (cargos jornalizados) | `/reportes/jornadas` | `GET /api/reportes/jornadas` |
| Módulos computables | `/reportes/modulos-computables` | `GET /api/reportes/modulos-computables` |
| Ficha de profesor | `/reportes/profesor` | `GET /api/reportes/profesor/[id]` |
| Listado de profesores | `/reportes/profesores` | `GET /api/reportes/profesores` |

**Diferencias respecto a la lista de referencia del prompt**:
- La lista de referencia era correcta y completa: 8 pantallas, incluyendo `jornadas` (feature #80, agregada 20/08/2026).
- `app/api/reportes/dashboard/route.ts` existe pero no cuelga de ninguna pantalla bajo `reportes/*` — mismo hallazgo que la auditoría del 15/08/2026, sigue **fuera de alcance**.
- **CSV**: el prompt asumía "hoy solo `modulos-computables` tendría CSV según el historial del proyecto — confirmalo, no lo asumas". Confirmado por código: **`jornadas` también tiene botón "Descargar CSV"** (agregado junto con la feature #80, ver `punto-de-partida-session de cierre-2026-08-20.md`). Los otros 6 reportes no tienen CSV. Esto es relevante porque el prompt lo daba como caso único y ya no lo es — ver §7.
- No hay una pantalla índice/menú en `reportes/page.tsx` (no existe); se navega desde el ítem colapsable "Reportes" del Sidebar.

## 4. Inventario de pantallas

Patrón común a las 8 pantallas (confirmado leyendo cada `page.tsx`): un formulario de filtros, dos hooks compartidos (`useVistaReporte` para JSON en pantalla, `useDescargarPDF` para el blob de PDF), un panel de resultados con header + botón cerrar (`×`), y los mismos 4 estados posibles dentro del panel: cargando / error / vacío / con datos.

| Pantalla | Objetivo | Filtros | Acciones | Vista vacía |
|---|---|---|---|---|
| Asignaciones | Ver asignaciones + distribuciones vigentes/históricas | Comisión (opc., "Todas"), Profesor (opc., "Todos") | Ver en pantalla, Descargar PDF | "No se encontraron asignaciones para los filtros seleccionados." |
| Ausencias | Ver incidencias del período con titular/reemplazante | Desde, Hasta (**obligatorios**), Comisión (opc.), Profesor (opc.) | Ver en pantalla, Descargar PDF | "No se encontraron incidencias en el período." |
| Codigarios | Catálogo de codigarios y artículos | Codigario (opc., "Todos") | Ver en pantalla, Descargar PDF | "No hay codigarios para mostrar." |
| Horarios | Grilla horaria por comisión, con opción "a cargo ahora" | Comisión ("Todas" por defecto), checkbox "a cargo ahora" | Ver en pantalla, Descargar PDF | "No hay comisiones para mostrar." |
| Jornadas | Días trabajados/reemplazados/sin cobertura de cargos jornalizados, en un período | Agente ("Todos"=resumen), Período (mes / período operativo / rango) | Calcular, Descargar PDF, Descargar CSV (solo tras calcular) | "No hay jornadas para este agente..." / "No hay agentes con cargo jornalizado..." |
| Módulos computables | % computable de clases de un docente en un período | Docente ("Todos"=resumen), Período (mes / período operativo / rango) | Calcular, Descargar PDF, Descargar CSV (solo tras calcular) | "No hay clases para este docente..." / "No hay docentes con titularidad vigente..." |
| Ficha de profesor | Datos, asignaciones e incidencias de 1 agente | Profesor (**obligatorio**, sin "Todos") | Ver en pantalla, Descargar PDF | N/A (requiere selección, error si no hay) |
| Listado de profesores | Listado con filtro planta/suplente | Filtro único: Todos / Solo planta / Solo suplentes | Ver en pantalla, Descargar PDF | "Sin resultados." |

No hay formularios de creación/edición ni modales de confirmación en este módulo — es 100% lectura.

## 5. Matriz de acciones críticas

| Pantalla → Acción | API / Usecase | Resultado esperado | Estado real |
|---|---|---|---|
| Cualquiera → "Ver en pantalla" | `GET .../route.ts?formato=json` → `verEnPantalla()` | Muestra tabla o mensaje vacío/error, sin descargar nada | OK, uniforme vía hook compartido |
| Cualquiera → "Descargar PDF" | `GET .../route.ts` (sin formato) → `respuestaPDF()` | Descarga directa del PDF (blob), sin abrir pestaña | OK, uniforme vía `useDescargarPDF` |
| Jornadas / Módulos computables → "Descargar CSV" | Cliente-side, a partir de `datos` ya cargado (sin nuevo fetch) | CSV con BOM UTF-8 y `;` como separador, coincide con lo visible en pantalla | **Ver UX-REP-001**: puede NO coincidir con lo que se descargaría en PDF si se cambiaron filtros después de "Calcular" |
| Ausencias / Jornadas / Módulos computables → filtros de período inválidos | Validación cliente + `resolverPeriodo()` (solo 2 de 3) | Mensaje de error claro antes o en la respuesta | **Ver UX-REP-003**: inconsistente entre `ausencias` (sin validar `desde > hasta`) y los otros dos (validado) |
| Ficha de profesor → "Ver"/"Descargar" sin seleccionar profesor | Validación cliente (`if (!agenteId)`) | Bloquea antes del fetch, mensaje "Seleccioná un profesor" | OK |

## 6. Hallazgos

### UX-REP-001 — CSV y PDF de Jornadas/Módulos computables pueden descargar datos de filtros distintos, sin aviso
**Prioridad:** P0  **Tipo:** CONSISTENCIA / ACCIÓN DESTRUCTIVA (dato incorrecto silencioso)  **Fuente:** código (inferido)
**Pantalla:** `reportes/jornadas`, `reportes/modulos-computables`
**Acción:** Usuario hace clic en "Calcular" (agente A, mes 8), ve resultados en pantalla. Cambia el filtro a agente B (o a otro mes) sin volver a hacer clic en "Calcular". Hace clic en "Descargar PDF" y luego en "Descargar CSV".
**Resultado esperado:** Si el PDF se genera con los filtros actuales (agente B), el CSV y la tabla en pantalla deberían coincidir con esos mismos filtros, o el sistema debería avisar que hay un cambio sin aplicar.
**Resultado actual:** `handleDescargarPDF` reconstruye la URL con `armarUrl()` (filtros **actuales** del formulario) — `app/protected/dashboard/reportes/jornadas/page.tsx:162-166` y `modulos-computables/page.tsx:156-160`. `handleDescargarCSV` en cambio usa `datos`, el estado en memoria del **último** "Calcular" exitoso, sin volver a leer los filtros — `jornadas/page.tsx:168-181` y `modulos-computables/page.tsx:162-175`. Si el usuario cambia el filtro entre ambas descargas, el PDF corresponde a los filtros nuevos y el CSV (y la tabla visible) siguen mostrando los filtros viejos, sin ningún indicador de que están desincronizados.
**Evidencia:** `app/protected/dashboard/reportes/jornadas/page.tsx:136-181`; mismo patrón en `modulos-computables/page.tsx:130-175`.
**Impacto para el usuario:** Ambos reportes se usan para cálculos de pago (jornadas de cargos jornalizados y módulos computables para liquidar sueldos, según `punto-de-partida-session de cierre-2026-08-18/19.md`). Un usuario que cambia de agente o de mes y descarga "el PDF y el CSV" esperando que sean del mismo cálculo puede terminar liquidando con datos de dos períodos/agentes distintos sin darse cuenta, porque la pantalla no marca el resultado como obsoleto.
**Recomendación:** Deshabilitar o marcar visualmente como "obsoleto" el panel de resultados (y el botón CSV) en cuanto cambie cualquier filtro después de un "Calcular" exitoso, hasta que se vuelva a calcular; o hacer que "Descargar PDF" use los mismos `datos` en memoria en vez de reconstruir la URL. (No implementar en esta sesión.)

---

### UX-REP-002 — "Ver en pantalla" y "Descargar PDF" no comparten estado en los 6 reportes simples
**Prioridad:** P1  **Tipo:** CONSISTENCIA / ESTADO
**Pantalla:** `asignaciones`, `ausencias`, `codigarios`, `horarios`, `profesor`, `profesores`
**Acción:** Usuario filtra por Comisión A, hace clic en "Ver en pantalla" (ve tabla de A). Cambia el filtro a Comisión B sin volver a hacer clic en "Ver en pantalla". Hace clic en "Descargar PDF".
**Resultado esperado:** El PDF descargado debería corresponder a lo que el usuario ve en pantalla, o el sistema debería indicar que el filtro cambió desde la última vista.
**Resultado actual:** Cada botón llama a `armarUrl()` de forma independiente (p. ej. `asignaciones/page.tsx:96-97`: `handleDescargar = () => descargar(armarUrl())`, `handleVer = () => verEnPantalla(armarUrl())`). El PDF descargado usa los filtros vigentes en el momento del clic, que pueden ya no coincidir con lo que está mostrando el panel de "Vista en pantalla" abierto.
**Evidencia:** Mismo patrón en los 6 archivos: `asignaciones/page.tsx:88-97`, `ausencias/page.tsx:99-116`, `codigarios/page.tsx:57-64`, `horarios/page.tsx:71-77`, `profesor/page.tsx:104-120`, `profesores/page.tsx:60-63`.
**Impacto para el usuario:** Menos crítico que UX-REP-001 (estos reportes no se usan para liquidación), pero el usuario puede creer que descargó el PDF de lo que está viendo en pantalla y no es así — puede llevar una asignación/comisión equivocada a una reunión o a un trámite.
**Recomendación:** Igual que UX-REP-001: invalidar visualmente la vista abierta cuando cambia un filtro, o reusar el mismo dataset para ambas acciones. (No implementar.)

---

### UX-REP-003 — Mensaje de error por rango de fechas inválido inconsistente entre reportes
**Prioridad:** P1  **Tipo:** VALIDACIÓN DE NEGOCIO / CONSISTENCIA / MENSAJE
**Pantalla:** `ausencias` vs. `jornadas` / `modulos-computables`
**Acción:** Usuario invierte accidentalmente las fechas (Desde: fecha posterior, Hasta: fecha anterior) y ejecuta el reporte.
**Resultado esperado:** Mensaje de error claro y consistente entre reportes ("la fecha desde no puede ser posterior a la fecha hasta"), igual sin importar qué reporte se esté usando.
**Resultado actual:**
- En `jornadas`/`modulos-computables`, el período pasa por `resolverPeriodo()` (`lib/reporting/resolverPeriodo.ts:46-48`), que valida explícitamente `desde.getTime() > hasta.getTime()` y lanza `PeriodoInvalidoError("desde no puede ser posterior a hasta")` → HTTP 400, mostrado en el mismo cuadro rojo que cualquier otro error.
- En `ausencias`, la validación es manual en `app/api/reportes/ausencias/route.ts:17-25`: solo chequea que `desde`/`hasta` estén presentes y sean fechas parseables (`isNaN`), **sin chequear el orden**. La consulta subyacente (`lib/pdf/datasets/ausencias.ts:80-81`, `fecha_desde: { lte: hasta }, fecha_hasta: { gte: desde }`) es un filtro de superposición de rango, no un `gte/lte` simple — con fechas invertidas puede devolver un subconjunto de incidencias no vacío pero incorrecto para la intención del usuario (o vacío), sin ningún mensaje que indique que las fechas están invertidas.
- El input `<input type="date">` de `ausencias/page.tsx:130,134` no tiene `min`/`max` cruzado entre los dos campos, así que nada impide seleccionar el orden invertido desde la UI.
**Evidencia:** `app/api/reportes/ausencias/route.ts:17-25` vs. `lib/reporting/resolverPeriodo.ts:41-49`.
**Impacto para el usuario:** El mismo tipo de error de tipeo (invertir Desde/Hasta) da una respuesta clara en 2 reportes y un resultado silenciosamente sospechoso en el tercero — que es justamente el reporte que la auditoría anterior (`auditoria-reportes-2026-08-15.md §3.1`) ya identificó como el más sensible a errores de rango de fechas.
**Recomendación:** Agregar la misma validación `desde > hasta` en `app/api/reportes/ausencias/route.ts`, con el mismo mensaje que usa `resolverPeriodo`. (No implementar.)

---

### UX-REP-004 — `horarios` devuelve error explícito por comisión inexistente; `asignaciones`/`ausencias` la ignoran en silencio
**Prioridad:** P2  **Tipo:** CONSISTENCIA / VALIDACIÓN DE NEGOCIO
**Pantalla:** `horarios` vs. `asignaciones`/`ausencias`
**Acción:** Se envía un `comisionId` o `agenteId` que no existe o no pertenece al tenant (alcanzable si el desplegable de filtros quedó desactualizado — p. ej. la comisión fue desactivada en otra pestaña entre que se cargó el filtro y se envió el formulario — no solo por manipulación de URL).
**Resultado esperado:** Comportamiento consistente: o siempre se avisa que el filtro ya no es válido, o siempre se trata como "sin resultados".
**Resultado actual:** `app/api/reportes/horarios/route.ts:11-13` valida el formato y `:19-21` devuelve `404 "Comisión no encontrada"` si no matchea ninguna comisión. En cambio, `app/api/reportes/asignaciones/route.ts:15-16` y `ausencias/route.ts:27-28` hacen `Number(comisionIdRaw)`; si el valor no es un número válido, `Number(...)` es `NaN`, y como el código chequea `if (comisionId)` (líneas 23, 27 y 36, 40 respectivamente), `NaN` es *falsy* en JS — el filtro se ignora silenciosamente y el reporte devuelve **todos** los resultados sin avisar que el filtro pedido no se aplicó.
**Evidencia:** `app/api/reportes/horarios/route.ts:9-21` vs. `app/api/reportes/asignaciones/route.ts:11-16` y `app/api/reportes/ausencias/route.ts:13-14,27-28`.
**Impacto para el usuario:** Bajo pero real: si el filtro seleccionado deja de ser válido justo antes de enviarlo, el usuario de `horarios` se entera (mensaje de error), pero el de `asignaciones`/`ausencias` recibe silenciosamente el reporte completo sin filtrar, pudiendo confundirlo con "el filtro sí se aplicó y no había resultados para acotar".
**Recomendación:** Unificar: cualquier `comisionId`/`agenteId` provisto que no matchee ningún registro del tenant debería devolver el mismo tipo de error en los 3 reportes, o los 3 deberían ignorarlo del mismo modo. (No implementar.)

---

### UX-REP-005 — Patrón de botones "ver/descargar" distinto entre los 6 reportes simples y los 2 reportes con período flexible
**Prioridad:** P1  **Tipo:** CONSISTENCIA
**Pantalla:** Todas
**Acción:** Comparar el bloque de acciones de `asignaciones` (y los otros 5 reportes simples) contra `jornadas`/`modulos-computables`.
**Resultado esperado:** El mismo verbo y la misma jerarquía visual para la misma acción ("ver el resultado en pantalla") en todo el módulo.
**Resultado actual:**
- 6 reportes simples: botón outline "Ver en pantalla" (o "Cargando...") + botón sólido "Descargar PDF" (o "Generando..."), ambos siempre visibles y disparan cada uno su propio fetch.
- `jornadas`/`modulos-computables`: botón sólido "Calcular" (o "Calculando...") + botón outline con estilo distinto ("Descargar PDF"/"Generando..."), y un tercer botón de texto "Descargar CSV" que solo aparece dentro del panel, después de tener resultados. El verbo para la misma acción de "ver resultados en pantalla" pasa de "Ver en pantalla" a "Calcular", y la jerarquía visual primario/secundario se invierte (en los 6 simples el botón sólido es "Descargar", en estos 2 el sólido es "Ver/Calcular").
**Evidencia:** `asignaciones/page.tsx:128-142` vs. `jornadas/page.tsx:260-273` y `modulos-computables/page.tsx:254-267` (estilo `botonSecundario` definido en cada uno, líneas 87-90 y 81-84 respectivamente).
**Impacto para el usuario:** Alguien que usa varios reportes del módulo tiene que reaprender cuál botón es "ver" y cuál es "descargar" según el reporte, y cuál de los dos está resaltado como principal cambia sin razón funcional aparente (calcular vs. filtrar no son conceptualmente tan distintos como para justificar el cambio).
**Recomendación:** Evaluar si conviene unificar a un solo patrón de verbo + jerarquía de botones en los 8 reportes (el nombre "Calcular" puede tener sentido para transmitir que hay cómputo real detrás, pero en ese caso convendría aplicarlo también a los otros 6, o volver a "Ver en pantalla" en los 2 nuevos). (No implementar.)

---

### UX-REP-006 — Formato de fecha distinto en `profesores` respecto al resto del módulo
**Prioridad:** P2  **Tipo:** CONSISTENCIA
**Pantalla:** `reportes/profesores`
**Acción:** Ver la columna "Reemplaza en" de la tabla de profesores, y comparar con cualquier fecha mostrada en los otros 7 reportes.
**Resultado esperado:** El mismo formato de fecha en todo el módulo.
**Resultado actual:** Los otros 7 reportes usan la misma función `formatFecha` (`new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })`), que muestra `DD/MM/AAAA` y `—` para valores nulos. `profesores/page.tsx:30-34` define su propia función que parte el string por `"-"` a mano y devuelve `DD/MM` **sin año**, y `"?"` (no `"—"`) cuando la fecha es `null`.
**Evidencia:** `app/protected/dashboard/reportes/profesores/page.tsx:30-34`, comparado con `asignaciones/page.tsx:32-34` (y los otros 5 reportes con fechas, idéntico).
**Impacto para el usuario:** Fricción menor: el rango de un reemplazo activo en el listado de profesores se ve distinto (sin año, con "?" en vez de "—") al resto de las fechas del sistema, lo que puede leerse como un dato de otra fuente o de menor confiabilidad.
**Recomendación:** Reusar la misma `formatFecha` que el resto de los reportes. (No implementar.)

---

### UX-REP-007 — Dos tonos de rojo distintos para "error" dentro de la misma pantalla, en los 8 reportes
**Prioridad:** P2  **Tipo:** CONSISTENCIA / MENSAJE
**Pantalla:** Todas
**Acción:** Provocar un error de validación (ej. no completar un campo obligatorio) y luego un error de red/servidor en la misma pantalla, y comparar los dos cuadros rojos.
**Resultado esperado:** Mismo color/estilo de error en toda la pantalla (el design system define `--color-error` / `--color-error-bg` para esto, ver `docs/design-system-alnext.md` §2).
**Resultado actual:** El cuadro de error de validación/descarga (`errorDescarga` o `errorForm`) usa un rojo hardcodeado: `background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444"` (p. ej. `asignaciones/page.tsx:146`). El cuadro de error de la vista en pantalla (`errorVista`) usa los tokens correctos: `background: "var(--color-error-bg)", border: "1px solid var(--color-error)"` (p. ej. `asignaciones/page.tsx:171`). Los tokens (`#E5484D`/`#FDE8E8`) y el hardcodeado (`#ef4444`/`rgba(239,68,68,0.1)`) son colores de rojo distintos. El patrón se repite igual en los 8 reportes (no es una inconsistencia entre reportes, sino una inconsistencia interna repetida 8 veces).
**Evidencia:** Comparar `asignaciones/page.tsx:146` con `:171`; el mismo patrón se repite en los 7 archivos restantes. Contradice la regla explícita del design system: "Nunca usar valores hardcodeados — siempre variables CSS" (`docs/design-system-alnext.md:20`).
**Impacto para el usuario:** Bajo (visual), pero es una inconsistencia real y sistemática, no estética aislada: dos variantes de "esto salió mal" con distinto color dentro de la misma pantalla pueden leerse como dos niveles de severidad distintos cuando no lo son.
**Recomendación:** Reemplazar el rojo hardcodeado por `var(--color-error)`/`var(--color-error-bg)` en los cuadros de `errorDescarga`/`errorForm` de los 8 archivos. (No implementar.)

---

### UX-REP-008 — Títulos de página (Topbar) inconsistentes entre sí y con el H1 real de cada reporte
**Prioridad:** P3  **Tipo:** CONSISTENCIA / NAVEGACIÓN
**Pantalla:** Todas (breadcrumb/título superior)
**Acción:** Navegar a cada reporte y comparar el título mostrado en el Topbar con el `<h1>` de la pantalla y con el label del Sidebar.
**Resultado esperado:** Mismo texto (o al menos mismo criterio de capitalización) en Topbar, Sidebar y H1 para cada reporte.
**Resultado actual:** El mapa `PAGE_TITLES` de `app/ui/components/layout/Topbar.tsx:21-28` tiene capitalización inconsistente entre sí — `"Reporte asignaciones"`, `"Reporte ausencias"` (minúscula) vs. `"Reporte Modulos-computables"`, `"Reporte Jornadas-computables"` (mayúscula, y sin tilde en "Módulos")— y ninguno de los 8 coincide textualmente con el `<h1>` real de la pantalla (p. ej. Topbar dice "Reporte Jornadas-computables" mientras el H1 dice "Jornadas (cargos jornalizados)"). La indentación del código en la línea 28 y las líneas vacías 29-31 sugieren que se agregó apurado junto con la feature de Jornadas (20/08/2026), sin revisar el resto del mapa.
**Evidencia:** `app/ui/components/layout/Topbar.tsx:21-28` vs. los `<h1>` de cada `page.tsx` (p. ej. `jornadas/page.tsx:186`).
**Impacto para el usuario:** Bajo — es una inconsistencia visual/de nomenclatura, no afecta la operación. Se documenta porque el prompt pide explícitamente evaluar consistencia de nomenclatura entre reportes.
**Recomendación:** Unificar el criterio de capitalización y hacer que el título del Topbar coincida con el H1 de cada pantalla. (No implementar.)

---

### UX-REP-009 — Ítems de menú "Profesor" y "Profesores" sin distinción funcional visible en el Sidebar
**Prioridad:** P2  **Tipo:** NAVEGACIÓN / CONSISTENCIA
**Pantalla:** Sidebar → sección Reportes
**Acción:** Un usuario nuevo busca "el reporte de profesores" en el menú.
**Resultado esperado:** Poder distinguir a simple vista cuál ítem lleva a una ficha individual (requiere elegir 1 profesor) y cuál a un listado general.
**Resultado actual:** El Sidebar (`app/ui/components/layout/Sidebar.tsx:30-31`) lista dos ítems consecutivos, "Profesor" y "Profesores", sin ningún indicio de que uno es una ficha de un solo agente (con selección obligatoria y sin opción "Todos") y el otro es un listado filtrable con "Todos" por defecto. La única diferencia es el plural.
**Evidencia:** `app/ui/components/layout/Sidebar.tsx:30-31`.
**Impacto para el usuario:** Riesgo de elegir el ítem equivocado y, al entrar a "Profesor", encontrarse con un formulario que pide seleccionar un agente en vez del listado esperado — no es un error del sistema, pero el nombre no ayuda a prevenirlo.
**Recomendación:** Renombrar a algo más descriptivo, p. ej. "Ficha de profesor" y "Listado de profesores" (que coincide, de hecho, con los `<h1>` reales de ambas pantallas). (No implementar.)

---

### UX-REP-010 — Typo "Asiganciones" en el Sidebar
**Prioridad:** P3  **Tipo:** MENSAJE
**Pantalla:** Sidebar → sección Reportes
**Resultado actual:** `app/ui/components/layout/Sidebar.tsx:24`: `{ label: "Asiganciones", href: "/protected/dashboard/reportes/asignaciones" }` — debería decir "Asignaciones".
**Evidencia:** `app/ui/components/layout/Sidebar.tsx:24`.
**Impacto para el usuario:** Cosmético, pero visible en todo momento (menú lateral siempre presente) y en un texto de navegación, no en contenido dinámico.
**Recomendación:** Corregir el string. (No implementar — cambio trivial pero fuera del alcance de "solo auditoría" de este prompt.)

---

### UX-REP-011 — "Ver en pantalla" y "Descargar PDF" tienen estados de carga independientes: se pueden disparar los dos a la vez
**Prioridad:** P3  **Tipo:** ESTADO / CARGA
**Pantalla:** Todas
**Acción:** Hacer clic en "Ver en pantalla" y, mientras carga, hacer clic también en "Descargar PDF" (o viceversa).
**Resultado esperado:** Comportamiento intencional y explícito (bloquear ambos botones durante cualquier operación en curso, o permitir explícitamente operaciones simultáneas).
**Resultado actual:** `cargando` (de `useVistaReporte`) y `descargando` (de `useDescargarPDF`) son estados totalmente independientes; cada botón solo se deshabilita con su propio estado (`disabled={cargando}` / `disabled={descargando}`), así que nada impide iniciar ambas operaciones en simultáneo.
**Evidencia:** `app/hooks/useVistaReporte.ts` + `app/hooks/useDescargarPDF.ts`, consumidos igual en los 8 `page.tsx` (p. ej. `asignaciones/page.tsx:128-142`).
**Impacto para el usuario:** Bajo — ambas operaciones son independientes y de solo lectura, no corrompen datos; en el peor caso el usuario ve dos spinners a la vez, lo cual no es necesariamente confuso pero tampoco fue una decisión de diseño explícita.
**Recomendación:** Documentar como comportamiento aceptado, o unificar el loading si se prefiere una sola operación por vez. (No implementar.)

---

### UX-REP-012 — Mensaje de backend "Debe indicarse exactamente una forma de período..." es técnico y en la práctica inalcanzable desde la UI
**Prioridad:** P3  **Tipo:** MENSAJE
**Pantalla:** `jornadas`, `modulos-computables`
**Resultado actual:** `app/api/reportes/jornadas/route.ts:36-41` y `modulos-computables/route.ts:39-44` devuelven `{"error": "Debe indicarse exactamente una forma de período: (mes y anio) | periodoOperativoId | (desde y hasta)"}` si se proveen 0 o 2+ modos de período. El frontend (`armarUrl()` en ambas pantallas) siempre construye la URL con exactamente un modo, validado antes por `errorForm` — por lo que este mensaje de backend, técnico y con sintaxis de código, no debería llegar nunca a un usuario real a través de la UI actual.
**Evidencia:** `app/api/reportes/jornadas/route.ts:30-41`.
**Impacto para el usuario:** Ninguno hoy (defensa de API, no de UI). Se documenta porque si en el futuro cambia el frontend y este mensaje llega a mostrarse en el cuadro de error, sería incomprensible para un usuario no técnico.
**Recomendación:** Si algún día se expone, traducir a lenguaje de usuario. (No implementar.)

## 7. Inconsistencias entre reportes — síntesis

| Dimensión | ¿Consistente entre los 8? | Detalle |
|---|---|---|
| Manejo de error HTTP/red | Sí | Vía `useDescargarPDF`/`useVistaReporte` compartidos |
| Loading states (texto de botón) | Mayormente | "Cargando..."/"Generando..." en 6 reportes; "Calculando..." en jornadas/módulos-computables (verbo distinto pero coherente con "Calcular") |
| Formato de fecha | No | `profesores` usa un formato propio sin año (UX-REP-006) |
| Filtro "Todos"/"Todas" | Sí, con matices | Presente donde aplica; `profesores` lo modela como parte de un único select de 3 opciones en vez de un filtro independiente — funcionalmente distinto pero no incorrecto |
| Botón de descarga (nombre/estilo) | No | "Ver en pantalla"+"Descargar PDF" (outline+sólido) en 6 reportes vs. "Calcular"+"Descargar PDF"+"Descargar CSV" (sólido+outline+texto) en 2 (UX-REP-005) |
| Mensaje de período inválido | No | `ausencias` no valida `desde > hasta`; `jornadas`/`modulos-computables` sí, con mensaje uniforme entre ellos (UX-REP-003) |
| Comisión/agente inexistente | No | `horarios` da error explícito; `asignaciones`/`ausencias` lo ignoran silenciosamente (UX-REP-004) |
| Vista en pantalla vs. descarga: mismo dataset | No | Ninguno de los 8 garantiza que "lo que ves" y "lo que descargás" coincidan si se cambia el filtro entre acciones (UX-REP-001, UX-REP-002) |
| Color de error interno (validación vs. red) | Repetido igual en los 8, pero interno inconsistente | Dos rojos distintos dentro de cada pantalla (UX-REP-007) |
| CSV disponible | No, y ya no es "1 de 7" sino "2 de 8" | `jornadas` y `modulos-computables`; el resto no tiene CSV (consistente que comparten el mismo patrón entre sí) |

## 8. Pantallas auditadas sin problemas relevantes

- **`codigarios`**: sin fechas, sin lógica de negocio compleja, filtro simple con "Todos" — sin hallazgos más allá de los genéricos de plataforma (UX-REP-007, UX-REP-011).
- **`horarios`**: es, de los 6 reportes simples, el que mejor valida sus filtros (400 explícito por `comisionId` inválido, 404 explícito por comisión no encontrada) — el bug de timezone documentado en la auditoría previa (§3.3) fue confirmado **resuelto** (usa `setUTCHours`/`setUTCDate`, con comentario in situ fechado 18/08/2026).
- **`profesores`**: el bug de etiquetado "Suplente" documentado en la auditoría previa (§3.2) fue confirmado **resuelto** (`esSuplente` calculado y usado correctamente en el dataset y consumido igual en pantalla/PDF), salvo el hallazgo nuevo de formato de fecha (UX-REP-006).
- **`ausencias`**: el bug de orden no determinístico en la cadena de reemplazos documentado en la auditoría previa (§3.1) aparenta **resuelto** — se agregó `orderBy: [{ fecha: "asc" }, ...]` a la query de `clases` en `lib/pdf/datasets/ausencias.ts:195`, que era el fix mínimo sugerido. No se re-validó el caso completo de cadenas de 3+ niveles (fuera del foco de esta auditoría UX); si se quiere certeza total, conviene una verificación de datos puntual como la de la auditoría anterior.

## 9. Áreas que no pudieron verificarse

- **Comportamiento visual real** (spinners, transiciones, disposición responsive, aspecto del PDF generado) — no hay navegador disponible en este entorno; todo el análisis es por lectura de código.
- **Mensajes de error de negocio en runtime** (p. ej. el 400 real de `ausencias` con fechas invertidas, el 404 real de `horarios` con comisión inexistente) — no se pudo autenticar contra el dev server (no hay credenciales de prueba documentadas); solo se confirmó en vivo el 401 uniforme sin autenticación.
- **Aspecto y contenido exacto de los PDFs** (`lib/pdf/documents/*.ts`) — no se auditó su maquetación interna; el foco fue la pantalla y el flujo de descarga, no el documento resultante.
- **Corrección de datos en cadenas de reemplazo de 3+ niveles en `ausencias`** tras el fix de `orderBy` — se confirmó que el fix sugerido por la auditoría previa está aplicado, pero no se re-corrió el caso de prueba completo con datos reales (estaba fuera del foco UX de este prompt).
- **`app/api/reportes/dashboard/route.ts`** — confirmado que sigue sin pantalla propia bajo `reportes/*`; no se auditó porque no es parte de este módulo (podría ser parte del módulo Dashboard, ya auditado en `auditoria-ux-dashboard-2026-09-06.md`).

## 10. Lista priorizada de correcciones (sin implementar)

1. **UX-REP-001** (P0) — Evitar que CSV y PDF de jornadas/módulos-computables se generen con filtros distintos sin aviso.
2. **UX-REP-003** (P1) — Agregar validación `desde > hasta` en `ausencias`, igual que en `jornadas`/`modulos-computables`.
3. **UX-REP-002** (P1) — Invalidar visualmente la vista abierta cuando cambian los filtros, en los 6 reportes simples.
4. **UX-REP-005** (P1) — Decidir y unificar un único patrón de verbo/jerarquía de botones "ver"/"descargar" en los 8 reportes.
5. **UX-REP-004** (P2) — Unificar el manejo de `comisionId`/`agenteId` inexistente entre `horarios` y `asignaciones`/`ausencias`.
6. **UX-REP-009** (P2) — Renombrar los ítems de menú "Profesor"/"Profesores" para que se distingan sin ambigüedad.
7. **UX-REP-006** (P2) — Unificar el formato de fecha de `profesores` con el resto del módulo.
8. **UX-REP-007** (P2) — Reemplazar el rojo hardcodeado de `errorDescarga`/`errorForm` por los tokens del design system, en los 8 archivos.
9. **UX-REP-008** (P3) — Unificar capitalización y texto de `PAGE_TITLES` en el Topbar con el H1 real de cada pantalla.
10. **UX-REP-010** (P3) — Corregir el typo "Asiganciones" en el Sidebar.
11. **UX-REP-011 / UX-REP-012** (P3) — Documentar como comportamiento aceptado, o corregir si se retoma el módulo.
