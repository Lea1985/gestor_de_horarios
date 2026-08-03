# Punto de partida — sesión de testeo manual del motor (31/07–03/08/2026)

Continuación de `punto-de-partida-2026-07-29.md`. Esa sesión cerró con el ambiente auditado, Escuela N°12 reseteada (preservando Codigario) y un script de seed determinista escrito pero sin correr. En vez de correr ese script, se decidió testear el motor a mano, directamente contra la UI, con un plan propio del usuario (checkpoints con cantidades esperadas). Esta sesión se dividió en dos partes: motor generador de clases primero, motor de reconciliación después. El plan original del Dashboard sigue sin arrancar — quedó pospuesto otra vez.

---

## Hilo 1 — Motor generador de clases (validación manual)

Carga base en Escuela N°12, hecha a mano vía UI: 2 profesores (Leandro Alegre id=1, Juan Pedro Ramos id=2), 1 turno "Mañana", 1 aula, 1 curso, 1 materia, 1 comisión, módulos horarios, y un `PeriodoOperativo` "Periodo de prueba 1" (01/08–31/08/2026).

**Punto de control 0 — distribución sin período activo.** Se cargó la asignación del profesor 1 y su distribución (2 módulos, lunes) antes de crear el período. Confirmado: 0 `ClaseProgramada`. La distribución sola no genera nada sin período activo.

**Caso 1 — activación del período.** Con el período en BORRADOR, seguía en 0. Al activarlo: 10 `ClaseProgramada` generadas exactas (5 lunes de agosto × 2 módulos: 03,10,17,24,31), todas `PROGRAMADA`/`NINGUNA`, sin duplicados. Pasa limpio.

**Caso 2 — nueva distribución con período ya ACTIVO → bug real encontrado y corregido.** Se creó la asignación del profesor 2 y una distribución nueva (miércoles), con el período ya ACTIVO. Resultado esperado: 8 clases nuevas (4 miércoles de agosto × 2 módulos), total 18. Resultado real: **44 clases** — la distribución generó desde el 06/05/2026 hasta el 26/08/2026 (17 miércoles), ignorando el inicio del período (01/08).

Causa raíz: `lib/usecases/distribuciones/asignarModulos.ts` tomaba `desde = distribucion.fecha_vigencia_desde` directo, sin clampearlo contra `periodo.fecha_desde` — a diferencia de `crearDistribucion.ts`, que sí lo hace (`desdeGenerar = max(desde, periodo.fecha_desde)`). Esa misma variable sin clampear también afectaba `resolverCoberturaDelTramo` y `suspenderNoVigentes` dentro de la misma función, no solo la generación final.

**Fix aplicado:** se agregó el mismo clamp en `asignarModulos.ts`:
```js
const desde = distribucion.fecha_vigencia_desde > periodo.fecha_desde
  ? distribucion.fecha_vigencia_desde
  : periodo.fecha_desde
```
Verificado: tras borrar las 34 clases de más y reintentar, generó exactamente las 8 esperadas (05,12,19,26/08). Total 18. Pasa.

**Caso 3 — extender un período ACTIVO.** `actualizarPeriodo.ts` bloquea explícitamente el cambio de `fecha_desde`/`fecha_hasta` mientras el período está ACTIVO (`CampoEstructuralEnPeriodoActivoError`). No es un bug — es una regla de negocio deliberada, y correcta: `actualizarPeriodo.ts` no dispara ninguna reconciliación de clases, así que si se permitiera el cambio silenciosamente, el período diría "activo hasta tal fecha" sin haber generado nada para el tramo nuevo. Se decidió dejarlo bloqueado tal cual, y anotar como mejora futura (no bug) construir un usecase dedicado `extenderPeriodo.ts` que sí reconcilie antes de mover la fecha.

**Reconciliación por cambio de distribución (mismo Caso 2, extendido).** Se reasignaron los módulos de la distribución del profesor 2 de miércoles a jueves, y después de vuelta a miércoles, usando "editar" (no "nueva distribución"). Resultado: las 8 clases de miércoles pasaron a `SUSPENDIDA`/`CAMBIO_DISTRIBUCION` (no se borraron), se generaron 8 de jueves, y al volver a miércoles las 8 originales se **reactivaron con los mismos ids** (no se duplicaron) mientras las de jueves quedaron suspendidas de historial. Total se mantuvo en 26 en todo momento. Pasa limpio — el mecanismo de suspensión/reactivación funciona.

**Hallazgo de UI (no bug de datos) — mensaje de "Nueva versión".** Al probar el botón "Nueva distribución" (usecase `nuevaVersionDistribucion.ts`, distinto de "editar"/`asignarModulos`), la UI advertía "Las clases futuras se eliminarán". Se revisó el usecase real: nunca borra `ClaseProgramada`, solo las suspende (mismo patrón de siempre) y las reutiliza cuando se completa la nueva versión con módulos. El mensaje era simplemente incorrecto.

**Fix aplicado:** se corrigió el texto en `features/modulosDistribucion/components/ModalNuevaVersion.tsx` para reflejar el comportamiento real (suspensión, no eliminación).

### Estado del motor generador al cierre — no 100% validado

Validado: generación desde cero, generación incremental con período activo, bloqueo correcto de extensión de período, y reconciliación bidireccional por cambio de módulos (suspensión + reactivación).

Sin probar: el flujo completo de "nueva versión" ejecutado de punta a punta con datos reales (solo se corrigió el mensaje, no se ejecutó para confirmar que el código hace lo que dice); eliminar una distribución (`eliminarDistribucion`, mencionado en comentarios pero nunca abierto); fin de asignación (causa `FIN_ASIGNACION` del enum, nunca disparada); y qué pasa si ya existe un feriado de calendario **antes** de generar clases nuevas para esa fecha (hoy solo se probó calendario aplicado después de la generación).

---

## Hilo 2 — Motor de reconciliación (incidencias + calendario + reemplazos)

Se decidió testear el triángulo completo (no solo incidencias y calendario como se planteó al inicio, sino también reemplazos, por ser el tercer vértice que compite por el mismo campo `estado`/`causa`).

**R1 — Incidencia sola.** Incidencia sobre Asignación 1, 10/08–17/08, código 5.a (Enfermedad corta duración). Las 4 clases del rango pasaron correctamente a `SUSPENDIDA`/`INCIDENCIA` con `incidenciaId` seteado. El resto intacto. Pasa.

**R2 — Incidencia + reemplazo.** Se asignó reemplazo (agente id=2, Juan Pedro Ramos) individualmente a cada una de las 4 clases. Las 4 pasaron a `REEMPLAZADA`/`INCIDENCIA`, con 4 filas en `Reemplazo`, 1 a 1, sin duplicados. Pasa.

**R3 — Calendario sobre clase PROGRAMADA (control).** Feriado el 24/08 sobre una clase sin incidencia. Pasó correctamente a `SUSPENDIDA`/`CALENDARIO_ESCOLAR`. Pasa.

**R4 — Calendario sobre clase ya REEMPLAZADA (precedencia).** Feriado el 10/08, mismo día que una clase ya `REEMPLAZADA`. Confirmado: no la tocó — `recalcularSuspendidasPorCalendario` filtra por `estado: PROGRAMADA`, así que respeta clases ya resueltas por otra causa. Pasa.

**R5 — Eliminar la incidencia → bug real encontrado y corregido.**

R5a: se intentó borrar la incidencia con las 4 clases todavía `REEMPLAZADA` (reemplazos activos) → rechazado correctamente con `TieneReemplazosError`. Regla de protección funciona.

Se borraron los 4 reemplazos (`eliminarReemplazo`, que sí llama a `resolverClase` — las clases volvieron correctamente a `SUSPENDIDA`/`INCIDENCIA`, todavía con la incidencia activa). Se borró la incidencia. Resultado esperado: el 17/08 (sin feriado) vuelve a `PROGRAMADA`/`NINGUNA`; el 10/08 (con el feriado real de R4 en la misma fecha) debería volver a `SUSPENDIDA`/`CALENDARIO_ESCOLAR`. Resultado real: **las dos fechas volvieron a `PROGRAMADA`/`NINGUNA`** — el feriado del 10/08 se ignoró.

Causa raíz, en `lib/services/resolucionClaseService.ts` (el Motor de Resolución real, `resolverClase`/`obtenerCondicionesVigentes`/`resolverEstadoYCausa`, con tabla de precedencia INCIDENCIA > PERIODO_OPERATIVO > CALENDARIO_ESCOLAR > NINGUNA): `tieneEventoCalendario` se determinaba leyendo el campo `calendarioEscolarId` ya cacheado en la fila de `ClaseProgramada`, en vez de consultar `CalendarioEscolar` en vivo. Ese campo solo se setea cuando la clase está `PROGRAMADA` en el momento de crear el evento (`recalcularSuspendidasPorCalendario` filtra así) — como el 10/08 estaba `REEMPLAZADA` cuando se creó el feriado en R4, nunca se linkeó, y el motor nunca se enteró de que existía. El propio código tenía un comentario del autor marcando esto como "supuesto sin confirmar".

**Fix aplicado:**
- `lib/types/claseProgramada.ts`: se agregó `eventoCalendarioId: number | null` a `CondicionesVigentes`.
- `lib/services/resolucionClaseService.ts`: `obtenerCondicionesVigentes` ahora consulta `CalendarioEscolar` en vivo por fecha (institución + período vigente + fecha + `suspendeClases` + activo), en vez de confiar en el FK cacheado. `resolverClase` ahora sincroniza `calendarioEscolarId` en cada resolución (lo setea si la causa final es `CALENDARIO_ESCOLAR`, lo limpia si no), para que deje de ser una caché que se puede desactualizar.
- Verificado con un script aparte (`prisma/verificar-fix-calendario.ts`, corrido con `npx tsx` porque `node --loader ts-node/esm` no resuelve imports relativos sin extensión en este proyecto — hallazgo aparte, sin impacto en producción): las clases del 10/08 se re-resolvieron a `SUSPENDIDA`/`CALENDARIO_ESCOLAR` con `calendarioEscolarId=2` (el evento real, ya no huérfano); las del 17/08 (control) no cambiaron, correctamente. Confirmado también contra la base con SQL directo.

### Estado del motor de reconciliación al cierre — no 100% validado

Validado: incidencia sola, incidencia + reemplazo, calendario respetando ambas causas activas, y la re-resolución al eliminar una incidencia (incluido el bug de calendario huérfano, ya corregido).

Sin probar: incidencias encadenadas (existe todo un concepto de "incidencia hija" — `incidenciaPadreId`, `lib/usecases/incidencias/obtenerCadena.ts`, `lib/usecases/reemplazos/reasignarReemplazoAIncidencia.ts` — nunca abierto ni tocado hoy); la causa `PERIODO_OPERATIVO` de la tabla de precedencia (nunca hubo una clase fuera del período vigente durante la sesión); editar una incidencia ya creada (`actualizarIncidencia.ts`); reactivar una incidencia o un evento de calendario borrado (`reactivarIncidencia.ts`, `reactivarCalendarioEscolar.ts`).

**Riesgo identificado pero no probado, candidato fuerte para el próximo bug:** `claseProgramadaService.suspenderNoVigentes` (usada por `asignarModulos`) filtra las clases existentes por `estado` (`PROGRAMADA`, `SUSPENDIDA`, `REEMPLAZADA`) **sin filtrar por `causa`**. Si una clase está `SUSPENDIDA` por `INCIDENCIA` y se cambia la distribución de forma que esa fecha ya no corresponde a los módulos nuevos, hay riesgo de que la pise con `CAMBIO_DISTRIBUCION`, perdiendo la causa real de incidencia. Es el mismo patrón que los otros bugs de hoy: dos mecanismos que no se conocen entre sí. No se probó por falta de tiempo.

---

## Bug transversal — fechas corridas por timezone (parcialmente resuelto)

Detectado en el wizard de "Nueva incidencia": una clase con `fecha = 2026-08-10T00:00:00Z` se mostraba como "dom 09-08" en vez de "lun 10-08". Causa: `ClaseProgramada.fecha` se guarda en Postgres como `timestamp without time zone` a medianoche, Prisma la lee como si fuera UTC, y el frontend la formateaba con `toLocaleDateString` sin especificar `timeZone: "UTC"` — el navegador la convertía a hora de Argentina (UTC-3), corriendo el día para atrás.

**Fix aplicado (solo en el archivo que se estaba usando):** `formatearFecha` en `features/incidencias/hooks/useNuevaIncidencia.ts`, agregando `timeZone: "UTC"`.

**Pendiente — 9 archivos más sin auditar**, todos con `toLocaleDateString`/`toLocaleString` y sin ninguna utilidad central de fechas en el proyecto (confirmado: no existe ningún archivo `fecha*.ts`/`date*.ts`):
- `app/protected/dashboard/periodos-operativos/page.tsx`
- `app/protected/dashboard/reportes/ausencias/page.tsx`
- `app/protected/dashboard/reportes/modulos-computables/page.tsx`
- `app/protected/dashboard/reportes/asignaciones/page.tsx`
- `app/protected/dashboard/reportes/profesor/page.tsx`
- `features/modulosDistribucion/components/ModalMigrarReemplazos.tsx`
- `features/dashboard/components/MapaCalorSemanal.tsx`
- `features/distribuciones/components/ModalEliminarConReemplazo.tsx`
- `lib/pdf/generator.ts`

Ojo: no todos estos archivos están necesariamente rotos — el bug aparece solo al formatear campos "solo fecha" (`fecha`, `fecha_desde`, `fecha_hasta`, `fecha_vigencia_desde/hasta`), no al formatear `createdAt`/`updatedAt` (timestamps reales, donde la conversión a hora local sí es correcta). Cada archivo hay que revisarlo individualmente antes de tocarlo.

---

## Bug de UI — checkbox de reemplazos bloqueado en el wizard de incidencias

En el paso 4 ("Reemplazos") del wizard de "Nueva incidencia", los checkboxes para asignar suplente aparecían con el cursor de "prohibido", sin responder al click. Causa: tanto `features/incidencias/components/PasoReemplazos.tsx` como `features/incidencias/hooks/useNuevaIncidencia.ts` filtraban las clases elegibles por `estado === "PROGRAMADA"` — pero en ese paso del wizard la incidencia ya se creó y ya suspendió las clases, así que **nunca están en PROGRAMADA**, siempre en `SUSPENDIDA`. El filtro estaba invertido en 6 lugares distintos entre los dos archivos. Confirmado con la propia UI: el encabezado decía "0 clases programadas en el rango de la incidencia" mientras la tabla de abajo mostraba 4 filas reales.

**Fix aplicado:** se cambiaron los 6 filtros de `"PROGRAMADA"` a `"SUSPENDIDA"` en ambos archivos (con variables renombradas de `programadas`/`esProgramada` a `elegibles`/`esElegible` para que el código diga lo que hace). Verificado sin riesgo de romper compilación (`grep` confirmó cero tests que construyan `CondicionesVigentes` o referencien estas funciones a mano). Probado en vivo con R1/R2 — el checkbox respondió y se pudo asignar el suplente.

---

## Resumen de los 5 bugs de hoy

| # | Dónde | Qué pasaba | Fix |
|---|---|---|---|
| 1 | `lib/usecases/distribuciones/asignarModulos.ts` | Generaba clases desde la vigencia de la distribución, ignorando el inicio del período ACTIVO | Clamp `desde = max(fecha_vigencia_desde, periodo.fecha_desde)` |
| 2 | `features/modulosDistribucion/components/ModalNuevaVersion.tsx` | Mensaje decía "se eliminarán" cuando en realidad se suspenden y preservan | Corregido el texto |
| 3 | `features/incidencias/hooks/useNuevaIncidencia.ts` | Fechas de clases mostradas un día antes por timezone | `timeZone: "UTC"` en `toLocaleDateString` (quedan 9 archivos más por revisar) |
| 4 | `PasoReemplazos.tsx` + `useNuevaIncidencia.ts` | Checkbox de reemplazo permanentemente bloqueado (filtro invertido) | Cambiado el filtro de `PROGRAMADA` a `SUSPENDIDA` en 6 lugares |
| 5 | `lib/services/resolucionClaseService.ts` | Al eliminar una incidencia, un feriado real en la misma fecha se ignoraba (FK cacheado nunca seteado) | `tieneEventoCalendario` pasa a consultarse en vivo contra `CalendarioEscolar` |

---

## Pendiente para la próxima sesión

1. Auditar los 9 archivos restantes con `toLocaleDateString`/`toLocaleString` — confirmar cuáles formatean campos de fecha pura (afectados) vs. timestamps reales (no afectados), y corregir los que correspondan.
2. Probar `suspenderNoVigentes` con una clase `SUSPENDIDA`/`INCIDENCIA` cuando cambia la distribución — sospecha fuerte de que pisa la causa con `CAMBIO_DISTRIBUCION` sin filtrar por causa actual.
3. Ejecutar de punta a punta el flujo de "nueva versión" de una distribución (hoy solo se corrigió el mensaje, nunca se probó con datos reales).
4. Probar incidencias encadenadas (`incidenciaPadreId`, cadena de reemplazos) — no se tocó en ningún momento.
5. Probar la causa `PERIODO_OPERATIVO` de la tabla de precedencia — nunca hubo una clase fuera de rango del período vigente durante los tests.
6. Probar editar una incidencia ya creada, y reactivar una incidencia/calendario borrado.
7. Probar eliminar una distribución y el flujo de fin de asignación (`FIN_ASIGNACION`).
8. Commitear todo lo de hoy: nada de los 5 fixes se subió a git todavía durante la sesión.
9. Retomar el plan del Dashboard (Fase 1, inventario de métricas) — sigue sin arrancar, pospuesto por tercera vez.
10. El seed real de Codigario + Colegio Ceferino sigue en espera, sin cambios desde el 29/07.

## Estado general al cierre

Se probó a mano, con datos reales y verificación por SQL en cada paso, el motor generador de clases y el motor de reconciliación de ALNEXT. Se encontraron y corrigieron 5 bugs reales (uno de generación de fechas, uno de mensaje de UI, uno de timezone, uno de checkbox bloqueado, y uno de resolución de estado con calendario huérfano), todos confirmados con evidencia empírica antes y después del fix, no solo revisando código. Ningún motor quedó validado al 100% — quedan zonas concretas sin probar en cada uno, documentadas arriba, y un riesgo concreto identificado (`suspenderNoVigentes` sin filtrar por causa) que es el candidato más fuerte para el próximo bug real.