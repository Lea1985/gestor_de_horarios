# Auditoría UX Funcional y Operativa — Módulo Distribuciones horarias

**Fecha:** 2026-08-31
**Alcance:** exclusivamente el módulo Distribuciones horarias (4 de 10 auditorías por módulo). No se auditan Asignaciones, Incidencias, Reemplazos ni ClaseProgramada, salvo en la medida en que Distribuciones los invoca directamente (suspensión/generación de clases, migración de reemplazos al cambiar módulos o crear versión).

---

## 1. Resumen ejecutivo

El módulo tiene 3 pantallas reales (listado, edición dedicada huérfana, y asignación de módulos por versión) sobre 4 endpoints bien tipados. La lógica de negocio (versionado, suspensión de clases sin borrarlas, detección de reemplazos afectados) está cuidadosamente diseñada y en general bien explicada en los modales — es, en varios aspectos, más prolija que lo visto en Asignaciones. Sin embargo, la auditoría encontró **2 hallazgos P0** que afectan directamente el eje pedido por este prompt (crear nueva versión, eliminar distribución):

1. **El botón principal "+ Nueva distribución" del listado es inutilizable en el caso más común** — cualquier asignación que ya tenga una distribución activa de vigencia indefinida (que es la situación normal después de la primera carga) siempre falla con un error de solapamiento de fechas, y nada en la pantalla explica que el camino correcto para agregar una versión es un botón completamente distinto, ubicado en otra pantalla ("Nueva versión" dentro de `/modulos`).
2. **Editar "Vigencia desde" en la pantalla de detalle de una distribución no tiene ningún efecto real**: el campo se muestra como obligatorio, se envía al backend, el backend responde éxito y el frontend navega como si el cambio se hubiera aplicado — pero el caso de uso que procesa el `PATCH` ignora ese campo por diseño explícito (comentado en el propio código) sin decírselo a nadie.

A esto se suma el eje específico que pedía este prompt sobre cargos no-frente-a-curso: **la pantalla de asignación de módulos no distingue en absoluto un cargo docente de uno jornalizado (preceptor/secretario/director)** — seleccionar "todos los módulos del día" para habilitar reemplazos de un director se ve exactamente igual, con el mismo texto y sin ninguna aclaración, que armar el horario real de un docente frente a curso. Este gap ya fue identificado y parcialmente resuelto por el equipo (tarea #75, cerrada 20/08/2026) pero **solo del lado de los consumidores de los datos** (Dashboard, reportes de liquidación) — la pantalla donde se cargan esos módulos, que es la que audita este informe, nunca se tocó.

También se encontraron gaps de feedback de carga (doble-click posible en la confirmación de eliminar con reemplazo activo, mientras el mismo patrón sí está bien resuelto en el flujo de módulos), un modal reutilizado con texto que no corresponde a lo que realmente pasa en el flujo de "Nueva versión", y una discrepancia entre lo que documenta `docs/flujo_nueva_version_distribucion.md` (transacción única, validación de "operación en curso") y lo que el código realmente implementa.

## 2. Rama y commit auditado; acceso a navegador

- **Rama:** `refactor-clases-programadas-frontend`
- **Commit:** `53b013cff5108d69c8fdbd8b4c9f71038009bebc`
- **Acceso a navegador:** el dev server de Next (`next dev`) está corriendo en `localhost:3000` (verificado con `curl` → `200`), pero **no hay ninguna herramienta de navegador/interacción disponible en este entorno**. No se pudo iniciar sesión ni ejecutar el flujo real, y no se generaron datos de prueba en ningún tenant (ni siquiera en Escuela Primaria N°12). Todos los hallazgos están marcados **"Fuente: código (inferido)"**. Donde el comportamiento en runtime real podría diferir de lo que el código sugiere, se marca explícitamente **RIESGO / NO CONFIRMADO**.

## 3. Alcance auditado (rutas confirmadas en el repo)

Pantallas:
- `app/protected/dashboard/distribuciones/page.tsx` — listado
- `app/protected/dashboard/distribuciones/[id]/page.tsx` — edición dedicada de una distribución puntual (confirmado **huérfana**, ver UX-DIS-007)
- `app/protected/dashboard/distribuciones/[id]/modulos/page.tsx` — asignación de módulos por día

API:
- `app/api/distribuciones/route.ts` (GET listar, POST crear)
- `app/api/distribuciones/[id]/route.ts` (GET obtener, PATCH actualizar, DELETE eliminar)
- `app/api/distribuciones/[id]/modulos/route.ts` (POST asignar módulos)
- `app/api/distribuciones/[id]/nueva-version/route.ts` (POST crear nueva versión)

Use cases: `lib/usecases/distribuciones/{crearDistribucion, actualizarDistribucion, eliminarDistribucion, listarDistribuciones, obtenerDistribucion, nuevaVersionDistribucion, asignarModulos}.ts`

Repositorio: `lib/repositories/distribucionRepository.ts`

Modelos: `DistribucionHoraria`, `DistribucionModulo` (`prisma/schema.prisma:384-420`)

Fuera de alcance (mencionados solo como contexto o consumidores):
- `app/protected/dashboard/modulosHorarios/**` y `features/modulosDistribucion` en su rol de catálogo de `ModuloHorario` — es la configuración institucional de franjas horarias (un modelo distinto, reutilizable por múltiples distribuciones), no la asignación de módulos a una distribución puntual. La pantalla `/modulos` sí se audita en profundidad porque ahí es donde se hace la asignación real por distribución.
- `features/asignaciones/components/DistribucionesCard.tsx` — tarjeta de solo lectura en el detalle de Asignaciones que enlaza a `/modulos`; ya cubierta como consumidor en `docs/auditoria-ux-asignaciones-2026-08-30.md`.
- ClaseProgramada, Incidencias, Reemplazos — se mencionan únicamente donde Distribuciones dispara efectos sobre ellos (suspensión, migración de reemplazo).

## 4. Inventario de pantallas

### 4.1 `/protected/dashboard/distribuciones` — Listado
- **Objetivo:** ver todas las distribuciones agrupadas por asignación, crear una nueva, eliminar una versión activa, navegar a "Módulos".
- **Rol esperado:** administrativo/directivo con permiso de gestión de horarios.
- **Acciones disponibles:** "+ Nueva distribución" (formulario inline), buscar por identificador/agente, filtrar por curso/turno/estado, expandir/contraer cada asignación (acordeón de versiones), "Módulos →" por versión, "Eliminar" (solo en la versión ACTIVO).
- **Formulario:** `DistribucionForm` — selecciona asignación (de TODAS las asignaciones, tengan o no distribución previa), fecha de vigencia desde/hasta; muestra un texto informativo "Se creará la versión N".
- **Tabla/acordeón:** `DistribucionList` → `DistribucionRow` — header colapsado muestra identificador, titular, curso, turno, resumen de días (`DiasResumen`) y badge ACTIVO; expandido muestra tabla de versiones con Vigencia desde/hasta, estado y acciones.
- **Modales:** `ModalConfirmar` (paso 1 de eliminar, definido inline en la página) → `ModalEliminarConReemplazo` (paso 2, condicional, si hay reemplazos activos en el tramo).
- **Secciones informativas:** `SinModulosBadges` (distribuciones activas sin módulos, no generan clases) y `SinDistribucionBadges` (asignaciones sin ninguna distribución).
- **Mensajes:** banner de error con botón de cierre; contador de resultados de filtro.

### 4.2 `/protected/dashboard/distribuciones/[id]` — Edición dedicada (huérfana)
- **Objetivo (declarado por el código):** editar vigencia desde/hasta de una distribución puntual, y eliminarla.
- **Rol esperado:** igual que el listado.
- **Acceso real:** **ninguna pantalla de la aplicación enlaza a esta ruta** (búsqueda confirmada en todo `features/` y `app/protected` — ver UX-DIS-007). Solo es alcanzable tipeando la URL directamente.
- **Acciones:** "Guardar cambios" (PATCH vigencia desde/hasta), "Eliminar" (con `ModalConfirmar` propio, duplicado del de la lista), "← Volver" / "Cancelar" (navegan al listado).
- **Formulario:** dos inputs de fecha (`fecha_vigencia_desde` obligatorio, `fecha_vigencia_hasta` opcional).
- **Mensajes:** banner de error; estado "Cargando..." y "Distribución no encontrada" si el `id` no resuelve.

### 4.3 `/protected/dashboard/distribuciones/[id]/modulos` — Asignación de módulos por día
- **Objetivo:** seleccionar qué `ModuloHorario` (día+franja) componen la distribución vigente; crear una nueva versión.
- **Rol esperado:** igual que el listado.
- **Acciones:** "Guardar módulos" (primera carga, sin módulos todavía), "Editar" → "Guardar cambios" / "Cancelar" (versión ya cargada), "Nueva versión".
- **Grilla:** `ModulosGrid` — una columna por día con checkbox "seleccionar todo el día" (tri-estado) y checkbox por módulo individual; deshabilitada si la versión no es ACTIVO o si tiene módulos y no se entró en modo edición.
- **Modales:** `ModalNuevaVersion` (paso 1, texto explicativo de qué va a pasar) → `ModalMigrarReemplazos` (paso 2, condicional, mismo componente reutilizado también en el flujo de editar módulos con `tramoAConfirmar`).
- **Mensajes:** banner "Esta versión está inactiva — solo lectura" si no es ACTIVO; banner de error; aviso informativo si se guardó sin período operativo activo; "✓ Guardado" transitorio.
- **Navegación posterior:** "← Volver a distribuciones"; al crear nueva versión, redirige automáticamente a `/modulos` de la versión nueva.

## 5. Mapa PANTALLA → ACCIÓN → API/USECASE → RESULTADO ESPERADO

| Pantalla | Acción | API / UseCase | Resultado esperado |
|---|---|---|---|
| Listado | Crear distribución | `POST /api/distribuciones` → `crearDistribucion` | Crea `DistribucionHoraria` (versión calculada en el backend); genera `ClaseProgramada` si hay período ACTIVO solapado; refresca lista y expande el grupo |
| Listado | Eliminar (paso 1) | `DELETE /api/distribuciones/[id]` sin body → `eliminarDistribucion` | Si hay clases con reemplazo en el tramo futuro del período ACTIVO, responde `200 { requiereConfirmacion:true, tramos }` (no borra nada todavía); si no, soft-delete directo |
| Listado | Eliminar (paso 2, confirmar) | `DELETE /api/distribuciones/[id]` con `{ mantenerReemplazo:false }` → `eliminarDistribucion` | Soft-delete (`deletedAt`), suspende (no borra) las `ClaseProgramada` futuras del tramo |
| Edición huérfana | Guardar cambios | `PATCH /api/distribuciones/[id]` → `actualizarDistribucion` | Solo actualiza `estado`/`fecha_vigencia_hasta`; **`fecha_vigencia_desde` se ignora siempre** (ver UX-DIS-002) |
| Edición huérfana | Eliminar | `DELETE /api/distribuciones/[id]` sin manejar `requiereConfirmacion` | Ver UX-DIS-007 — puede "tener éxito" en la UI sin haber borrado nada |
| Módulos | Guardar módulos (primera vez o edición) | `POST /api/distribuciones/[id]/modulos` → `asignarModulos` | Guarda `DistribucionModulo`; si hay período ACTIVO, suspende clases que ya no corresponden y genera las nuevas del tramo; puede requerir confirmación de reemplazo |
| Módulos | Nueva versión | `POST /api/distribuciones/[id]/nueva-version` → `nuevaVersionDistribucion` | Cierra la versión actual (`fecha_vigencia_hasta`=ayer, `INACTIVO`), crea una versión nueva vacía (`ACTIVO`), suspende clases futuras de la vieja; redirige a `/modulos` de la nueva |

## 6. Matriz de acciones críticas (ciclo completo)

| Acción | Estado inicial | Validación | Feedback éxito | Feedback error | Reversible desde UI |
|---|---|---|---|---|---|
| Crear distribución | Formulario vacío | Frontend: asignación y fecha desde requeridas (HTML/JS); Backend: fechas, existencia de asignación, versión duplicada, solapamiento de rango | Cierra formulario, refresca lista, expande el grupo (sin mensaje de éxito explícito) | `setError` con mensaje del backend; formulario permanece abierto con datos cargados | Eliminar (soft, sin reactivar — ver UX-DIS-008) |
| Editar vigencia (huérfana) | Formulario precargado | Frontend: "Requerido" en desde | Navega al listado (sin mensaje de éxito, y **sin haber cambiado `fecha_vigencia_desde`** — UX-DIS-002) | `setError`; formulario sigue montado | N/A |
| Eliminar (listado) | — | Backend: detecta reemplazos activos en el tramo futuro → pide confirmación | Cierra modal, refresca lista | `setError`; modal se cierra igual | No hay reactivar (UX-DIS-008); botón de confirmación nunca refleja carga real (UX-DIS-005) |
| Eliminar (huérfana) | — | Backend igual que arriba, pero **el cliente no lee el flag** | Navega al listado como si hubiera borrado, aun si no borró nada | Solo si `res.ok` es `false` (nunca ocurre en este endpoint) | N/A — ver UX-DIS-007 |
| Guardar módulos | Grilla con selección | Backend: módulos existen en la institución; si hay período ACTIVO y reemplazo cubre el tramo, pide confirmación | "✓ Guardado" + aviso si no hay período activo | `setError` con mensaje del backend | Deshacer manualmente (volver a tildar) antes de guardar; después de guardar, solo reeditando |
| Nueva versión | Versión activa con módulos | Backend: si hay reemplazo en el tramo futuro, pide confirmación | Redirige a `/modulos` de la nueva versión (vacía) | `setError`; modal se cierra, `modalVersion` sigue abierto para reintentar | No — cerrar la versión anterior es permanente (no hay "revertir nueva versión") |

## 7. Hallazgos

### P0

#### UX-DIS-001 — "+ Nueva distribución" falla siempre para el caso normal (asignación con distribución activa), sin indicar el camino correcto
**Prioridad:** P0  **Tipo:** FORMULARIO / VALIDACIÓN DE NEGOCIO / NAVEGACIÓN / MENSAJE
**Fuente:** código (inferido)
**Pantalla:** Listado (`DistribucionForm`)
**Acción:** Crear distribución para una asignación que ya tiene una distribución activa
**Resultado esperado:** El formulario permite elegir cualquier asignación de la lista completa (`asignaciones`, no `asignacionesSinDist` — `DistribucionForm.tsx:83-90`) y promete explícitamente "Se creará la versión N" (`DistribucionForm.tsx:99-115`), dando a entender que la operación va a funcionar.
**Resultado actual:** `distribucionRepository.verificarSolapamiento` (`lib/repositories/distribucionRepository.ts:99-134`) compara el rango nuevo contra **todas** las distribuciones existentes de la asignación, usando `dFin = d.fecha_vigencia_hasta ?? new Date("9999-12-31")` cuando la vigencia es indefinida (línea 129). Toda distribución activa creada por el flujo recomendado (`nuevaVersionDistribucion.ts:102-109`, sin `fecha_vigencia_hasta`) queda con vigencia indefinida. En consecuencia, **cualquier intento de crear una distribución nueva para esa asignación desde este formulario solapa siempre** y el backend responde `409 SolapamientoError` con el mensaje "Existe una distribución activa en ese rango de fechas" (`crearDistribucion.ts:23-25,60-61`), mostrado tal cual en el banner de error (`useDistribuciones.ts:173-174`). El único camino que sí funciona — el botón "Nueva versión" dentro de `/modulos` de la distribución actual, que primero cierra la vieja y después crea la nueva (`nuevaVersionDistribucion.ts`) — está en una pantalla distinta, sin ningún enlace cruzado ni mención desde el listado o el formulario.
**Evidencia:** `features/distribuciones/components/DistribucionForm.tsx:69-115`; `lib/repositories/distribucionRepository.ts:99-134`; `lib/usecases/distribuciones/crearDistribucion.ts:23-25,55-61`; `lib/usecases/distribuciones/nuevaVersionDistribucion.ts:102-109`; `features/distribuciones/hooks/useDistribuciones.ts:159-178`
**Impacto para el usuario:** El botón más visible y "obvio" del módulo para la tarea que el propio prompt de esta auditoría identifica como núcleo del módulo ("crear una nueva versión") es, en la práctica, una trampa: funciona únicamente la primera vez que se carga una distribución para una asignación nueva. A partir de la segunda vez, todo intento termina en un error técnico sin pista de cómo resolverlo, y el operador no tiene forma de saber — sin leer el código — que el flujo correcto vive en otro lugar.
**Recomendación:** Si la asignación seleccionada ya tiene una distribución activa, deshabilitar o advertir en el propio formulario ("Esta asignación ya tiene una distribución activa. Para crear una nueva versión, andá a Módulos → Nueva versión") en vez de dejar que falle en el backend; o unificar ambos flujos en un solo punto de entrada. (NO implementar — requiere decisión de producto sobre si deben existir dos flujos de creación distintos.)

---

#### UX-DIS-002 — Editar "Vigencia desde" no tiene ningún efecto: el backend lo ignora silenciosamente y la UI confirma éxito
**Prioridad:** P0  **Tipo:** FORMULARIO / ERROR NO INFORMADO / VALIDACIÓN DE NEGOCIO
**Fuente:** código (inferido)
**Pantalla:** `/distribuciones/[id]` (edición dedicada — ver también UX-DIS-007 sobre su alcance real)
**Acción:** Editar "Vigencia desde" y guardar
**Resultado esperado:** Un campo marcado como obligatorio (asterisco rojo, `app/protected/dashboard/distribuciones/[id]/page.tsx:191`), con validación de "Requerido" si se lo vacía, que se envía al backend en el `PATCH` (línea 106: `fecha_vigencia_desde: form.fecha_vigencia_desde`) debería, como mínimo, o bien aplicarse, o bien devolver un error explicando por qué no se puede editar.
**Resultado actual:** `actualizarDistribucion.ts` arma el objeto `data` leyendo únicamente `body.version`, `body.estado` y `body.fecha_vigencia_hasta` (`lib/usecases/distribuciones/actualizarDistribucion.ts:26-30`) — **`body.fecha_vigencia_desde` nunca se lee**. El propio comentario del archivo lo confirma como decisión deliberada: *"fecha_vigencia_desde NO se edita acá a propósito: cambiarla implica reubicar clases ya generadas..."* (líneas 31-33). Pero el frontend no lo sabe: envía el campo igual, el backend responde `200` con el objeto actualizado (que conserva la fecha vieja), y `guardar()` en el cliente solo mira `res.ok` antes de navegar (`[id]/page.tsx:110-112`) — nunca compara el valor devuelto contra lo que el usuario tipeó.
**Evidencia:** `app/protected/dashboard/distribuciones/[id]/page.tsx:97-118` (formulario y envío); `lib/usecases/distribuciones/actualizarDistribucion.ts:21-38` (campos leídos y comentario explicativo)
**Impacto para el usuario:** Un operador que corrige una fecha de vigencia mal cargada ve "éxito" (navega sin error) y cree que quedó corregida. La próxima vez que entre a esa distribución (si llega a la pantalla — ver UX-DIS-007) va a encontrar la fecha vieja, sin ninguna pista de por qué "no se guardó". Es exactamente el patrón "el backend no aplicó el cambio pero nada lo dice".
**Recomendación:** O bien quitar el campo del formulario (si de verdad no es editable), o bien mostrar un error explícito si se intenta cambiar ("La fecha de inicio no se puede editar una vez creada la distribución"), en vez de aceptar el valor y descartarlo en silencio. (NO implementar.)

### P1

#### UX-DIS-003 — Guardar cambios de módulos puede suspender clases futuras sin ningún aviso previo cuando no hay reemplazo detectado
**Prioridad:** P1  **Tipo:** ACCIÓN DESTRUCTIVA / FEEDBACK AUSENTE
**Fuente:** código (inferido)
**Pantalla:** `/distribuciones/[id]/modulos` — modo edición
**Acción:** Destildar uno o más módulos/días y hacer clic en "Guardar cambios"
**Resultado esperado:** Suspender clases ya programadas (aunque sea reversible, causa `CAMBIO_DISTRIBUCION`) es una consecuencia con peso suficiente como para que el usuario la vea venir antes de confirmar, sobre todo si esas clases no tienen reemplazo (es decir, son el dictado normal del titular).
**Resultado actual:** `guardar()` en `useModulosDistribucion.ts:110-138` llama a `modulosDistribucionService.guardarModulos` directamente al hacer clic en "Guardar cambios" (sin modal previo). El backend (`asignarModulos.ts:95-102`) solo interrumpe para pedir confirmación (`requiereConfirmacion`) **si el tramo tiene reemplazos activos** (`tramos.length > 0`). Si las clases que se van a suspender no tienen ningún reemplazo asociado (el caso más común: el titular simplemente dicta esos módulos), `asignarModulos` sigue de largo, suspende esas clases (paso 3b, líneas 113-123) y genera las nuevas (paso 5) sin que el usuario haya visto ningún resumen de "vas a suspender clases de tal día". El único feedback posterior es "✓ Guardado" (`ModulosHeader.tsx:87-91`).
**Evidencia:** `features/modulosDistribucion/hooks/useModulosDistribucion.ts:110-138`; `lib/usecases/distribuciones/asignarModulos.ts:95-123`; `features/modulosDistribucion/components/ModulosHeader.tsx:84-97`
**Impacto para el usuario:** Un click en "Guardar cambios" después de destildar un día por error (o por malentender qué representa el checkbox) suspende clases reales sin ningún paso intermedio de confirmación, salvo en el subconjunto de casos donde hay un reemplazo activo cubriendo el tramo completo. La reversibilidad existe (se puede volver a tildar y guardar), pero el usuario no tiene forma de saberlo en el momento porque no se le avisó de la consecuencia.
**Recomendación:** Mostrar siempre un resumen previo de cuántas clases futuras se van a suspender/regenerar antes de confirmar "Guardar cambios" en modo edición (no solo cuando hay reemplazo de por medio). (NO implementar.)

---

#### UX-DIS-004 — La pantalla de asignación de módulos no distingue cargos no-frente-a-curso (preceptor/secretario/director) de docentes; "todos los módulos del día" se presenta igual en ambos casos
**Prioridad:** P1  **Tipo:** MENSAJE / CONSISTENCIA / FORMULARIO
**Fuente:** código (inferido)
**Pantalla:** `/distribuciones/[id]/modulos`
**Acción:** Seleccionar módulos horarios para la distribución de un cargo jornalizado
**Resultado esperado:** Ya está documentado y validado con el usuario (`docs/punto-de-partida-session de cierre-2026-08-18.md:36-42`, `2026-08-19.md:10-23`) que un cargo no-frente-a-curso (preceptor/secretario/director, `materiaId = null` en la asignación) se paga por jornal y no por módulo, y que hoy se le asignan igualmente todos los módulos del día únicamente para poder generar `ClaseProgramada` y habilitar reemplazos. La tarea #75 (cerrada 20/08/2026, `docs/punto-de-partida-session de cierre-2026-08-20.md`) corrigió esto en el **Dashboard** (#77, #78) y en **reportes de liquidación** (#79, #80) filtrando por `materiaId != null` o excluyendo estos cargos. Sería esperable que la pantalla donde se **origina** ese dato (la asignación de módulos) también comunicara la distinción.
**Resultado actual:** Ninguno de los componentes de `features/modulosDistribucion` (`ModulosGrid.tsx`, `ModulosHeader.tsx`) ni sus tipos (`features/modulosDistribucion/types/index.ts`) referencian `materiaId` o el carácter jornalizado del cargo — confirmado por búsqueda en todo el directorio. La grilla de módulos se ve y se comporta exactamente igual para un docente frente a curso que para un director: mismos checkboxes "seleccionar todo el día", mismo texto ("Seleccioná los módulos horarios y guardá"), mismo header. No hay ningún indicio visual ni textual de que, para un cargo jornalizado, seleccionar "todos los módulos" es una cobertura administrativa ficticia y no el horario real de clases.
**Evidencia:** `features/modulosDistribucion/components/ModulosGrid.tsx:1-85`; `features/modulosDistribucion/components/ModulosHeader.tsx:1-134`; `features/modulosDistribucion/types/index.ts:1-47` (sin `materiaId`); `docs/punto-de-partida-session de cierre-2026-08-18.md:36-42`; `docs/punto-de-partida-session de cierre-2026-08-19.md:10-23`; `docs/punto-de-partida-session de cierre-2026-08-20.md:39-49` (#75-#78 cerrados solo del lado de Dashboard/reportes)
**Impacto para el usuario:** Un operador cargando la distribución horaria de un preceptor por primera vez no tiene ninguna guía en pantalla sobre si debe tildar solo las horas "reales" de esa persona o todos los módulos del día — y el criterio correcto (todos los módulos, por la razón técnica de habilitar reemplazos) no es intuitivo ni está documentado en la UI. El riesgo de confusión es alto precisamente porque el sistema ya resolvió (correctamente) el problema de fondo aguas abajo (Dashboard/reportes no cuentan mal a estos cargos) — pero la persona que carga los datos nunca se entera de por qué está haciendo lo que está haciendo.
**Recomendación:** Si la asignación no tiene `materia` (cargo no-frente-a-curso), mostrar un aviso explícito en `/modulos` del tipo "Este cargo se paga por jornal, no por módulo. Los módulos que selecciones acá se usan únicamente para poder registrar incidencias y reemplazos — no representan clases reales." (NO implementar — es exactamente el tipo de cambio que este prompt pide documentar, no resolver.)

---

#### UX-DIS-005 — El modal de confirmación de "Eliminar" con reemplazo activo nunca refleja el estado de carga real
**Prioridad:** P1  **Tipo:** ESTADO / CARGA
**Fuente:** código (inferido) — **RIESGO / NO CONFIRMADO** en cuanto a si el doble click es efectivamente explotable en runtime (depende del timing de red), pero el código confirma que no hay ninguna guarda.
**Pantalla:** Listado — `ModalEliminarConReemplazo`
**Acción:** Confirmar "Eliminar de todas formas" cuando el tramo tiene reemplazos activos
**Resultado esperado:** Mientras el `DELETE` con `mantenerReemplazo` está en curso, el botón debería mostrar un estado de carga (como ya hace el mismo componente conceptual en el flujo de módulos) y deshabilitarse para evitar un doble envío.
**Resultado actual:** `app/protected/dashboard/distribuciones/page.tsx:82-89` pasa `guardando={guardando}` a `ModalEliminarConReemplazo`, pero ese `guardando` es el estado de `useDistribuciones.ts` que **solo se setea dentro de `crear()`** (`useDistribuciones.ts:161,176`). Ni `eliminar()` (líneas 183-199) ni `confirmarEliminacion()` (líneas 203-219) llaman a `setGuardando` en ningún momento. En consecuencia, el botón "Eliminar de todas formas" (`ModalEliminarConReemplazo.tsx:57-63`) queda siempre con `disabled={false}` y el texto fijo "Eliminar de todas formas" — nunca pasa a "Eliminando...". Comparar con el flujo de módulos, que sí lo hace bien: `guardar()`/`crearNuevaVersion()` en `useModulosDistribucion.ts:111,148` setean `guardando`/`creandoVersion` antes de llamar al servicio, y esos mismos flags sí se propagan correctamente a `ModalMigrarReemplazos` (`modulos/page.tsx:47,56`) y `ModalNuevaVersion` (línea 38).
**Evidencia:** `app/protected/dashboard/distribuciones/page.tsx:82-89`; `features/distribuciones/hooks/useDistribuciones.ts:183-219` (sin `setGuardando`); `features/distribuciones/components/ModalEliminarConReemplazo.tsx:49-64`; contraste con `features/modulosDistribucion/hooks/useModulosDistribucion.ts:110-168`
**Impacto para el usuario:** En la acción más destructiva del módulo (borrar una distribución con reemplazos activos, que además suspende clases), un doble clic accidental sobre "Eliminar de todas formas" puede disparar dos `DELETE` seguidos sin que nada en la interfaz lo impida ni lo muestre. El patrón correcto ya existe en el mismo módulo (flujo de módulos), lo que confirma que es una omisión puntual, no una limitación de diseño.
**Recomendación:** Setear `guardando`/un flag dedicado dentro de `eliminar()` y `confirmarEliminacion()`, igual que ya se hace en `useModulosDistribucion`. (NO implementar.)

---

#### UX-DIS-006 — El modal de "reemplazo afectado" reutilizado en "Nueva versión" promete "recrear clases" cuando en realidad las clases quedan suspendidas sin reemplazo hasta un segundo paso manual
**Prioridad:** P1  **Tipo:** MENSAJE / CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** `/distribuciones/[id]/modulos` — flujo "Nueva versión" cuando hay reemplazo activo en el tramo
**Acción:** Confirmar "Nueva versión" tras la advertencia de reemplazo afectado
**Resultado esperado:** El texto del modal debería describir lo que efectivamente va a pasar en esta operación puntual.
**Resultado actual:** `ModalMigrarReemplazos` es el mismo componente para dos flujos distintos: "editar módulos" (`tramoAConfirmar`) y "nueva versión" (`tramoNuevaVersion`) — ver `modulos/page.tsx:42-58`. Su texto fijo dice *"Este cambio va a recrear las clases entre {desde} y {hasta}"* (`ModalMigrarReemplazos.tsx:26-27`). Eso es cierto para "editar módulos" (que sí regenera clases en el mismo paso, `asignarModulos.ts` pasos 3-5). Pero en el flujo de "nueva versión", `nuevaVersionDistribucion.ts` llama a `suspenderNoVigentes` con `modulosNuevos: []` (línea 69) — es decir, **no se recrea nada todavía**; todo el tramo queda suspendido sin clases hasta que el usuario complete manualmente el segundo paso (asignar módulos a la versión nueva, potencialmente en otra sesión). El texto correcto para este caso ya existe, pero en otro componente: `ModalNuevaVersion.tsx:21-23` ("Las clases futuras quedarán suspendidas... hasta que asignes los módulos de la nueva versión"), que es reemplazado por `ModalMigrarReemplazos` en cuanto se detecta un tramo con reemplazo (`modulos/page.tsx:34-49`).
**Evidencia:** `features/modulosDistribucion/components/ModalMigrarReemplazos.tsx:26-27`; `features/modulosDistribucion/components/ModalNuevaVersion.tsx:21-23`; `app/protected/dashboard/distribuciones/[id]/modulos/page.tsx:34-58`; `lib/usecases/distribuciones/nuevaVersionDistribucion.ts:60-74`
**Impacto para el usuario:** Justo en el caso donde hay un reemplazo activo de por medio (el más delicado, porque involucra decidir si migrarlo o no), el texto que ve el usuario sugiere que las clases se van a recrear ya mismo, cuando en realidad quedan sin cobertura programada hasta que alguien vuelva a esta pantalla a asignar módulos. Puede llevar a pensar que la migración del reemplazo "surte efecto" de inmediato sobre clases que en ese momento ni siquiera existen.
**Recomendación:** Parametrizar el texto de `ModalMigrarReemplazos` según el flujo que lo invoca (o crear una variante para "nueva versión") para que describa la suspensión real en vez de una recreación inmediata. (NO implementar.)

---

#### UX-DIS-007 — La pantalla `/distribuciones/[id]` es inalcanzable desde la navegación normal y su "Eliminar" no maneja `requiereConfirmacion`
**Prioridad:** P1  **Tipo:** NAVEGACIÓN / ERROR NO INFORMADO / CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** `/distribuciones/[id]`
**Acción:** Eliminar una distribución desde esta pantalla
**Resultado esperado:** Si existe una pantalla de edición/eliminación dedicada, debería (a) ser alcanzable desde algún lugar de la UI, y (b) implementar el mismo contrato que el resto del módulo para una operación con el mismo nombre ("Eliminar").
**Resultado actual:**
- **Inalcanzable:** búsqueda confirmada en todo `features/` y `app/protected` — el único lugar que enlaza a distribuciones por id es siempre `.../modulos` (`DistribucionRow.tsx:121,164`, `DistribucionesCard.tsx` en Asignaciones); ningún componente arma un link a `/protected/dashboard/distribuciones/${id}` sin el sufijo `/modulos`. Es una ruta viva pero huérfana, mismo patrón que `UX-ASG-006` en el módulo Asignaciones.
- **Contrato distinto e incompleto:** `eliminar()` en esta página (`[id]/page.tsx:120-130`) hace `DELETE` sin body y sin leer `data.requiereConfirmacion` — solo mira `res.ok`. Como `eliminarDistribucion` siempre responde `200` (incluso cuando la respuesta real es "necesito confirmación", ver `app/api/distribuciones/[id]/route.ts:69-72`), `res.ok` es `true` aunque nada se haya borrado, y el código hace `router.push` al listado como si la eliminación hubiera tenido éxito. Comparar con la implementación correcta del listado (`useDistribuciones.ts:183-219`), que sí distingue `requiereConfirmacion` y muestra `ModalEliminarConReemplazo`.
**Evidencia:** búsqueda de `distribuciones/\${` y `dashboard/distribuciones/\[id\]` en todo el repo (sin resultados de enlace directo); `app/protected/dashboard/distribuciones/[id]/page.tsx:120-130`; `app/api/distribuciones/[id]/route.ts:56-74`; contraste con `features/distribuciones/hooks/useDistribuciones.ts:183-219`
**Impacto para el usuario:** Bajo en la práctica actual (nadie llega acá navegando), pero si alguien entra por URL directa (id numérico secuencial, fácil de adivinar o recordar de una sesión anterior) y elimina una distribución con reemplazos activos en el tramo futuro, el sistema **no borra nada** pero el usuario ve la misma navegación que si hubiera tenido éxito — sin ningún error, sin ningún aviso de que la distribución sigue activa.
**Recomendación:** Decidir si esta pantalla debe existir como ruta independiente (y en ese caso enlazarla y corregir `eliminar()` para manejar `requiereConfirmacion` igual que el listado) o eliminarla y unificar toda edición/eliminación en el listado + `/modulos`. (NO implementar — decisión de producto, no solo de limpieza.)

### P2

#### UX-DIS-008 — Eliminar una distribución no ofrece reactivación real; el mensaje de confirmación no advierte que es de facto irreversible desde la UI
**Prioridad:** P2  **Tipo:** ACCIÓN DESTRUCTIVA / MENSAJE
**Fuente:** código (inferido)
**Pantalla:** Listado y `/distribuciones/[id]`
**Acción:** Eliminar una distribución
**Resultado esperado:** `eliminarDistribucion` hace soft-delete (`deletedAt`, `activo:false` — `distribucionRepository.ts:167-179`), coherente con la regla de negocio de no eliminación destructiva de registros estructurales (`docs/reglas_negocio.md:265`). Dado que Asignaciones sí tiene un flujo de "Reactivar" simétrico a su "Eliminar", sería esperable algo equivalente acá, o al menos que el mensaje de confirmación fuera preciso sobre la falta de esa opción.
**Resultado actual:** No existe ningún caso de uso `reactivarDistribucion` (confirmado: el directorio `lib/usecases/distribuciones/` solo tiene `actualizarDistribucion, crearDistribucion, eliminarDistribucion, listarDistribuciones, nuevaVersionDistribucion, obtenerDistribucion, asignarModulos`) ni ninguna pantalla que liste distribuciones eliminadas. El texto de confirmación ("¿Eliminar esta distribución horaria? Se eliminarán también sus módulos asociados.", `page.tsx:76`) no menciona que la acción no se puede deshacer desde la UI — a diferencia de Asignaciones, donde el texto (aunque impreciso en otro sentido, ver `UX-ASG-005`) al menos existe en un contexto donde "Reactivar" sí es alcanzable.
**Evidencia:** `lib/repositories/distribucionRepository.ts:167-179`; ausencia confirmada de `reactivarDistribucion` por listado de archivos en `lib/usecases/distribuciones/`; `app/protected/dashboard/distribuciones/page.tsx:74-80`
**Impacto para el usuario:** Eliminar por error la distribución equivocada (fácil de hacer, dado que "Eliminar" está a un clic de distancia en la fila expandida) deja esa versión invisible para siempre desde la UI — la única forma de "recuperarla" es rearmarla a mano desde cero como una versión nueva, perdiendo la numeración y el registro histórico de esa versión particular.
**Recomendación:** Agregar reactivación (aunque sea solo accesible por soporte/admin) o, como mínimo, ajustar el texto de confirmación para que diga explícitamente que la acción no tiene forma de deshacerse desde la interfaz. (NO implementar.)

---

#### UX-DIS-009 — `nuevaVersionDistribucion` no está envuelto en una transacción ni valida "operación de versión en curso", pese a que el flujo documentado lo exige
**Prioridad:** P2  **Tipo:** VALIDACIÓN DE NEGOCIO
**Fuente:** código (inferido) — **RIESGO / NO CONFIRMADO**: requeriría forzar una falla de base de datos a mitad de secuencia, o un doble clic real, para confirmar el escenario de corrupción.
**Pantalla:** `/distribuciones/[id]/modulos` — "Nueva versión"
**Acción:** Crear nueva versión de una distribución
**Resultado esperado:** `docs/flujo_nueva_version_distribucion.md` describe explícitamente el flujo esperado: *"Sistema inicia transacción"*, valida *"No existe otra operación de versión en curso"*, y *"Todo ocurre dentro de una única transacción. Si falla cualquier validación → rollback total."* (líneas 15-21, 42-43).
**Resultado actual:** `nuevaVersionDistribucion.ts` ejecuta la lectura de cobertura, la suspensión de clases (`suspenderNoVigentes`), el `update` que cierra la versión actual (líneas 84-91) y el `create` de la versión nueva (líneas 102-110) como llamadas `await` secuenciales sueltas, **sin ningún `prisma.$transaction`**. Tampoco hay ningún chequeo de "operación en curso" (lock optimista, flag, o verificación de que no exista ya otra versión ACTIVO creada por una petición concurrente) antes de crear la nueva fila.
**Evidencia:** `docs/flujo_nueva_version_distribucion.md:15-21,42-43`; `lib/usecases/distribuciones/nuevaVersionDistribucion.ts:34-119` (sin `$transaction`, sin validación de concurrencia)
**Impacto para el usuario:** Si el `update` que cierra la versión vieja se aplica pero el `create` de la nueva falla después (error de red, restricción de base de datos, o un doble clic que dispare dos secuencias concurrentes con cálculos de versión desactualizados), la asignación puede quedar **sin ninguna distribución ACTIVO**, y el único mensaje que ve el usuario es un genérico "Error creando nueva versión" que no refleja que la versión anterior ya quedó cerrada.
**Recomendación:** Envolver el cierre de la versión vieja y la creación de la nueva en una única `prisma.$transaction`, y agregar una guarda contra doble ejecución concurrente (a nivel de UI con `useRef`, y/o a nivel de backend con una verificación de que no exista ya una versión posterior). (NO implementar.)

### P3

#### UX-DIS-010 — Duplicación de `ModalConfirmar` y pequeñas diferencias de texto entre las dos pantallas que ofrecen "Eliminar"
**Prioridad:** P3  **Tipo:** CONSISTENCIA / MENSAJE
**Fuente:** código (inferido)
**Pantalla:** Listado y `/distribuciones/[id]`
**Acción:** Confirmar eliminación (paso 1, sin reemplazo detectado todavía)
**Resultado esperado:** Un único componente y un único texto para la misma confirmación en el mismo módulo.
**Resultado actual:** Ambas pantallas definen su propio componente `ModalConfirmar` local, casi idéntico (`app/protected/dashboard/distribuciones/page.tsx:14-49` vs `app/protected/dashboard/distribuciones/[id]/page.tsx:44-57`), con textos ligeramente distintos: "¿Eliminar esta **distribución horaria**? Se eliminarán también sus módulos asociados." vs "¿Eliminar esta **distribución**? Se eliminarán también sus módulos asociados."
**Evidencia:** líneas citadas arriba
**Impacto para el usuario:** Mínimo — diferencia cosmética. Se documenta por completitud y porque ambas pantallas comparten módulo.
**Recomendación:** Extraer un único `ModalConfirmar` compartido (ya existe el patrón en otros módulos) y unificar el texto. (NO implementar.)

## 8. Pantallas/flujos auditados sin problemas relevantes

- **`ModalNuevaVersion` (primer paso, sin reemplazo detectado):** texto preciso y completo sobre la consecuencia real de la operación ("las clases futuras quedarán suspendidas... hasta que asignes los módulos... las que vuelvan a coincidir se recuperan automáticamente") — de los mejores mensajes del módulo.
- **`ModulosHeader`:** máquina de estados clara entre "activa sin módulos" / "activa con módulos, lectura" / "activa con módulos, edición" / "inactiva"; los botones disponibles cambian de forma predecible y sin solapamientos.
- **`SinModulosBadges` / `SinDistribucionBadges`:** buena visibilidad proactiva de dos estados que de otro modo quedarían ocultos (distribuciones que no van a generar clases; asignaciones completamente sin distribución), con texto explicativo y enlaces directos a la acción correctiva.
- **`DistribucionFilters` / `DiasResumen`:** filtros simples sin ambigüedad; el resumen de días por distribución en el acordeón colapsado da contexto útil sin necesidad de expandir.
- **Guardas de doble-submit en el flujo de módulos:** `guardando`/`creandoVersion` correctamente seteados y propagados a los tres modales de ese flujo (`ModalNuevaVersion`, `ModalMigrarReemplazos` en sus dos usos) — contrastar con la falla puntual en el flujo de eliminar del listado (UX-DIS-005).
- **Generación/reconciliación de clases al crear o reasignar módulos:** manejo cuidadoso de reconciliación de clases vencidas (`resolverClasesVencidas`, best-effort, no aborta la operación principal si falla) y de tramos clampeados al período operativo activo.

## 9. Áreas que no pudieron verificarse

- **Todo el comportamiento en runtime real:** sin herramienta de navegador disponible pese a que el dev server está corriendo, no se pudo confirmar en vivo ninguno de los hallazgos (temporización real de un doble clic, legibilidad de los mensajes de error en pantalla, si el `SolapamientoError` de UX-DIS-001 se reproduce exactamente como se infiere del código). No se generaron datos de prueba en ningún tenant.
- **UX-DIS-001:** confirmado el camino de código (comparación de fechas, mensaje de error); no confirmado en vivo si existen combinaciones de fechas (ej. cerrar manualmente la vigencia hasta desde la pantalla huérfana) que sorteen el bloqueo en la práctica — aunque, dado que esa pantalla es inalcanzable por navegación (UX-DIS-007), no cambia el diagnóstico para un usuario normal.
- **UX-DIS-005 y UX-DIS-009:** ambos dependen de timing (doble clic, fallo a mitad de una secuencia de escritura) que no se puede reproducir sin ejecutar la app; el código confirma la ausencia de guardas, pero no la frecuencia real del problema.
- **Permisos por rol:** no se encontró en este módulo ningún control más allá de `withContext` (autenticación/tenant); no se pudo confirmar si existen roles con acceso distinto a estas pantallas.
- **Impacto real de UX-DIS-004 en operadores actuales:** no se pudo confirmar con datos de un tenant real si los operadores ya conocen informalmente (por capacitación o costumbre) la convención de "tildar todos los módulos para un cargo jornalizado" pese a que la pantalla no la explique.

## 10. Lista priorizada de correcciones (sin implementar)

1. **UX-DIS-002** — Dejar de aceptar/ignorar en silencio `fecha_vigencia_desde` en el `PATCH`: o se habilita de verdad, o se rechaza con error explícito.
2. **UX-DIS-001** — Advertir o bloquear en el formulario "+ Nueva distribución" cuando la asignación ya tiene una distribución activa, señalando el flujo correcto ("Nueva versión" en `/modulos`).
3. **UX-DIS-007** — Decidir el destino de `/distribuciones/[id]`: enlazarla y corregir su `eliminar()`, o eliminarla del todo.
4. **UX-DIS-004** — Agregar aviso explícito en `/modulos` cuando la asignación no tiene materia (cargo jornalizado), aclarando que la selección de módulos es para habilitar cobertura/reemplazos, no clases reales.
5. **UX-DIS-005** — Setear un estado de carga real en `eliminar()`/`confirmarEliminacion()` y propagarlo a `ModalEliminarConReemplazo`.
6. **UX-DIS-006** — Diferenciar el texto de `ModalMigrarReemplazos` según si se invoca desde "editar módulos" o desde "nueva versión".
7. **UX-DIS-003** — Mostrar un resumen de impacto (clases a suspender/regenerar) antes de "Guardar cambios" en modo edición, incluso sin reemplazo detectado.
8. **UX-DIS-009** — Envolver `nuevaVersionDistribucion` en una transacción y agregar guarda de concurrencia.
9. **UX-DIS-008** — Definir si debe existir reactivación de distribuciones eliminadas, o ajustar el mensaje de confirmación para reflejar la irreversibilidad real.
10. **UX-DIS-010** — Unificar el componente `ModalConfirmar` y su texto entre las dos pantallas.
