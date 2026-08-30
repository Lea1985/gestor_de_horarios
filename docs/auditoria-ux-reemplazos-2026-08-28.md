# Auditoría UX Funcional y Operativa — Módulo Reemplazos

**Fecha:** 2026-08-28
**Alcance:** exclusivamente el módulo Reemplazos (2 de 10 auditorías por módulo). No se audita Incidencias, Distribuciones ni Módulos de Distribución como módulos completos — sí se auditan, dentro de esos módulos, los puntos donde invocan directamente a Reemplazos (crear/eliminar reemplazo, reasignar, validaciones), igual que hizo `docs/auditoria-ux-incidencias-2026-08-25.md` en sentido inverso.

---

## 1. Resumen ejecutivo

El módulo Reemplazos **no tiene pantalla propia**: no existe ninguna ruta bajo `app/protected/dashboard/reemplazos`, y los dos endpoints de lectura (`GET /api/reemplazos` — listado con filtro obligatorio, y `GET /api/reemplazos/[id]`) **no tienen ningún consumidor en el frontend actual** (confirmado por búsqueda en todo `features/` y `app/protected/`). Todo lo que un usuario puede hacer con reemplazos pasa por dos puntos de entrada embebidos en el módulo Incidencias: el modal "Agregar reemplazo" (`ModalReemplazo`, con su botón "Quitar" en la tabla de clases afectadas) y el modal "Ausencia del suplente" (`ModalAusenciaSuplente`, que llama a un endpoint distinto: `POST /api/reemplazos/reasignar`).

Ese segundo punto de entrada es el hallazgo más importante de esta auditoría. `crearReemplazo` (el use case detrás de "Agregar reemplazo") aplica tres validaciones de negocio documentadas en `docs/funcionalidades.md` (Epic 6, Features 6.1 y 6.3): el suplente debe ser distinto del agente que reemplaza (auto-reemplazo), no debe tener otra clase en el mismo módulo/fecha (superposición), y no debe existir ya un reemplazo activo para esa clase. `reasignarReemplazoAIncidencia` (el use case detrás de "Ausencia del suplente") **no aplica ninguna de las tres** — construye el nuevo `Reemplazo` directamente dentro de una transacción de Prisma, sin pasar por `crearReemplazo` ni por las funciones de validación (`validarSuperposicionSuplente`, `obtenerAgenteQueSeReemplaza`). El formulario del modal tampoco filtra la lista de agentes para excluir al suplente que se está reemplazando. El resultado: un operador puede, desde "Ausencia del suplente", dejar a un suplente cubriéndose a sí mismo o doblemente reservado en el mismo horario, sin ningún error, sin ningún aviso — el sistema responde como si todo hubiera salido bien.

Donde sí se aplican las tres validaciones (el flujo "Agregar reemplazo" desde el detalle de incidencia, y el paso 4 del wizard "Nueva incidencia"), los tres mensajes de error **son distintos y comprensibles en español llano** ("Ya existe un reemplazo activo para esta clase" / "El suplente ya tiene una clase programada en ese módulo y fecha" / "El agente suplente no puede reemplazar su propia ausencia") y se muestran correctamente al usuario — el backend no atrapa el error en silencio y el frontend no lo descarta. Esto ya representa una mejora reciente: el hallazgo `UX-INC-002` de la auditoría de Incidencias (fallos de reemplazo del paso 4 no se mostraban) está corregido en el código actual, verificado leyendo `useNuevaIncidencia.ts` y `ResultadoCarga.tsx`.

Fuera de eso, el resto de los hallazgos son de menor severidad: la acción "Quitar" reemplazo no tiene confirmación ni estado de carga, "Ausencia del suplente" informa cuántas reasignaciones fallaron pero no por qué, y no hay ningún test automatizado que cubra los casos de auto-reemplazo o superposición (solo el caso de "reemplazo activo duplicado").

## 2. Rama y commit auditado

- Rama: `refactor-clases-programadas-frontend`
- Commit: `c317be962e3f5c16d3e15363a0a63e85bc3e8adc`
- **Acceso a navegador/dev server: NO.** No hay herramienta de navegador/Playwright disponible en este entorno. Toda la auditoría se hizo por **lectura de código** (rutas API, use cases, repositorio, componentes de frontend, hooks, servicios, schema, tests, y documentación de negocio en `docs/`). Cada hallazgo está marcado `Fuente: código (inferido)`.

## 3. Alcance auditado

No existe ninguna pantalla dedicada a Reemplazos. Lo auditado:

**API bajo `app/api/reemplazos/`:**
- `GET /api/reemplazos` — listado con filtro obligatorio (sin consumidor en frontend)
- `POST /api/reemplazos` — crear reemplazo
- `GET /api/reemplazos/[id]` — obtener por id (sin consumidor en frontend)
- `DELETE /api/reemplazos/[id]` — eliminar (soft-delete)
- `POST /api/reemplazos/reasignar` — reasignar un reemplazo existente a una nueva incidencia (usado solo por "Ausencia del suplente")

**Use cases:** `crearReemplazo`, `eliminarReemplazo`, `listarReemplazos`, `obtenerReemplazo`, `reasignarReemplazoAIncidencia`, y las funciones de validación `validarSuperposicionSuplente` / `obtenerAgenteQueSeReemplaza` (`lib/usecases/reemplazos/validarSuperposicion.ts`). Repositorio: `lib/repositories/reemplazoRepository.ts`.

**Componentes de frontend que operan sobre Reemplazo (todos viven en `features/incidencias`, no en un `features/reemplazos` propio):**
- `ModalReemplazo.tsx` — modal "Agregar reemplazo" (desde detalle de incidencia)
- `ClasesAfectadasTable.tsx` — botones "+ Agregar" / "Quitar" por clase
- `ModalAusenciaSuplente.tsx` — modal "Ausencia del suplente" (crea incidencia hija + reasigna reemplazos)
- `PasoReemplazos.tsx` — paso 4 del wizard "Nueva incidencia" (creación de reemplazos en lote)
- `ResultadoCarga.tsx` — pantalla de resultado del wizard, incluye resultado por reemplazo

**Fuera de alcance de esta auditoría** (pertenecen a otros módulos, se los menciona solo porque tocan el modelo `Reemplazo`): `features/distribuciones/components/ModalEliminarConReemplazo.tsx` y `features/modulosDistribucion/components/ModalMigrarReemplazos.tsx` — ambos muestran buena comunicación de consecuencias al usuario en una lectura superficial (explican qué va a pasar con los reemplazos existentes al eliminar/migrar una distribución), pero no se auditaron en profundidad por corresponder a los módulos Distribuciones / Módulos de Distribución.

**Modelos:** `Reemplazo` (`prisma/schema.prisma:519-540`), `TitularAsignacion` (`prisma/schema.prisma:330-356`, usado para resolver "quién es el titular vigente" y para detectar superposición del suplente contra sus propias asignaciones).

## 4. Inventario de pantallas

No hay pantallas propias. Los puntos de entrada son modales embebidos en `/protected/dashboard/incidencias/[id]` y `/protected/dashboard/incidencias/nueva`:

### 4.1 Modal "Agregar reemplazo" (`ModalReemplazo`, dentro del detalle de incidencia)
- **Objetivo:** asignar un suplente a una clase concreta afectada por la incidencia.
- **Disparador:** botón "+ Agregar" en la fila de una clase sin reemplazo activo, en la tabla "Clases afectadas".
- **Formulario:** selector de agente suplente (obligatorio), observación (opcional, textarea).
- **Botones:** Cancelar, Confirmar (deshabilitado mientras `guardando`).
- **Mensajes:** banner de error dentro del modal si falla la creación.
- **Tras éxito:** cierra el modal, recarga clases afectadas y la cadena de incidencias.

### 4.2 Botón "Quitar" (dentro de `ClasesAfectadasTable`, mismo detalle de incidencia)
- **Objetivo:** dar de baja el reemplazo activo de una clase, devolviéndola a estado "Suspendida" (sin cobertura).
- **Disparador:** click directo en "Quitar" junto al nombre del reemplazante — **sin modal de confirmación**.
- **Feedback:** ninguno inline; si falla, aparece un banner de error a nivel de página ("Error clases"), separado de la fila.

### 4.3 Modal "Registrar ausencia del suplente" (`ModalAusenciaSuplente`, detalle de incidencia)
- **Objetivo:** cuando el suplente que estaba cubriendo también falta, crear una incidencia hija acotada al rango de fechas indicado y, opcionalmente, reasignar las clases afectadas a un nuevo suplente.
- **Disparador:** botón "Ausencia del suplente" (solo visible si la incidencia tiene reemplazos activos).
- **Formulario:** codigario/código (obligatorio), fecha desde/hasta (obligatorio, acotadas al rango del padre), nuevo suplente (opcional), observación (opcional). El suplente que se está reemplazando se deduce automáticamente de las fechas cargadas (no se elige manualmente) y se muestra en el encabezado del modal.
- **Botones:** Cancelar, Registrar ausencia (deshabilitado si el suplente deducido es ambiguo, no tiene cobertura, o está guardando).
- **Resultado parcial:** si se creó la incidencia pero fallaron algunas reasignaciones, el modal cambia a una vista de aviso ("Incidencia creada con avisos") con el conteo de clases no reasignadas, en vez de navegar en silencio.

### 4.4 Paso 4 del wizard "Nueva incidencia" (`PasoReemplazos`)
- **Objetivo:** tras crear un lote de incidencias, ofrecer reemplazo para las clases que quedaron suspendidas, agrupadas por asignación.
- **Acciones:** seleccionar clases (individual o "seleccionar todas" por grupo), elegir suplente por clase o aplicar un suplente global a toda la selección, "Confirmar N reemplazos" o "Saltar este paso".
- **Validación de frontend:** el botón de confirmar se deshabilita si hay clases seleccionadas sin suplente asignado, con aviso visible.
- **Resultado:** avanza al paso 5 (`ResultadoCarga`), que muestra el resultado de cada reemplazo (OK / error con el mensaje del backend).

## 5. Matriz de acciones críticas

| Acción | API / UseCase | Validaciones aplicadas | Resultado esperado |
|---|---|---|---|
| Agregar reemplazo (modal, wizard paso 4) | `POST /api/reemplazos` → `crearReemplazo` | Clase existe y su incidencia (si tiene) está activa; asignación existe; agente existe y activo; **auto-reemplazo**; **superposición del suplente**; **reemplazo activo existente** | 201, clase pasa a `REEMPLAZADA`, mensaje distinto por cada causa de rechazo (409) |
| Quitar reemplazo | `DELETE /api/reemplazos/[id]` → `eliminarReemplazo` | Reemplazo existe en el tenant; no hay una incidencia hija activa cubriendo esa fecha puntual | 200, soft-delete, clase vuelve a `SUSPENDIDA` |
| Ausencia del suplente → reasignar | `POST /api/reemplazos/reasignar` → `reasignarReemplazoAIncidencia` | Clase existe; incidencia destino existe y no está eliminada — **ninguna validación de negocio de auto-reemplazo, superposición o reemplazo activo** | 201, reemplazo anterior desactivado, clase movida a la nueva incidencia, nuevo reemplazo creado |
| Listar reemplazos | `GET /api/reemplazos` → `listarReemplazos` | Al menos un filtro (`claseId`, `asignacionTitularId` o `fecha_desde`) obligatorio | Lista de reemplazos activos — **sin consumidor en frontend** |
| Obtener reemplazo por id | `GET /api/reemplazos/[id]` → `obtenerReemplazo` | Pertenece al tenant | Detalle del reemplazo — **sin consumidor en frontend** |

## 6. Hallazgos

### P0 — Crítico

#### UX-REE-001 — "Ausencia del suplente" puede crear un reemplazo inválido (auto-reemplazo o superposición) sin ningún error
**Prioridad:** P0  **Tipo:** VALIDACIÓN DE NEGOCIO
**Fuente:** código (inferido)
**Pantalla:** Detalle de incidencia → modal "Registrar ausencia del suplente"
**Acción:** Elegir un "Nuevo suplente" y confirmar, cuando ese agente coincide con el que ya cubre la clase (auto-reemplazo) o ya tiene otra clase en el mismo módulo/fecha (superposición)
**Resultado esperado:** Según las reglas de negocio documentadas en `docs/funcionalidades.md` (Feature 6.1, "Suplente distinto del titular"; Feature 6.3, "Validar disponibilidad del suplente... chequeo de solapamientos") y según el propio comportamiento de "Agregar reemplazo" en el mismo módulo, el sistema debería rechazar la reasignación con un mensaje explicando la causa (mismo criterio que `AutoReemplazoError` / `SuperposicionSuplenteError`).
**Resultado actual:** `reasignarReemplazoAIncidencia` (`lib/usecases/reemplazos/reasignarReemplazoAIncidencia.ts:21-75`) construye el nuevo `Reemplazo` directamente dentro de una transacción de Prisma (líneas 49-70: desactiva el reemplazo anterior, mueve `clase.incidenciaId`, crea el nuevo `Reemplazo`) sin llamar en ningún momento a `validarSuperposicionSuplente` ni a `obtenerAgenteQueSeReemplaza` — las mismas funciones que sí usa `crearReemplazo.ts:51-57` para bloquear auto-reemplazo y superposición. Tampoco reutiliza `verificarReemplazoActivo`, aunque en este caso no hace falta porque la transacción desactiva el reemplazo previo antes de crear el nuevo.
Del lado del formulario, `ModalAusenciaSuplente.tsx:337-350` renderiza el selector "Nuevo suplente" con la lista completa de `agentes` (viene de `fetchAgentes`, sin filtrar), sin excluir al agente que el propio modal ya identificó como el suplente que se está reemplazando (`suplenteResuelto.agente.id`, calculado en las líneas 105-122). Nada impide seleccionarlo de nuevo.
**Evidencia:**
- `lib/usecases/reemplazos/reasignarReemplazoAIncidencia.ts:21-75` (sin llamadas a `validarSuperposicionSuplente` / `obtenerAgenteQueSeReemplaza` / `verificarReemplazoActivo`)
- `lib/usecases/reemplazos/crearReemplazo.ts:51-60` (mismo tipo de operación, sí valida)
- `features/incidencias/components/ModalAusenciaSuplente.tsx:105-122` (`suplenteResuelto`, agente detectado) y `:337-350` (selector sin excluirlo)
- `docs/funcionalidades.md:275-276` ("Suplente distinto del titular"), `:298-300` ("Validar disponibilidad del suplente... chequeo de solapamientos")
**Impacto para el usuario:** El sistema acepta la acción como exitosa (crea la incidencia, navega al detalle, sin ningún error ni aviso) mientras deja el horario en un estado inválido: un suplente cubriéndose a sí mismo, o doblemente reservado en el mismo módulo/fecha. El usuario no tiene forma de enterarse desde este flujo — solo lo notaría si más tarde revisa manualmente el horario del agente afectado. Es precisamente el escenario que el resto del módulo (y la documentación de negocio) trata como un error bloqueante.
**Recomendación:** Hacer que `reasignarReemplazoAIncidencia` reutilice `validarSuperposicionSuplente` y `obtenerAgenteQueSeReemplaza` antes de crear el nuevo `Reemplazo` dentro de la transacción, lanzando los mismos errores tipados (`AutoReemplazoError`, `SuperposicionSuplenteError`) que ya maneja `crearReemplazo`, y que la ruta `POST /api/reemplazos/reasignar` los traduzca a 409 igual que `POST /api/reemplazos`. Como mitigación adicional en el frontend, excluir del selector "Nuevo suplente" al agente que ya está identificado como `suplenteResuelto.agente`. No implementar sin autorización — toca un use case y su ruta API.

---

### P1 — Importante

#### UX-REE-002 — "Quitar" reemplazo: sin confirmación, sin estado de carga, y el error no queda asociado a la fila
**Prioridad:** P1  **Tipo:** ACCIÓN DESTRUCTIVA / ESTADO
**Fuente:** código (inferido)
**Pantalla:** Detalle de incidencia → tabla "Clases afectadas"
**Acción:** Click en "Quitar" junto al nombre de un reemplazante
**Resultado esperado:** Dado que quitar un reemplazo deja una clase sin cobertura (vuelve a `SUSPENDIDA`), y que el propio módulo usa `ModalConfirmar` para acciones de impacto comparable (eliminar/reactivar incidencia), se esperaría algún tipo de confirmación o, al menos, un estado de carga que evite doble click y un error visible junto a la fila afectada.
**Resultado actual:** `ClasesAfectadasTable.tsx:158-164` llama a `onEliminarReemplazo(reemplazoActivo.id)` directamente en el `onClick`, sin modal ni paso intermedio. `useClasesAfectadas.ts:94-102` (`eliminarReemplazo`) no expone ningún estado de "eliminando" por fila — el botón nunca se deshabilita mientras la petición está en curso, así que un doble click puede disparar dos `DELETE` seguidos (el segundo no rompe nada porque `eliminarReemplazo.ts` no revisa si `reemplazoRepository.eliminar` devolvió `null`, pero tampoco informa que no hizo nada). Si la eliminación falla (p. ej. `ReemplazoConIncidenciaHijaError`, 409), el error se guarda en el estado `error` general de `useClasesAfectadas` (línea 100) y se renderiza en el banner "Error clases" de la parte superior de la página (`app/protected/dashboard/incidencias/[id]/page.tsx:191-196`), sin relación visual con la fila que lo originó — en una tabla con varias clases, no queda claro cuál intento falló.
**Evidencia:** `features/incidencias/components/ClasesAfectadasTable.tsx:158-164`; `features/incidencias/hooks/useClasesAfectadas.ts:94-102`; `app/protected/dashboard/incidencias/[id]/page.tsx:191-196`
**Impacto para el usuario:** Riesgo de quitar un reemplazo por error sin posibilidad de arrepentirse antes de confirmar (clasificación: **RIESGO MODERADO** — es recuperable volviendo a asignar el mismo suplente vía "+ Agregar", pero no hay aviso previo ni deshacer). En listas largas, un error de eliminación puede pasar desapercibido o atribuirse a la fila equivocada.
**Recomendación:** Agregar confirmación (mismo patrón que `ModalConfirmar` usado para eliminar incidencia) o, como mínimo, un estado de carga por fila que deshabilite el botón durante la petición y muestre el error cerca de la fila afectada.

---

#### UX-REE-003 — En "Ausencia del suplente", el aviso de reasignaciones fallidas no dice por qué fallaron
**Prioridad:** P1  **Tipo:** ERROR NO INFORMADO / MENSAJE
**Fuente:** código (inferido)
**Pantalla:** Detalle de incidencia → modal "Registrar ausencia del suplente"
**Acción:** Confirmar con un nuevo suplente, cuando alguna de las reasignaciones de clase (`POST /api/reemplazos/reasignar`) falla
**Resultado esperado:** El usuario debería poder saber, por clase, cuál fue la causa del fallo (p. ej. clase ya no existe, incidencia inválida, error de red) para decidir si reintentar manualmente tiene sentido.
**Resultado actual:** `ModalAusenciaSuplente.tsx:176-193` usa `Promise.allSettled` sobre las reasignaciones y cuenta cuántas fueron `rejected` (`fallidas`), pero descarta el motivo de cada rechazo (`resultados.filter(r => r.status === "rejected").length` — el `reason` de cada promesa rechazada nunca se lee). El aviso resultante (líneas 225-228) solo dice "N de M clases no se pudo(eron) reasignar al nuevo suplente. Vas a poder asignarlas manualmente desde el detalle" — un mensaje correcto pero genérico, igual sea por un conflicto de negocio real o por un error de red transitorio. Nota: esto ya es una mejora respecto al hallazgo `UX-INC-003` de la auditoría de Incidencias (antes no se inspeccionaba el resultado en absoluto); este hallazgo es más acotado — se conserva el conteo pero no la causa.
**Evidencia:** `features/incidencias/components/ModalAusenciaSuplente.tsx:176-193` (`Promise.allSettled` sin leer `reason`), `:225-228` (mensaje genérico)
**Impacto para el usuario:** El usuario sabe que algo quedó sin cubrir, pero no si vale la pena reintentar de inmediato (error de red) o si hay que revisar manualmente un conflicto de horario. Impacto acotado porque, de cualquier forma, ya se le indica a dónde ir a revisarlo.
**Recomendación:** Conservar el `reason` (mensaje de error) de cada promesa rechazada y, aunque sea de forma resumida (p. ej. agrupando por tipo de error), incluirlo en el aviso o en un detalle expandible.

---

### P2 — Moderado

#### UX-REE-004 — No existe ninguna forma de ver "todos los reemplazos activos"; los endpoints de lectura no tienen consumidor
**Prioridad:** P2  **Tipo:** NAVEGACIÓN
**Fuente:** código (inferido)
**Pantalla:** Todo el módulo (ausencia de pantalla)
**Acción:** Buscar quién está cubriendo qué, en general (no clase por clase ni incidencia por incidencia)
**Resultado esperado:** El enunciado de esta auditoría contempla explícitamente un "listado de reemplazos activos... si existe como pantalla propia", lo cual sugiere que es una funcionalidad esperable en un sistema de gestión de reemplazos docentes.
**Resultado actual:** No hay ninguna ruta bajo `app/protected/dashboard/` para Reemplazos. `GET /api/reemplazos` (`listarReemplazos`) y `GET /api/reemplazos/[id]` (`obtenerReemplazo`) existen, están implementados y testeados a nivel API, pero **ningún componente de `features/` los invoca** (verificado por búsqueda de `/api/reemplazos` con método GET en todo `features/` y `app/protected/`: cero resultados). La única forma de ver reemplazos es entrando incidencia por incidencia y mirando su tabla "Clases afectadas".
**Evidencia:** búsqueda de `fetch(\`/api/reemplazos` en `features/` y `app/protected/` (solo aparecen `POST /api/reemplazos`, `DELETE /api/reemplazos/[id]` y `POST /api/reemplazos/reasignar`); `app/api/reemplazos/route.ts:16-34` (GET implementado); `app/api/reemplazos/[id]/route.ts:15-27` (GET implementado)
**Impacto para el usuario:** Un operador que necesite una vista agregada (p. ej. "qué suplentes están activos esta semana", para planificar pagos o disponibilidad) no tiene dónde consultarla dentro de la aplicación; tiene que reconstruirla manualmente incidencia por incidencia. No es necesariamente un bug (puede ser una decisión de alcance del sistema hasta ahora), pero es una funcionalidad implementada en el backend y expuesta por tests que no llegó a tener interfaz.
**Recomendación:** Confirmar con negocio si esta vista agregada es un requerimiento real; si lo es, `listarReemplazos` ya soporta filtro por asignación/fecha y solo faltaría la pantalla. RIESGO / NO CONFIRMADO: no se pudo verificar contra negocio si la ausencia de esta pantalla es una decisión de alcance intencional o un gap.

---

#### UX-REE-005 — "+ Agregar" reemplazo se ofrece también sobre clases que no están suspendidas
**Prioridad:** P2  **Tipo:** VALIDACIÓN UX
**Fuente:** código (inferido)
**Pantalla:** Detalle de incidencia → tabla "Clases afectadas"
**Acción:** Ver el botón de acción de una clase con estado `PROGRAMADA` o `DICTADA` que no tiene reemplazo activo
**Resultado esperado:** El reemplazo tiene sentido operativo sobre una clase que quedó sin cubrir por la incidencia (`SUSPENDIDA`). Una clase `DICTADA` ya ocurrió; una clase `PROGRAMADA` no fue afectada por la incidencia (el titular la va a dar con normalidad) — en ninguno de los dos casos "agregar un reemplazo" es una acción con sentido de negocio evidente.
**Resultado actual:** `ClasesAfectadasTable.tsx:156-172` decide qué botón mostrar únicamente en función de si hay un `reemplazoActivo` (`reemplazoActivo ? "Quitar" : "+ Agregar"`), sin mirar `clase.estado`. La propia tabla contempla que puede haber filas `PROGRAMADA` en la lista (`hayPendientes`, línea 51-53, filtra explícitamente por `estado === "PROGRAMADA"`) y `DICTADA` (badge definido en línea 35). El backend tampoco lo bloquea: `reemplazoRepository.verificarClase` (`lib/repositories/reemplazoRepository.ts:222-234`) solo valida que la clase exista y que su incidencia (si tiene) esté activa — no valida `estado`.
**Evidencia:** `features/incidencias/components/ClasesAfectadasTable.tsx:51-53, 156-172`; `lib/repositories/reemplazoRepository.ts:222-234`
**Impacto para el usuario:** Fricción y confusión potencial — un usuario podría intentar asignar un reemplazo a una clase ya dictada o no afectada, sin que el sistema le explique por qué no corresponde (la operación probablemente se completa igual, ya que el backend no lo bloquea, dejando un reemplazo registrado sobre una clase que no lo necesitaba).
**Recomendación:** Restringir la acción "+ Agregar" a clases en estado `SUSPENDIDA`, igual que ya hace el paso 4 del wizard (`PasoReemplazos.tsx:58`, `elegibles = clases.filter(c => c.estado === "SUSPENDIDA")`).

---

#### UX-REE-006 — El orden de validaciones en `crearReemplazo` puede mostrar "superposición" en vez de "ya existe un reemplazo" en un escenario de carrera
**Prioridad:** P2  **Tipo:** MENSAJE
**Fuente:** código (inferido)
**Pantalla:** Modal "Agregar reemplazo" / paso 4 del wizard
**Acción:** Dos intentos de crear reemplazo para la misma clase en una ventana de tiempo muy corta (p. ej. dos pestañas, o un reintento tras timeout)
**Resultado esperado:** Si la causa real del rechazo es que la clase ya tiene un reemplazo activo, el mensaje debería decir eso, no una causa distinta que también sea cierta mecánicamente pero no sea la explicación más directa.
**Resultado actual:** `crearReemplazo.ts` verifica primero auto-reemplazo (línea 52-54), después superposición del suplente (línea 55-57), y **recién al final** si ya existe un reemplazo activo para esa clase (línea 58-60). Si dos solicitudes llegan casi simultáneamente para la misma clase con el mismo suplente, y ese suplente además tiene otra clase en el mismo módulo/fecha, la segunda solicitud puede fallar con `SuperposicionSuplenteError` en vez de `ReemplazoActivoExistenteError`, aunque la causa más relevante para el usuario sea la segunda.
**Evidencia:** `lib/usecases/reemplazos/crearReemplazo.ts:51-60`
**Impacto para el usuario:** Bajo — la UI normal no permite intentarlo dos veces porque el botón "+ Agregar" desaparece en cuanto la clase tiene un reemplazo activo, y `ModalReemplazo` deshabilita "Confirmar" mientras `guardando`. Solo sería alcanzable en escenarios de carrera entre pestañas/usuarios distintos. RIESGO / NO CONFIRMADO: no se pudo probar en vivo si esta ventana de carrera es realmente alcanzable.
**Recomendación:** Si se decide corregir, verificar `verificarReemplazoActivo` antes que `validarSuperposicionSuplente`, ya que es la causa más específica y más fácil de explicar.

---

### P3 — Menor

*(sin hallazgos adicionales de prioridad P3 en este módulo — ver también la nota de cobertura de tests en la sección 8, que no se numera como hallazgo UX porque no tiene una pantalla asociada, pero condiciona la confianza de UX-REE-001)*

## 7. Pantallas/zonas auditadas sin problemas relevantes

- **Modal "Agregar reemplazo" (`ModalReemplazo`)**: formulario simple, error visible dentro del propio modal (no un banner desconectado), botón "Confirmar" deshabilitado durante el guardado (previene doble envío), mensaje distinto según la causa de rechazo del backend — cumple lo pedido por esta auditoría para este punto de entrada específico.
- **Paso 4 del wizard "Nueva incidencia" (`PasoReemplazos` + `ResultadoCarga`)**: validación de frontend clara para "suplente requerido" antes de habilitar el guardado; tras la corrección ya aplicada (referida en la auditoría de Incidencias como `UX-INC-002`), los resultados de cada `POST /api/reemplazos` se capturan y se muestran por clase, con el mensaje específico de error del backend — incluye correctamente los tres mensajes de auto-reemplazo/superposición/reemplazo-activo si ocurrieran en un lote.
- **Cadena de propagación de errores backend → frontend**: en los tres flujos de escritura auditados (`crearReemplazoService`, `eliminarReemplazoService`, `reasignarReemplazoService` en `incidenciasService.ts`), el patrón es consistente: se lee `data.error` del body y se lanza como `Error.message`, sin mensajes técnicos crudos ni errores atrapados en silencio.
- **`ModalAusenciaSuplente` — resolución del suplente a partir de fechas**: la lógica que deduce automáticamente qué suplente se está reemplazando (en vez de pedírselo al usuario) maneja explícitamente los casos "incompleto", "sin cobertura" y "ambiguo" con mensajes distintos y color de alerta, y bloquea el guardado mientras no esté resuelto — buen manejo de un caso no trivial.

## 8. Áreas que no pudieron verificarse

- **Todo el módulo en vivo**: sin navegador ni dev server disponibles, ningún hallazgo fue confirmado interactuando con la UI real. En particular, `UX-REE-001` (el más severo) no pudo confirmarse creando un reemplazo inválido de verdad en un tenant de prueba — se concluye por lectura completa de `reasignarReemplazoAIncidencia.ts` y comparación línea por línea con `crearReemplazo.ts`, no por observación de un error real (o su ausencia) en pantalla.
- **Cobertura de tests automatizados de las tres validaciones de negocio**: `tests/reemplazos.test.ts` solo cubre "rechaza duplicado (409)" (equivalente a `ReemplazoActivoExistenteError`). No se encontró ningún test, en `tests/reemplazos.test.ts` ni en el resto del repo, que ejercite `AutoReemplazoError` ni `SuperposicionSuplenteError` (búsqueda de esos dos nombres en todo `tests/`: sin resultados). Esto reduce la confianza en que el comportamiento descripto en el código se mantenga estable ante futuros cambios, y es la razón por la que `UX-REE-001` no pudo confirmarse en tiempo de ejecución.
- **Permisos por rol**: no se encontró lógica de permisos específica de Reemplazos (más allá de la autenticación genérica vía `withContext`); no se pudo determinar si distintos roles ven u operan de forma distinta.
- **Concurrencia real**: el escenario de carrera descripto en `UX-REE-006` es una lectura del orden del código, no una prueba con dos solicitudes simultáneas reales.
- **Discrepancia de documentación histórica (no es un hallazgo UX, se deja constancia por transparencia):** `docs/funcionalidades.md:294-296` (Feature 6.3) dice "No permitir reemplazo si: clase está suspendida (según decisión de negocio)", lo cual contradice el comportamiento actual del sistema completo (los reemplazos existen precisamente para cubrir clases `SUSPENDIDA` por una incidencia). Es muy probablemente un borrador v1 desactualizado respecto al diseño actual. Siguiendo el orden de fuente de verdad de `CLAUDE.md` (código actual > documentación histórica), no se trata como un hallazgo ni se propone alinear el sistema a ese texto — solo se informa la discrepancia.
- **Datos de prueba**: no se generaron datos de prueba en un tenant existente (ej. Escuela Primaria N°12) porque no hubo acceso a navegador/dev server para ejecutar los flujos.

## 9. Lista priorizada de correcciones (no implementadas)

1. **UX-REE-001** — Hacer que `reasignarReemplazoAIncidencia` valide auto-reemplazo y superposición del suplente (reusando `validarSuperposicionSuplente` / `obtenerAgenteQueSeReemplaza`), y excluir en el frontend al suplente actual de la lista de "Nuevo suplente" en `ModalAusenciaSuplente`.
2. **UX-REE-002** — Confirmación o estado de carga por fila para "Quitar" reemplazo, con error asociado a la fila afectada.
3. **UX-REE-003** — Conservar y mostrar (agrupado o resumido) el motivo de cada reasignación fallida en "Ausencia del suplente", no solo el conteo.
4. **UX-REE-005** — Restringir "+ Agregar" reemplazo a clases en estado `SUSPENDIDA`.
5. **UX-REE-004** — Confirmar con negocio si falta una pantalla de listado agregado de reemplazos activos; si es necesaria, construirla sobre `listarReemplazos` (ya implementado y testeado).
6. **UX-REE-006** — (opcional, baja probabilidad de ocurrencia) reordenar las validaciones de `crearReemplazo` para verificar `ReemplazoActivoExistenteError` antes que `SuperposicionSuplenteError`.
7. **Recomendación transversal, no numerada como hallazgo UX**: agregar tests de regresión para `AutoReemplazoError` y `SuperposicionSuplenteError` en `tests/reemplazos.test.ts`, y un test específico para el escenario de `UX-REE-001` sobre `POST /api/reemplazos/reasignar`.
