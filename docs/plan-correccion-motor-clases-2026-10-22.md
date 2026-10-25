# ALNEXT · Plan de corrección del motor de clases (22/10/2026)

Base: la bitácora del piloto de Ceferino (21/10) y la lectura del código real: `claseProgramadaService`, `resolucionClaseService`, usecases de incidencias, reemplazos, distribuciones, períodos, asignaciones y calendario, `helpers/clases.ts`, `withContext`, `schema.prisma`, `reemplazoRepository`, `incidenciaRepository` y el reporte de ausencias (dataset, PDF).

Convención: **[C]** confirmado leyendo el código. **[H]** hipótesis a verificar con un test antes de corregir.

---

## 1. Diagnóstico por causa raíz

### R1. El motor no conoce `CAMBIO_DISTRIBUCION` ni `FIN_ASIGNACION` [C]

`resolverEstadoYCausa` evalúa: incidencia, período, calendario, fecha pasada. La cabecera de `resolucionClaseService.ts` dice que `CAMBIO_DISTRIBUCION` lo decide `suspenderNoVigentes` "por atajo". Pero 14 puntos del código llaman a `resolverClase` sobre clases que pueden estar dadas de baja, y el motor las devuelve a `PROGRAMADA` o a `INCIDENCIA`:

- Guardar o reactivar una licencia: `vincularIncidencia` vincula **todas** las clases del rango, sin filtro de estado, y el motor da `INCIDENCIA` como máxima prioridad cuando `incidenciaId` no es nulo (bugs 4 y 16).
- Alta, baja o reactivación de un día de calendario: `resolverClasesPorCalendario` resuelve todas las clases de esa fecha (bug 7, el 31/12 de Físico-Química).
- `reactivarDistribucion` y `reactivarAsignacion`.
- Crear y eliminar reemplazo sobre una clase muerta, y `actualizarClase`.

### R2. Cambio de distribución mal modelado [C]

- `suspenderNoVigentes` salta toda clase con causa `INCIDENCIA` (que incluye todas las `REEMPLAZADA`). Contradice el modal "¿mantener reemplazo?" (bug 2).
- "Editar" (`asignarModulos`) trabaja sobre el período entero, sin "desde cuándo": regenera clases pasadas, que `resolverClasesVencidas` marca dictadas al instante (bug 11).
- `generarParaRango` crea con `incidenciaId` nulo: las clases nuevas no heredan la licencia vigente (bug 3).
- "Nueva versión" rige siempre desde hoy y nace vacía: entre este paso y `asignarModulos` la asignación no tiene clases.
- Sin transacción en ninguno de los dos flujos (suspender, asignar, generar y migrar son pasos separados).
- `reactivarDistribucion` re-resuelve **todas** las `CAMBIO_DISTRIBUCION` de la asignación, no las de esa versión.
- `migrarReemplazoATramo` crea reemplazos sin `incidenciaId`, pasa clases a `REEMPLAZADA` sin causa ni vínculo (el motor las devolvería a `PROGRAMADA`) y solo toca clases `PROGRAMADA`, así que las de feriado no reciben reemplazo (mitad del bug 1).

### R3. "Hoy" implementado de varias formas, y con la fecha equivocada [C]

- No hay helper: unas 17 copias de `const hoy = new Date(); hoy.setUTCHours(0,0,0,0)` en el servidor y 5 variantes en el cliente.
- Todas toman la **fecha UTC actual** como "hoy". Argentina es UTC-3: el día cambia a las 21:00 locales. A partir de ahí se marcan dictadas las clases de mañana, se cierran antes de tiempo las distribuciones y los períodos que vencen hoy, y los filtros "hoy" de la UI muestran mañana.
- Bug 12: `resolverClasesVencidas` usa `fecha <= hoy`, así que las clases de hoy quedan dictadas con la primera petición del día, sin mirar la hora del módulo.
- El gate diario de `withContext` se dispara con la primera petición del día UTC. El efecto depende de la hora de esa petición, y por eso parece intermitente.
- El patrón "UTC explícito" de los parches anteriores es correcto como representación (medianoche UTC). Lo que falla es cuál fecha de calendario se representa.

### R4. Licencias y reemplazos [C]

- Editar o eliminar una licencia con reemplazos está bloqueado. Forzar a borrar los reemplazos uno por uno pierde el registro de clases ya dadas (bug 9).
- `crearIncidencia` valida que haya "alguna clase" en el rango, incluso muertas.
- `verificarSuperposicion` ignora las eliminadas, pero el índice único `(asignacionId, fecha_desde)` no: recargar una licencia con la misma fecha de inicio choca con la fila eliminada (bug 8).
- Editar o reactivar una licencia **hija** falla siempre: se llama a `verificarSuperposicion` sin excluir a los ancestros, a diferencia de crear.
- `vincularIncidencia` incluye clases `DICTADA` y `desvincularIncidencia` las excluye: una clase dictada queda ligada a una licencia eliminada.
- Cambiar el artículo no re-resuelve (hoy solo se re-resuelve si cambian las fechas).
- `crearReemplazo` toma `incidenciaId` del cuerpo de la petición (opcional): causa del bug 13. No rechaza clases `CAMBIO_DISTRIBUCION` o `FIN_ASIGNACION`.
- Feriados (bug 1): `INCIDENCIA` gana siempre sobre `CALENDARIO_ESCOLAR`, sin mirar el artículo.

### R5. Reporte de ausencias [C]

- El PDF agrupa filas con `filas.slice(idx, idx + primero.totalTramos)`, pero `totalTramos` se calcula **antes** del filtro final por rango. Si el filtro descarta tramos, el grupo absorbe filas de la incidencia siguiente: aparecen reemplazantes "sin su titular" bajo otra licencia, y las fechas del grupo mezclan varias licencias (bug 19).
- El reporte no usa `Reemplazo.incidenciaId` en absoluto: atribuye por asignación y ventana de fechas (por eso completar ese campo no cambió nada).
- La ventana de la raíz se corta el día antes de su primera hija, y no hay segmento posterior: si la hija termina antes, los días restantes de la raíz desaparecen.
- Para una hija, el "ausente" es el último reemplazo **inactivo** de la primera clase con reemplazos. Si después se quita el de B, B figura como ausente [H: verificar con un test].
- `codigoArt` y `nombreArt` llegan en cada fila, pero el PDF no los muestra (bug 20).
- Ya existe un archivo vacío sin uso: `lib/reporting/datasets/obtenerCadenaOperativaClases.ts` (se puede borrar).

---

## 2. Reglas de negocio acordadas

1. Lo que decide si se paga es el artículo del codigario (`porcentajeComputable`), sin umbral de días y con cualquier duración de licencia.
2. Feriado dentro de una licencia con artículo que **paga**: el reemplazo sigue vigente, el suplente cobra y la clase queda `REEMPLAZADA`.
3. Feriado dentro de una licencia con artículo que **no paga**: la clase queda `SUSPENDIDA` por calendario y no hay reemplazo vigente.
4. En licencias encadenadas, cada reemplazo se evalúa con el artículo de la licencia a la que pertenece.
5. El feriado no afecta incidencias ni monto, pero sí los gráficos del Dashboard (cuenta como día no laborable, no como clase cubierta). La marca de feriado se **deriva** cruzando la fecha de la clase con `CalendarioEscolar` (activo, no eliminado, `suspendeClases`), sin cambiar el schema.
6. El cambio de distribución tiene prioridad sobre la licencia: toda clase futura de un módulo quitado pasa a `CAMBIO_DISTRIBUCION`.
7. El historial de versiones de distribución es un registro de cambios **oficiales**. Los enroques provisorios no deben destruir la versión original.
8. Pendiente de confirmar con la normativa: si la regla del punto 2 aplica a cualquier día que suspende clases o solo a los marcados `esFeriado` (en el piloto son indistintos: los 5 días tienen ambos en `true`).

---

## 3. Diseño

### 3.1. Fechas: `lib/helpers/fechaInstitucion.ts`

Funciones puras, con `ahora` inyectable y sin depender de la zona del servidor. Sirven en servidor y navegador:

- `hoyLocal(ahora, zona)`: la fecha de calendario de la institución, como medianoche UTC.
- `minutosAhora(ahora, zona)`: minutos desde la medianoche local.
- `claseTermino(fecha, horaHasta, ahora, zona)`: dictada solo cuando terminó el módulo. Para clases sin módulo (jornal) se usa el fin del turno (`turno.horaFin`).
- Zona por defecto `America/Argentina/Buenos_Aires`, configurable por institución.
- Test de arquitectura que falle si aparece `setUTCHours(0, 0, 0, 0)` o `toISOString().split("T")` fuera del helper.

Sitios a migrar (servidor): `resolucionClaseService`, `resolverClasesVencidas`, `withContext` (gate y auto-cierre), `obtenerClasesOperativas`, `eliminarAsignacion`, `eliminarDistribucion`, `nuevaVersionDistribucion` (dos veces), `reactivarIncidencia`, `asignacionRepository.listarParaIncidencia`, `distribucionRepository.cerrarVencidas`, `overview` del Dashboard (dos veces), `pdf/datasets/horarios`, y la comparación de `codigarioRepository` (`fecha_hasta < ahora`). Cliente: `clases/page`, `useIncidencias`, `periodos-operativos/page`, `AvisoPeriodoOperativo`. Los `deletedAt: new Date()` de los repositorios son timestamps y no se tocan.

### 3.2. Motor de resolución

`obtenerCondicionesVigentes` suma tres condiciones:

- `asignacionVigente`: asignación activa, no eliminada, y fecha de la clase <= `fecha_fin` si existe.
- `moduloVigente`: el `moduloId` de la clase pertenece a la distribución activa para esa fecha (para clases sin módulo, no aplica).
- `articuloPaga`: `porcentajeComputable > 0` del ítem de la incidencia vinculada (solo se consulta si hay evento de calendario).

Y valida que la incidencia vinculada siga **activa y no eliminada** (hoy confía en `incidenciaId !== null`).

Precedencia nueva (mayor a menor):

1. `FIN_ASIGNACION`
2. `CAMBIO_DISTRIBUCION`
3. `INCIDENCIA` (`REEMPLAZADA` si hay reemplazo; con evento de calendario y artículo que **no** paga, gana `CALENDARIO_ESCOLAR`)
4. `PERIODO_OPERATIVO`
5. `CALENDARIO_ESCOLAR`
6. `DICTADA` (si `claseTermino`) o `PROGRAMADA`

`resolverEstadoYCausa` sigue siendo una función pura, probada con una tabla de casos.

### 3.3. Reconciliación de asignación

`reconciliarAsignacion(asignacionId, desde, hasta)` reemplaza a `suspenderNoVigentes`, a la reactivación en `reactivarDistribucion` y a parte de `reactivarAsignacion`:

1. Calcula los módulos esperados de la distribución activa en cada fecha del rango y genera las clases que faltan (`generarParaRango`, que ahora vincula las licencias vigentes de la asignación y resuelve cada clase nueva).
2. Re-resuelve con el motor cada clase **no dictada** del rango.
3. Anula (`activo = false`, `deletedAt`) los reemplazos de clases **futuras** que dejaron de existir, con confirmación previa. Los reemplazos de fechas pasadas se conservan.

`desde` es un parámetro explícito: "Editar" corrige desde el inicio de la distribución (con advertencia si hay clases ya dictadas) y "Nueva versión" rige desde la fecha elegida. Todo dentro de una transacción.

### 3.4. Licencias y reemplazos

- Índice único parcial `(asignacionId, fecha_desde) WHERE deletedAt IS NULL`, con migración SQL, y capturar P2002 con un mensaje claro. Verificar antes que ningún código use el nombre `asignacionId_fecha_desde`.
- `verificarSuperposicion` con `obtenerAncestros` en actualizar y reactivar.
- `crearIncidencia` y el wizard exigen clases **vivas** en el rango.
- `vincularIncidencia` solo vincula clases vivas; `desvincularIncidencia` también limpia el vínculo de las `DICTADA` (sin cambiar su estado).
- Editar y eliminar licencia con reemplazos: permitir. Cambios de artículo u observación sin restricción; cambios de rango o eliminación conservan los reemplazos de fechas pasadas y desactivan los de futuras, con aviso previo. Cambiar el artículo re-resuelve las clases afectadas.
- `crearReemplazo` y `migrarReemplazoATramo` derivan `incidenciaId` de `clase.incidenciaId` cuando no llega; `crearReemplazo` rechaza clases muertas.
- Decisión pendiente: campo `agenteAusenteId` en `Incidencia` para saber explícitamente quién está ausente en una licencia hija (hoy se infiere).

### 3.5. Reporte de ausencias

- Agrupar por `incidenciaId` en el PDF y en la pantalla (no por `slice` con `totalTramos`), o recalcular `totalTramos` después del filtro final.
- Atribuir reemplazos por `Reemplazo.incidenciaId`; agregar el segmento posterior a una hija; definir el ausente de la hija de forma explícita.
- Mostrar el artículo (código y nombre) en la fila del titular.
- Borrar el archivo vacío `obtenerCadenaOperativaClases.ts`.

---

## 4. Fases (cada una con sus tests antes de seguir)

**Fase 0. Preparación.** Rama nueva. Restaurar en desarrollo un backup de la base de Ceferino (no se toca el piloto). Tests de tabla vacíos para el motor y el helper.

**Fase 1. Fechas.** Helper `fechaInstitucion`, migración de los ~22 sitios, y "dictada al terminar el módulo". Tests: cambio de día a las 21:00 locales, hora del módulo, clases de jornal.

**Fase 2. Motor.** Condiciones nuevas, precedencia y regla del artículo; `vincularIncidencia` solo a clases vivas; `crearReemplazo` rechaza clases muertas y deriva `incidenciaId`. Tests: la tabla completa de casos (estado x causa x condiciones) y los escenarios del piloto (guardar licencia con clases `CAMBIO_DISTRIBUCION`, evento de calendario sobre clase `FIN_ASIGNACION`, etc.).

**Fase 3. Reconciliación.** `reconciliarAsignacion`, `generarParaRango` con licencias, "Editar" y "Nueva versión" con `desde`, transacciones; retirar `suspenderNoVigentes`, la reactivación de `reactivarDistribucion` y `migrarReemplazoATramo`. Tests: los dos enroques de 2do A de principio a fin (con licencia vigente), edición retroactiva, módulo que vuelve.

**Fase 4. Licencias.** Migración del índice parcial, ancestros en actualizar y reactivar, edición y eliminación con reemplazos, re-resolución al cambiar el artículo, limpieza de vínculos `DICTADA`. Tests: recargar licencia tras eliminar, editar hija, eliminar con reemplazos pasados.

**Fase 5. Reportes.** Corrección de agrupación, atribución por vínculo, segmento posterior, artículo visible, borrado del archivo vacío. Tests: rango que descarta tramos (reproduce el bug 19), cadena con hija corta, reemplazo de B quitado.

**Fase 6. UX y deuda menor.** Cambio provisorio, formato de fechas (bug 14), contraste de módulos, scroll al editar, `distribucion.estado` y `activo` alineados, `calendarioEscolarId`.

**Fase 7. Despliegue.** Control de consistencia sobre una copia de la base del piloto; backup; migraciones; paquete v5; actualización de Ceferino con el procedimiento validado; reparación de datos si el control lo indica; verificación en pantalla.

---

## 5. Decisiones tomadas (22/10/2026)

1. **Reemplazos de clases que dejan de existir:** se anulan los de clases futuras, con aviso previo; se conservan los de fechas pasadas.
2. **Editar o eliminar una licencia con reemplazos:** se permite. Artículo y observación sin restricción; si cambia el rango o se elimina, se conservan los reemplazos pasados y se desactivan los futuros, con aviso.
3. **Agente ausente de una licencia hija:** campo explícito `agenteAusenteId` en `Incidencia` (cambio de schema, con completado único de los datos existentes).
4. **Enroques provisorios:** versión marcada "provisoria", con fecha de fin y vuelta automática al horario anterior; queda en el historial identificada como provisoria.
5. **Regla de feriados:** vale para cualquier día que suspende clases (`suspendeClases`). Provisoria: confirmar con la normativa. Hoy no hay diferencia con `esFeriado` en el piloto.
6. **"Editar" con clases ya dictadas:** se permite con advertencia ("estás reescribiendo el pasado"); por defecto solo desde hoy.
7. **Zona horaria:** fija en `America/Argentina/Buenos_Aires` por ahora (el helper queda preparado para volverla configurable).

Sin decisiones abiertas para arrancar la Fase 1. Pendiente de la Fase 2 en adelante: verificar con un test las hipótesis marcadas **[H]**.

## 6. Riesgos

- Los cambios del motor alteran estados de clases existentes. Se mitiga con el control de consistencia sobre una copia de la base y con backup antes de desplegar.
- La migración del índice parcial requiere SQL manual: Prisma no lo expresa y puede detectarlo como desvío del schema.
- Mientras no se despliegue: no guardar licencias de asignaciones con cambios de distribución, no usar "Editar" para enroques provisorios, correr el control de consistencia tras cada cambio grande y hacer backup antes.