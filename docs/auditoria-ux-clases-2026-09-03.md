# Auditoría UX Funcional y Operativa — Módulo Clases Programadas

## 1. Resumen ejecutivo

El módulo "Clases programadas" es, tal como anticipaba el prompt de esta fase, mayormente de **solo lectura**: no hay alta/edición/baja manual de `ClaseProgramada` desde la UI. La única pantalla real es `/protected/dashboard/clases`, que muestra las clases **de hoy únicamente** (no tiene selector de fecha, rango, ni vista semanal — ver hallazgo UX-CLS-001) y cuya única acción de usuario es navegar a la incidencia vinculada.

El hallazgo central de esta fase confirma exactamente lo que el prompt pedía verificar: **la `Causa` de una clase (por qué está SUSPENDIDA, por qué es REEMPLAZADA) no llega a esta pantalla**. El campo se calcula y persiste en el motor de resolución (`resolucionClaseService.ts`), pero se descarta en el dataset que alimenta la pantalla (`obtenerClasesOperativas.ts`) antes de llegar al frontend. Esto **confirma y cruza directamente con #138 (UX-PER-004)** de la auditoría de Períodos Operativos, que ya había documentado este problema como transversal — acá se verifica que la pantalla candidata natural para mostrarlo (la única que lista `ClaseProgramada` con su estado) tampoco lo hace.

Segundo hallazgo relevante: el mecanismo automático `resolverClasesVencidas` (que hace transicionar PROGRAMADA → DICTADA/SUSPENDIDA con el paso del tiempo) se dispara silenciosamente como efecto colateral de la primera request del día a cualquier endpoint autenticado, sin ningún rastro visible para el usuario — ni notificación, ni log accesible desde la UI, ni cambio evidente en la pantalla salvo que las clases "ya estén distintas" la próxima vez que se mira.

Tercer hallazgo estructural: existe una API completa (`GET /api/clases`, `GET/PATCH /api/clases/[id]`) con sus usecases (`listarClases`, `obtenerClase`, `actualizarClase`) que **no tiene ningún consumidor en el frontend** — la única pantalla del módulo usa un endpoint de reporting distinto (`/api/dashboard/clases-hoy`). Esto no es un bug de UX en sí, pero es relevante para entender el alcance real: el "listado con filtros" que el prompt de esta auditoría presuponía como parte del alcance (`asignacionId`, `moduloId`, `unidadId`, `comisionId`, `estado`, rango de fechas) **existe en el backend pero no está expuesto en ninguna pantalla**.

No se encontraron problemas de tipo "el usuario hizo algo y el sistema no le explicó qué pasó" en el sentido clásico (no hay formularios ni confirmaciones en este módulo), pero sí problemas de legibilidad de estado que producen el mismo efecto: el usuario mira la pantalla y no puede inferir correctamente qué significa lo que ve.

## 2. Rama y commit auditado

- Rama: `refactor-clases-programadas-frontend`
- Commit: `a700738d989ce08a2e163bd2a864c6d13d3757c4` (`git rev-parse HEAD` al iniciar)
- **Acceso a navegador**: NO disponible en esta sesión (no hay herramienta de control de navegador/Playwright habilitada). El dev server (`next dev`, puerto 3000) sí está corriendo y responde `200`, pero no se pudo interactuar con la UI real ni autenticar contra un tenant de prueba dentro del tiempo de esta auditoría. **Todos los hallazgos están marcados "Fuente: código (inferido)"**, ninguno es "prueba en vivo". Si se necesita confirmación visual (colores reales, comportamiento de hover, etc.), requeriría una sesión con navegador disponible.
- Tenant de prueba identificado para pruebas futuras: `Escuela Primaria N°12` (`prisma/seed.ts:123`) — no se generaron datos nuevos en esta sesión porque no hubo forma de probar el flujo en vivo.

## 3. Alcance auditado (rutas confirmadas en el repo)

| Ruta / archivo | Tipo |
|---|---|
| `app/protected/dashboard/clases/page.tsx` | Página (única pantalla del módulo) |
| `app/api/dashboard/clases-hoy/route.ts` | API que alimenta esa pantalla |
| `app/api/clases/route.ts` (GET) | API sin consumidor frontend confirmado |
| `app/api/clases/[id]/route.ts` (GET, PATCH) | API sin consumidor frontend confirmado |
| `lib/usecases/clases/listarClases.ts` | Usecase (solo alcanzable vía API sin UI) |
| `lib/usecases/clases/obtenerClase.ts` | Usecase (ídem) |
| `lib/usecases/clases/actualizarClase.ts` | Usecase (ídem) |
| `lib/usecases/clases/resolverClasesVencidas.ts` | Mecanismo automático, disparado por `withContext.ts` |
| `lib/services/resolucionClaseService.ts` | Motor de resolución de estado/causa |
| `lib/services/claseProgramadaService.ts` | Servicio de generación/reconciliación (tocado tangencialmente, no es el foco) |
| `lib/reporting/datasets/obtenerClasesOperativas.ts` | Dataset real que consume la pantalla |
| `lib/repositories/claseProgramadaRepository.ts` | Repositorio (consumido por los usecases sin UI) |

No se auditaron en profundidad (pertenecen a otros módulos, ya cubiertos o fuera de alcance): `features/incidencias/components/ClasesAfectadasTable.tsx`, `features/incidencias/hooks/useClasesAfectadas.ts` (viven en el módulo de Incidencias, no en este), ni el detalle de `claseProgramadaService.ts` más allá de lo necesario para entender el mecanismo de resolución.

## 4. Inventario de pantallas

### `/protected/dashboard/clases` — "Operación diaria de clases"

- **Objetivo de la pantalla**: vista operativa institucional de las clases **del día actual únicamente** (subtítulo: "Vista operativa institucional del día"), con métricas agregadas y tabla de detalle.
- **Rol esperado**: no verificable en el código de esta pantalla — no hay ningún control de rol visible (ver UX-CLS-006, relacionado con UX-PER-012 ya documentado en Períodos).
- **Acciones disponibles**: ninguna de escritura. La única acción es un botón/link (`onClick={() => router.push(...)}`) que navega al detalle de la incidencia vinculada a la clase, cuando existe.
- **Formularios**: ninguno.
- **Botones**: uno solo, contextual por fila ("· Asignar →" o "· Ver →" según `coberturaEstado`), visible solo si `clase.incidencia` no es null.
- **Filtros**: **ninguno**. No hay selector de fecha, no hay filtro por estado, unidad, comisión, materia ni asignación. La pantalla siempre trae exactamente el día de hoy (ver UX-CLS-001).
- **Tabla**: columnas Hora, Estado, Materia, Comisión, Suplente, Incidencia. Sin paginación (asumible: el volumen de "clases de un solo día" es acotado).
- **Modales**: ninguno.
- **Confirmaciones**: ninguna (no hay acciones que las requieran).
- **Mensajes**: solo dos textos de estado de carga/vacío ("Cargando clases...", "No hay clases para mostrar"); no hay mensaje de error visible al usuario si el fetch falla (ver UX-CLS-002).
- **Navegación posterior**: el único destino es `/protected/dashboard/incidencias/{id}` (ruta confirmada existente en `app/protected/dashboard/incidencias/[id]/page.tsx`).

### `GET /api/clases`, `GET/PATCH /api/clases/[id]` — sin pantalla asociada

No tienen página propia ni son invocadas por ninguna pantalla del frontend (`grep -rn "fetch(...api/clases" app features` no devuelve resultados fuera de las propias rutas de API). Documentado como hallazgo de alcance (UX-CLS-007), no como pantalla.

## 5. Mapa PANTALLA → ACCIÓN → API/USECASE → RESULTADO ESPERADO

| Pantalla | Acción | API / Usecase | Resultado esperado |
|---|---|---|---|
| `/clases` | Cargar pantalla | `GET /api/dashboard/clases-hoy` → `obtenerClasesOperativasHoy` → `obtenerClasesOperativas` (reporting dataset, no pasa por `listarClases`/repositorio) | Trae las `ClaseProgramada` de hoy con `coberturaEstado` calculado |
| `/clases` | Click en "· Ver →" / "· Asignar →" | Navegación pura (`router.push`), sin API | Ir al detalle de la incidencia vinculada |
| (implícito, cualquier request autenticada) | Disparo diario de mantenimiento | `withContext.ts` → `resolverClasesVencidasSiCorresponde` → `resolverClasesVencidas` → `resolverClase` (por cada clase vencida) | Clases PROGRAMADA vencidas pasan a DICTADA o SUSPENDIDA según motor de resolución. **Sin ningún resultado visible para el usuario** — no es un endpoint invocado desde la UI, es un side-effect. |
| (sin UI) | `GET /api/clases?...` | `listarClases` (requiere al menos un filtro) | Lista filtrable — no alcanzable desde ninguna pantalla |
| (sin UI) | `PATCH /api/clases/[id]` `{ incidenciaId }` | `actualizarClase` → `resolverClase` | Vincula/desvincula una incidencia a una clase puntual y re-resuelve su estado — no alcanzable desde ninguna pantalla |

## 6. Matriz de acciones críticas

Como anticipa el prompt, esta matriz sale corta: no hay ciclo crear/editar/eliminar en la UI de este módulo. La única "acción crítica" real y visible es la transición automática de estado, que no es iniciada por el usuario sino por el paso del tiempo:

| Acción | Estado inicial | Disparador | Validación | Procesamiento | Éxito/Error | Estado final | Feedback al usuario |
|---|---|---|---|---|---|---|---|
| `resolverClasesVencidas` (automático) | `PROGRAMADA`, `fecha <= hoy` | Primera request autenticada del día para el tenant | Ninguna (no es user-facing) | Recorre clases vencidas, aplica `resolverEstadoYCausa` una por una | Errores se atrapan y solo se loguean (`console.error`), nunca propagan al request real | `DICTADA` o `SUSPENDIDA` (con causa `PERIODO_OPERATIVO`/`CALENDARIO_ESCOLAR`/`NINGUNA`) | **Ninguno.** Ver UX-CLS-003. |
| Navegar a incidencia desde `/clases` | — | Click en el link | Solo se muestra si `clase.incidencia != null` | `router.push` | No aplica (navegación pura) | No aplica | Adecuado — no requiere feedback adicional |

No se evaluaron `PATCH /api/clases/[id]` ni `listarClases` en esta matriz como "acción crítica del usuario" porque no son alcanzables desde ninguna pantalla — están documentados como hallazgo de alcance (UX-CLS-007), no como ciclo de acción real.

## 7. Hallazgos

### UX-CLS-001 — La pantalla de clases no tiene filtro de fecha ni vista semanal: solo muestra "hoy"
**Prioridad:** P1  **Tipo:** ESTADO / NAVEGACIÓN  **Fuente:** código (inferido)
**Pantalla:** `/clases`
**Acción:** cargar la pantalla, buscar cómo ver clases de otro día o de la semana.
**Resultado esperado:** dado que el modelo soporta rangos de fecha (`listarClases` acepta `fecha_desde`/`fecha_hasta`, `obtenerClasesOperativas` acepta cualquier rango) y el propio prompt de esta auditoría describe la pantalla como "listado de clases del día/semana con sus filtros", se esperaría al menos un selector de fecha o una vista de rango.
**Resultado actual:** `ClasesPage` llama exclusivamente a `/api/dashboard/clases-hoy`, que internamente usa `obtenerClasesOperativasHoy` con el rango fijo "hoy 00:00 a hoy 23:59 UTC" (`obtenerClasesOperativas.ts:168-177`). No hay ningún `useState` de fecha, ni `<input type="date">`, ni control de navegación temporal en `page.tsx`. El backend soporta filtros por fecha, unidad, comisión, asignación, estado (`listarClases.ts`), pero no están conectados a ninguna UI.
**Evidencia:** `app/protected/dashboard/clases/page.tsx:39-58` (única llamada `fetch`), comparado con `lib/usecases/clases/listarClases.ts:22-47` (acepta rango y filtros) y `lib/reporting/datasets/obtenerClasesOperativas.ts:64-68` (`obtenerClasesOperativas` acepta cualquier `desde`/`hasta`, solo el atajo "Hoy" está expuesto).
**Impacto para el usuario:** no hay forma de consultar, desde esta pantalla, qué clases hubo ayer, qué clases hay programadas para mañana o la semana próxima, ni de revisar el historial de una asignación puntual. Para cualquier consulta fuera de "hoy", el usuario no tiene ruta en la UI.
**Recomendación:** (no implementar) definir si esto es una decisión de producto deliberada (la pantalla es explícitamente "operación diaria") o una funcionalidad faltante; si es lo segundo, conectar un selector de fecha/rango a los filtros que `listarClases` ya soporta.

### UX-CLS-002 — La `Causa` de una clase suspendida/reemplazada no se muestra en esta pantalla (confirma #138 / UX-PER-004)
**Prioridad:** P0  **Tipo:** FEEDBACK AUSENTE / ESTADO  **Fuente:** código (inferido)
**Pantalla:** `/clases`
**Acción:** ver una fila con `Estado = SUSPENDIDA` sin incidencia vinculada.
**Resultado esperado:** dado que `resolucionClaseService.ts` calcula y persiste una `Causa` explícita para cada clase (`INCIDENCIA`, `PERIODO_OPERATIVO`, `CALENDARIO_ESCOLAR`, `NINGUNA`), y esta es precisamente la pantalla candidata natural para mostrarla (la única que lista `ClaseProgramada` con su estado), se esperaría que el usuario pudiera distinguir por qué una clase está suspendida.
**Resultado actual:** el tipo `Clase` del frontend (`page.tsx:9-24`) no incluye el campo `causa`. Más arriba en la cadena, `ClaseOperativa` (`obtenerClasesOperativas.ts:4-42`) tampoco lo declara ni lo devuelve — el objeto que arma el `map` final (líneas 129-158) omite `clase.causa` aunque la fila de Prisma sí lo trae (el `include` sin `select` a nivel raíz trae todos los escalares del modelo, incluida `causa`). El campo se descarta antes de llegar a la API. Para una fila `SUSPENDIDA` sin incidencia asociada (causa real: cierre de período o feriado), la columna "Estado" solo dice "SUSPENDIDA" y la columna "Incidencia" muestra "—" — no hay ningún otro dato en la fila que explique el motivo.
**Evidencia:** `lib/reporting/datasets/obtenerClasesOperativas.ts:129-158` (mapeo que omite `causa`); `app/protected/dashboard/clases/page.tsx:9-24` (tipo `Clase` sin `causa`); comparar con `lib/services/resolucionClaseService.ts:33-55` (`resolverEstadoYCausa`, donde `causa` se calcula explícitamente). **Cruce directo con #138 / UX-PER-004** (`docs/auditoria-ux-periodos-calendario-2026-09-01.md:115-122`), que ya documentó esto como hallazgo transversal desde el lado de Períodos Operativos — acá se confirma concretamente que ni siquiera la pantalla dedicada a listar clases lo resuelve.
**Impacto para el usuario:** un preceptor o directivo que mira esta pantalla no puede distinguir, para una clase suspendida, si fue por un feriado, por el cierre de un período operativo, o por otro motivo — la única causa que sí es indirectamente visible es `INCIDENCIA` (porque en ese caso hay un link a la incidencia). Las otras dos causas de suspensión que se originan exclusivamente en este módulo (`PERIODO_OPERATIVO`, `CALENDARIO_ESCOLAR`) quedan invisibles.
**Recomendación:** (no implementar) agregar `causa` al `ClaseOperativa` y al tipo `Clase` del frontend, y mostrarla como texto/tooltip junto al badge de estado (mismo lugar que ya resolvería #138).

### UX-CLS-003 — El mecanismo automático `resolverClasesVencidas` es completamente invisible para el usuario
**Prioridad:** P1  **Tipo:** FEEDBACK AUSENTE  **Fuente:** código (inferido)
**Pantalla:** transversal — se dispara en cualquier request autenticada, no en una pantalla específica.
**Acción:** ninguna acción de usuario; es un side-effect de `withContext.ts` en la primera request del día por institución.
**Resultado esperado:** dado que este mecanismo puede cambiar masivamente el estado de clases (de `PROGRAMADA` a `DICTADA` o `SUSPENDIDA`) sin que nadie lo dispare explícitamente, se esperaría al menos algún rastro accesible desde la UI (un log, un badge "actualizado hoy a las...", o un resumen post-carga tipo "se resolvieron N clases vencidas").
**Resultado actual:** `resolverClasesVencidasSiCorresponde` (`lib/auth/withContext.ts:48-69`) corre silenciosamente antes de cualquier handler; el resultado de `resolverClasesVencidas` (`{ clasesRevisadas, clasesMarcadasDictadas }`) se calcula pero **no se devuelve a ningún lado** — `withContext` no lo expone en la respuesta HTTP, y no hay ningún endpoint ni pantalla que lo consulte después. Si falla, el error se loguea con `console.error` y se traga (`catch` sin relanzar, líneas 63-68) para no tumbar el request real — decisión de diseño razonable para no romper la app, pero significa que un fallo silencioso en la resolución diaria **nunca llega al usuario ni queda visible en ninguna pantalla**.
**Evidencia:** `lib/auth/withContext.ts:48-69`, `lib/usecases/clases/resolverClasesVencidas.ts:16-37` (retorna datos que nadie lee).
**Impacto para el usuario:** el usuario no tiene forma de saber, mirando la app, que sus clases de ayer "ya se resolvieron solas" hoy a la mañana, ni de detectar si ese proceso falló silenciosamente para su institución. La única señal indirecta es notar que el estado de una clase cambió entre dos visitas a la pantalla.
**Recomendación:** (no implementar) al menos loguear a un canal observable (no solo `console.error` del proceso Next.js) los fallos de `resolverClasesVencidas`; evaluar si vale la pena exponer un resumen ("N clases se marcaron dictadas automáticamente hoy") en el dashboard.

### UX-CLS-004 — El badge de "Estado" no tiene color ni diferenciación visual entre PROGRAMADA / DICTADA / SUSPENDIDA / REEMPLAZADA, y no hay leyenda
**Prioridad:** P1  **Tipo:** ESTADO / CONSISTENCIA  **Fuente:** código (inferido)
**Pantalla:** `/clases`
**Acción:** mirar la columna "Estado" de la tabla.
**Resultado esperado:** dado que el objetivo explícito de esta pantalla es que el usuario entienda de un vistazo en qué estado está cada clase, y que existen 4 estados con implicancias operativas muy distintas (una `SUSPENDIDA` no requiere acción si es un feriado, pero si es `SIN_COBERTURA` sí urge cubrirla), se esperaría alguna codificación visual (color, ícono) y/o una leyenda que explique qué significa cada estado.
**Resultado actual:** el badge de estado (`page.tsx:133-137`) usa el mismo estilo para los 4 valores posibles: `border: 1px solid var(--color-border)`, sin `background` ni `color` condicional — solo cambia el texto (`PROGRAMADA`, `DICTADA`, `SUSPENDIDA`, `REEMPLAZADA`, tal cual el valor crudo del enum, sin traducir). No hay ningún elemento de leyenda en la pantalla. En contraste, la tarjeta de métrica "Sin cobertura" sí usa color condicional (rojo si `> 0`, verde si `0`) — la pantalla aplica color a una métrica agregada pero no al dato principal de cada fila.
**Evidencia:** `app/protected/dashboard/clases/page.tsx:133-137` (badge) vs. líneas 93-98 (tarjetas de métricas, con color condicional solo en una de las cuatro).
**Impacto para el usuario:** para distinguir estados, el usuario debe leer el texto de cada fila una por una; no hay escaneo visual rápido posible (ej. "ver de un vistazo cuántas filas están en rojo"). Esto se agrava porque el estado mostrado tampoco distingue la causa (UX-CLS-002): dos filas `SUSPENDIDA` visualmente idénticas pueden requerir acciones completamente distintas (ninguna, si es un feriado; asignar reemplazo, si en verdad la cobertura real es `SIN_COBERTURA` por incidencia — aunque en ese caso hay un link de "Asignar →" que sí ayuda).
**Recomendación:** (no implementar) aplicar color/ícono consistente por estado (y opcionalmente por `coberturaEstado`, que ya se calcula en el backend pero no se usa para estilizar la fila), y agregar una leyenda breve.

### UX-CLS-005 — Sin manejo de error visible: si falla la carga, la pantalla se ve igual que "no hay clases"
**Prioridad:** P1  **Tipo:** ERROR NO INFORMADO  **Fuente:** código (inferido)
**Pantalla:** `/clases`
**Acción:** cargar la pantalla cuando `GET /api/dashboard/clases-hoy` falla (500, red caída, etc.).
**Resultado esperado:** un error de carga debería distinguirse visualmente de "no hay clases programadas para hoy" — son dos situaciones con significado muy distinto para el usuario.
**Resultado actual:** `cargarClases()` (`page.tsx:39-58`) atrapa cualquier error, hace `console.error(error)` y `setClases([])`. La tabla renderiza entonces la misma fila que en el caso de éxito sin datos: `"No hay clases para mostrar"` (línea 126). No hay ningún estado de error distinto, ni un botón "Reintentar".
**Evidencia:** `app/protected/dashboard/clases/page.tsx:39-58` (catch que solo loguea a consola) y `123-127` (el `ternary` de la tabla no distingue error de vacío real).
**Impacto para el usuario:** si el backend falla (por ejemplo, un error 500 en `obtenerClasesOperativasHoy`), el usuario ve "No hay clases para mostrar hoy" — un mensaje que sugiere tranquilamente que no hay nada que atender, cuando en realidad la información no pudo cargarse. Esto es particularmente riesgoso porque esta pantalla es la fuente principal para detectar "clases sin cobertura hoy" (ver enlaces desde el dashboard, `app/protected/dashboard/page.tsx:192,196`) — un falso "no hay nada" podría hacer que una ausencia real pase desapercibida.
**Recomendación:** (no implementar) diferenciar el estado de error del estado vacío, con mensaje explícito y opción de reintentar.

### UX-CLS-006 — Sin verificación de rol visible en esta pantalla (mismo patrón que UX-PER-012)
**Prioridad:** P2  **Tipo:** PERMISOS  **Fuente:** código (inferido) — RIESGO / NO CONFIRMADO
**Pantalla:** `/clases`
**Acción:** cualquiera.
**Resultado esperado:** dado que la pantalla expone información operativa sensible de toda la institución (quién falta, quién cubre, qué clases están suspendidas), sería razonable esperar algún control de rol, o al menos que quede documentado que cualquier usuario autenticado la puede ver.
**Resultado actual:** igual que lo ya documentado en UX-PER-012, `withContext.ts` solo valida `x-user-id`/`x-tenant-id` numéricos, sin rol; no se identificó el proxy que inyecta esos headers dentro de los límites de este módulo. **RIESGO / NO CONFIRMADO** — no se puede determinar sin ver el middleware/proxy real si hay control de rol antes de llegar a esta ruta.
**Evidencia:** `lib/auth/withContext.ts:71-93`, mismo patrón ya señalado en `docs/auditoria-ux-periodos-calendario-2026-09-01.md` (UX-PER-012).
**Impacto para el usuario:** no confirmado — depende de la capa de proxy fuera de alcance.
**Recomendación:** (no implementar) mismo tratamiento que UX-PER-012: confirmar contra el proxy real.

### UX-CLS-007 — Existe una API completa de listado/edición de clases sin ningún consumidor en el frontend
**Prioridad:** P2  **Tipo:** CONSISTENCIA  **Fuente:** código (inferido)
**Pantalla:** ninguna (hallazgo de alcance/arquitectura, no de una pantalla puntual).
**Acción:** ninguna — es sobre superficie de API no usada.
**Resultado esperado:** un endpoint de escritura (`PATCH /api/clases/[id]`, que permite vincular/desvincular una `incidenciaId` a una clase puntual) debería tener un flujo de UI que lo dispare, o estar claramente marcado como reservado para uso interno/futuro.
**Resultado actual:** `GET /api/clases` (con filtros ricos: `asignacionId`, `moduloId`, `unidadId`, `comisionId`, `estado`, rango de fechas), `GET /api/clases/[id]` y `PATCH /api/clases/[id]` no tienen ningún `fetch` correspondiente en `app/` ni `features/` (búsqueda `grep -rn "fetch(...api/clases" app features` sin resultados). El propio comentario de `actualizarClase.ts:17-24` confirma que el campo `estado` se sacó del body porque "era un bypass sin ningún consumidor real" tras una revisión previa (`punto-de-partida-clase-programada-2026-07-27.md`) — pero el endpoint entero sigue sin consumidor, solo se le sacó ese campo puntual.
**Evidencia:** `app/api/clases/route.ts`, `app/api/clases/[id]/route.ts`, `lib/usecases/clases/{listarClases,obtenerClase,actualizarClase}.ts`; ausencia de referencias en el frontend.
**Impacto para el usuario:** ninguno directo (no es user-facing), pero implica que la única forma real de vincular/desvincular una incidencia a una clase puntual desde la UI es indirecta (a través del flujo de Incidencias, no desde este módulo) — y que el "listado con filtros" que un lector del modelo de datos esperaría encontrar en `/clases` en realidad ya está construido en el backend pero nunca se conectó a una pantalla.
**Recomendación:** (no implementar) decidir si este endpoint se conecta a una futura vista de filtros en `/clases` (ver UX-CLS-001, es la misma pieza faltante) o si se documenta como deliberadamente sin UI.

### UX-CLS-008 — Los campos `observacion` y `articulo` de la incidencia se traen del backend pero no se muestran en ninguna parte de la fila
**Prioridad:** P3  **Tipo:** CONSISTENCIA  **Fuente:** código (inferido)
**Pantalla:** `/clases`
**Acción:** ver la columna "Incidencia" de una fila con incidencia vinculada.
**Resultado esperado:** si el backend devuelve `observacion` y `articulo` (código del artículo del codigario) para cada incidencia vinculada, se esperaría que la UI los use en algún lado (tooltip, texto secundario).
**Resultado actual:** el tipo `Clase` (`page.tsx:21`) declara `incidencia: { id, observacion, articulo }`, pero el render (`page.tsx:144-157`) solo usa `clase.incidencia.id` en el texto del botón (`#{id}`). `observacion` y `articulo` nunca se leen.
**Evidencia:** `app/protected/dashboard/clases/page.tsx:21` vs. `144-157`.
**Impacto para el usuario:** ninguno funcional — es una oportunidad perdida menor (esos datos ya viajan por la red y podrían ahorrar un click a "Ver →" si se mostraran como tooltip), no un defecto.
**Recomendación:** (no implementar) evaluar si vale la pena mostrar `articulo`/`observacion` como tooltip sobre el botón, o quitar los campos del tipo si deliberadamente no se van a usar.

## 8. Pantallas auditadas sin problemas relevantes

- **Estados de carga y vacío básicos** ("Cargando clases...", "No hay clases para mostrar" en el caso genuinamente vacío): el texto es claro y en español, aunque colisiona con el caso de error (ver UX-CLS-005).
- **Diferenciación de la acción en el link de incidencia** ("· Asignar →" para `SIN_COBERTURA` vs. "· Ver →" para el resto): buen patrón — el verbo cambia según si hay algo pendiente de resolver o solo se está consultando un registro histórico.
- **`resolverClase` es idempotente y re-evaluable en cualquier momento** (comentario en `resolucionClaseService.ts:127-133`): decisión de diseño correcta y bien documentada — una clase `DICTADA` puede corregirse a `SUSPENDIDA`/`REEMPLAZADA` si aparece una incidencia tardía, pero nunca vuelve sola a `PROGRAMADA`. No es user-facing directamente, pero es una garantía de consistencia de datos que sostiene todo lo que sí se muestra en pantalla.
- **`titularVigenteEn`** (`obtenerClasesOperativas.ts:49-57`): busca correctamente el titular vigente *en la fecha de la clase*, no el titular actual — evita mostrar datos históricamente incorrectos si hubo un cambio de titularidad después.

## 9. Áreas que no pudieron verificarse

- **Toda prueba en vivo** (ver la pantalla real renderizada, verificar colores reales de los badges, probar el link a incidencia con datos reales, confirmar el comportamiento del disparo diario de `resolverClasesVencidas` con datos del tenant de prueba `Escuela Primaria N°12`): no hubo herramienta de navegador disponible en esta sesión pese a que el dev server está corriendo. Se recomienda repetir la verificación visual en una sesión con navegador para confirmar UX-CLS-004 (contraste/legibilidad real de los badges) y UX-CLS-005 (mensaje real que ve el usuario ante un error de red).
- **Control de rol en el proxy upstream** (UX-CLS-006): mismo límite ya documentado en UX-PER-012, el archivo del proxy no está dentro de los módulos revisados.
- **Volumen real de datos por día**: no se pudo confirmar si la ausencia de paginación en la tabla (`/clases`) es un problema real en instituciones grandes, o si el volumen de "clases de un solo día" siempre es manejable. No se abrió como hallazgo separado por falta de evidencia de volumen real.
- **Comportamiento exacto cuando `resolverClasesVencidas` tarda mucho** (institución con muchísimas clases vencidas acumuladas, ej. tras un período de inactividad prolongado del sistema): el bucle en `resolverClasesVencidas.ts:32-35` resuelve una por una de forma secuencial, dentro del mismo request que lo dispara (`withContext`). No se pudo estimar el impacto en latencia del primer request del día sin datos reales de volumen — **RIESGO / NO CONFIRMADO**.

## 10. Lista priorizada de correcciones (sin implementar)

1. **UX-CLS-002 (P0)** — exponer `causa` desde `obtenerClasesOperativas` hasta la UI y mostrarla junto al estado. Es la pieza que resolvería #138/UX-PER-004 en la pantalla donde naturalmente corresponde.
2. **UX-CLS-001 (P1)** — decidir si la ausencia de filtro de fecha/vista semanal es una decisión de producto o una funcionalidad pendiente; si es lo segundo, conectar los filtros que `listarClases` ya soporta.
3. **UX-CLS-003 (P1)** — dar visibilidad (al menos en logs observables, idealmente en UI) al resultado de `resolverClasesVencidas`.
4. **UX-CLS-004 (P1)** — codificación visual (color/ícono) por estado + leyenda.
5. **UX-CLS-005 (P1)** — diferenciar estado de error del estado "vacío real" en la tabla.
6. **UX-CLS-006 (P2, condicionado)** — confirmar control de rol contra el proxy real (mismo ítem que UX-PER-012, se resuelve una sola vez para ambos módulos).
7. **UX-CLS-007 (P2)** — decidir destino del API `GET/PATCH /api/clases` sin consumidor: conectarlo a una futura vista de filtros o documentarlo como deliberado.
8. **UX-CLS-008 (P3)** — usar o quitar `observacion`/`articulo` del tipo `Clase` del frontend.
