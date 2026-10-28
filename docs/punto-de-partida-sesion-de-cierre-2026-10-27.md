# ALNEXT · Punto de partida (sesión de cierre 27/10/2026)

Continúa el informe del 26/10 (Fase 3 validada). Hoy se arrancó la **Fase 4 (licencias)** del plan `docs/plan-correccion-motor-clases-2026-10-22.md`: diagnóstico completo, decisiones de negocio y **commits 1 a 5 hechos** (incluye B, los reemplazos en pausa) más un commit de tests. El plan del commit 6 (editar y eliminar licencias con reemplazos) está **presentado y a la espera de aprobación**: quedan tres preguntas por confirmar (sección 6 bis).

## 1. Estado general

- Rama de trabajo: `fix/motor-clases-fase-4`, creada desde `fix/motor-clases-fase-3` (3b60c87). Head al cierre de este informe: `c4e31d8` (tests de `escenariosPiloto` tras B; el commit 5 de B es `a36446b`). Verificar el push. **Verificar que esté pusheada:** `git -c http.version=HTTP/1.1 push -u origin fix/motor-clases-fase-4`.
- Pila de ramas (lineal): `feature/instalador-alnext` (0e85d77) > `fix/motor-clases-fase-1` (27d26bc) > `-fase-2` (452a771) > `-fase-3` (3b60c87) > `-fase-4` (51c7a3b). Nada fusionado todavía.
- La copia local de Ceferino (`alnext_ceferino`) está limpia (restaurada de `~/datos_ceferino/base_copia_limpia.dump`); **la migración M1 todavía no se aplicó a ella** (solo a `gestor_test`). La app de desarrollo no está corriendo.

## 2. Commits de hoy (fase-4)

| Commit | Contenido | Tests |
|---|---|---|
| `457f55e` | docs: informe de cierre del 26/10 | — |
| `0f4595d` | **M1.** Índice único parcial `(asignacionId, COALESCE(incidenciaPadreId,0), fecha_desde) WHERE deletedAt IS NULL`; se saca el `@@unique` del schema. El P2002 pasa a `IncidenciaDuplicadaError` (409) al crear, editar y reactivar. Limitación de Prisma (no expresa índices parciales; un `migrate dev` futuro generaría un DROP INDEX) documentada en la migración y en `docs/migraciones-sql-manuales.md`. Aplicada solo a `gestor_test`. | licencias 4/4, escenariosPiloto 5/5, vinculoIncidencia 3/3, checkMigraciones 2/2 |
| `6735cb4` | **Ancestros.** `excludeId` y `excludeIds` en un solo `notIn` (antes el segundo pisaba al primero). Editar: excluye ancestros y solo revisa superposición si cambia el rango. Reactivar: excluye ancestros; una hija solo vuelve si la padre está viva y la contiene (400 si no). | licencias 10/10 |
| `51c7a3b` | **Clases vivas.** `crearIncidencia` y `tieneClasesVigentes` del wizard ignoran `FIN_ASIGNACION` y `CAMBIO_DISTRIBUCION`. | licencias 13/13, reconciliacion y enroques2doA OK |
| `a36446b` | **B: reemplazos en pausa.** Helper `lib/helpers/reemplazoPausado.ts`; la hija pausa los reemplazos de los ancestros en sus clases y al eliminarla (o achicarla) se reanudan solo en clases vivas sin otro reemplazo activo; cada licencia muestra su propio reemplazo; el ausente de una hija sale del reemplazo pausado de la padre (absorbe A1); auto-reemplazo bloqueado; `profesor.ts` excluye los pausados. Documentado en `docs/reemplazos-en-pausa.md`. | 10 tests nuevos en `licencias` (describe "reemplazos en pausa (B)"); build y tsc limpios; `gestor_test` sin residuos |

Verificación contra la línea de base (tras el commit 5): sin servidor, 222 pasan y 2 se saltean (212 + 10 nuevos), sin fallos nuevos; 17 suites HTTP con los mismos 42 fallos por nombre (26 "rechaza sin tenant" y los 16 nombrados); `rutasReconciliacion` 5/5. Antes del commit 5: 212 pasan y 2 se saltean en 24 archivos (199 anteriores + 13 de `tests/licencias.test.ts`). Suites HTTP (servidor propio 3100, `gestor_test`): incidencias 6, asignaciones 3 y reemplazos 4 fallan, los mismos nombres de `docs/suites-comparacion-http.md`; `rutasReconciliacion` 5/5. Build y tsc limpios en los tres commits.

Incidente de test: la primera corrida de `licencias` falló en la limpieza (la hija del mismo día chocaba con su padre al poner `incidenciaPadreId` en null) y dejó residuos de dos instituciones de test en `gestor_test`; se limpiaron con una guardia que verifica la base. Ahora la limpieza borra de las hojas a la raíz.

Control de M1 sobre la copia de Ceferino (solo lectura): 0 duplicados vivos y 0 filas con `activo`/`deletedAt` incoherentes.

## 3. Diagnóstico de la Fase 4 (resumen)

Causas confirmadas con un test de reproducción temporal:
- **Bug 8 y 500 de la hija del mismo día:** el `@@unique (asignacionId, fecha_desde)` cubre también filas eliminadas y choca la hija con su propia padre; el P2002 sin capturar cae al 500 genérico. El índice parcial solo por `deletedAt` no alcanzaba (la padre está viva): por eso la unicidad es por padre.
- **Editar/reactivar una hija falla siempre:** superposición sin ancestros (y `excludeId`/`excludeIds` pisándose).
- **Bug 9:** editar y eliminar con reemplazos está bloqueado; sin transacción; `desvincularIncidencia` no recibe `db`.
- **Bug A (la hija "desaparece" del listado):** no desaparece. El ausente de la hija se infiere del último reemplazo inactivo (`incidenciaRepository.ts`, `obtenerSuplenteSaliente`): al quitar el reemplazo de Cubre, el listado la muestra con Cubre como agente, y la búsqueda por el titular o por el reemplazante de la padre no la encuentra (confirmado por Leandro). Sin reemplazo la hija figura como "Vacante".
- **Cadenas (B):** hoy la padre deja de mostrar a Lelli el día D; una hija sin cobertura deja la clase `REEMPLAZADA` por Lelli (debería quedar `SUSPENDIDA`); al eliminar la hija Lelli no vuelve; eliminar una hija con el reemplazo de la padre activo da `TieneReemplazosError`.

## 4. Decisiones de negocio tomadas (27/10)

1. Una hija puede empezar el mismo día que la padre; unicidad solo entre licencias vivas del mismo padre.
2. **Eliminar una licencia con clases ya terminadas:** se acorta hasta el último día terminado (`claseTermino`), queda viva, se anulan los reemplazos futuros con aviso previo; solo se borra del todo si no tiene nada pasado. Las hijas que queden más allá se acortan o eliminan con la misma regla. Borrar también el pasado queda fuera de la fase.
3. Acortar el rango dejando afuera clases pasadas con reemplazo: se rechaza.
4. Padre con hijas: se puede cambiar artículo y observación; el rango sigue bloqueado.
5. Cambio de artículo que altera clases pasadas: pide confirmación ("cambia el pasado") con la cantidad afectada.
6. **B, reemplazos "en pausa"** (`activo=false` y `deletedAt` NULL): aprobado (ver sección 5).
7. **M2 (`agenteAusenteId`):** se completa también en las raíces con el titular vigente al inicio; los ambiguos quedan en NULL con corrección manual (UI "Ausente sin determinar"). Aprobación aparte, al final.
8. **Reporte de profesor (`lib/pdf/datasets/profesor.ts`):** el reemplazo en pausa de Lelli **no** cuenta como clase dada por ella; se excluye de su reporte. (La ausencia queda visible en el reporte de ausencias de la Fase 5.)

## 5. B, reemplazos en pausa (commit 5, hecho)

Detalles extra del resultado: el buscador del listado de incidencias mira el ausente (con B, la hija se encuentra por "Lelli"; por el titular X no aparece, eso es el filtro por profesor de la Fase 6). `ClasesAfectadasTable` muestra en la padre "Lelli — ausente (licencia #N)" en los días tomados por la hija. Queda para la Fase 5 `pdf/datasets/ausencias.ts:231-239`, que todavía infiere el saliente con el "último inactivo". Diseño aprobado:

Semántica: "Lelli sigue reemplazando a X ese día, pero no está cubriendo la clase". Se mantiene un solo reemplazo activo por clase; el motor, el Dashboard y los conteos no cambian.
- Al crear una hija (o ampliar su rango): se pausan los reemplazos activos de los ancestros en las clases que pasan a la hija, haya cobertura o no.
- Al eliminar una hija (o achicar su rango): en las clases que vuelven a la padre se reanuda el reemplazo pausado, solo si la clase sigue viva y no tiene otro reemplazo activo.
- Cada licencia muestra su propio reemplazo (activo o en pausa); el ausente de una hija es el suplente pausado de la padre. Esto absorbe el parche A1.
- Helper único `lib/helpers/reemplazoPausado.ts` (`esPausado`, `WHERE_PAUSADO`, `pausarDeAncestros`, `reanudarEnClases`).
- Auditoría de las 27 lecturas de `Reemplazo`: la mayoría ya filtra `activo: true`. Cambian `obtenerCoberturaPorTramos`, `obtenerAgenteQueSeReemplaza`, `obtenerSuplenteSaliente`, `IncidenciaDetalleHeader`, y se verifica `ModalAusenciaSuplente`/`reasignarReemplazoAIncidencia`.
- No hay constraints únicos sobre `Reemplazo` que choquen con un pausado ("un activo por clase" se controla en código).
- Límite conocido (anotado): si la reconciliación crea una clase nueva dentro del rango de una hija con "mantener suplente", no se crea el pausado de Lelli para la padre.
- Diff pendiente de `escenariosPiloto`: el comentario del test 5 queda desactualizado (la hija puede empezar el mismo día); el test 4 suma asserts de pausa. Se muestra antes de tocarlo.

## 6. Plan restante de la Fase 4

| # | Contenido | Estado |
|---|---|---|
| 5 | B: pausa, cobertura por licencia, auto-reemplazo (absorbe A1) | **hecho (`a36446b`)** |
| (tests) | `c4e31d8`: `escenariosPiloto` (test 4 con asserts de pausa, test 5 solo comentario), 5/5 | hecho |
| 6 | Editar y eliminar con reemplazos: `RequiereConfirmacionLicenciaError`, 409 con aviso, acortar, transacción con `db` (incluye `desvincularIncidencia`). Se divide en 6a (eliminar, backend), 6b (editar rango, backend) y 6c (frontend) | plan presentado, falta responder 3 preguntas |
| 7 | Cambio de artículo re-resuelve las clases vinculadas y pide "cambia el pasado" (commit separado, misma aprobación que el 6) | propuesto |
| 8 | **M2:** `agenteAusenteId` y completado de datos (script de verificación de solo lectura primero) | aprobación aparte |
| 9 | Dejar de inferir el ausente (listado, detalle, modal, validaciones) | depende de 8 |

### 6 bis. Plan presentado del commit 6 (editar y eliminar licencias)

Orden: 6a eliminar (`lib/services/licenciaService.ts` con `recortarLicencia(tx, id, corte | null, ahora)` que trata a la licencia y a todas sus descendientes; `eliminarIncidencia` y la ruta DELETE) > 6b editar el rango (`actualizarIncidencia` sin `TieneReemplazosError`, ruta PATCH, rechazo por reemplazos pasados) > 6c frontend (modal compartido `ModalAvisoLicencia`, `useEditarIncidencia`, `useIncidenciaDetalle`, `useIncidencias`, `incidenciasService`, página de detalle, `IncidenciasTable`, pantalla de editar) > 7 artículo.

**Patrón:** un solo "ahora" por operación (`claseTermino` con módulo, si no turno); todo en `prisma.$transaction(tx)` con `db` en cada paso (`desvincularIncidencia(id, db, { desde? })` desvincula solo las clases posteriores al corte; `resolverClasesIncidencia` también recibe `db`); el aviso se calcula dentro de la transacción y, sin confirmación, lanza `RequiereConfirmacionLicenciaError(aviso)` y revierte; la ruta responde 409 `{ requiereConfirmacion: true, aviso }` y el reintento lleva `{ confirmarAnulacion: true }` (y `reescribirPasado` en el commit 7). El aviso incluye modo (acortar/eliminar), corte, reemplazos a anular (con estado activo/pausado), conservados, hijas acortadas/eliminadas y reemplazos reanudados.

**Eliminar:** corte = último día terminado del rango (incluye días de las hijas). Sin clases terminadas: se borra del todo con sus descendientes. Con clases terminadas: queda viva con `fecha_hasta = corte`; las hijas posteriores al corte se eliminan y las que lo cruzan se acortan; se anulan (`deletedAt = ahora`) los reemplazos de la licencia y sus descendientes posteriores al corte (activos y en pausa); lo del corte hacia atrás no se toca. Pide confirmación siempre que acorte, anule reemplazos o toque hijas; un borrado sin reemplazos ni hijas sigue igual que hoy. Desaparece `TieneHijosError` al eliminar.

**Editar:** artículo y observación nunca piden aviso. Achicar el rango: se rechaza (`AcortarConReemplazosPasadosError`) si una clase terminada que queda afuera tiene reemplazo de la licencia; los reemplazos de clases futuras que quedan afuera se anulan con aviso; solo se desvinculan las clases que salen. Ampliar: como hoy. Padre con hijas: artículo y observación sí, rango sigue con `TieneHijosError`.

**Interacción con B:** al acortar o eliminar una hija H (padre P), las clases posteriores al corte vuelven a P y se reanudan los pausados de P (solo en clases vivas y sin otro activo; si la clase está dada de baja el pausado se anula); hasta el corte queda todo en H (pausado de P y cobertura de H). La cobertura de H en fechas futuras se anula con aviso (esto reemplaza el bloqueo `TieneReemplazosError`). Eliminar una padre con hija anula el reemplazo de Lelli, el pausado de los días de H y el de Cubre. En tres niveles (A > H > N), al eliminar H, N corre la misma suerte y en las clases futuras se anulan los reemplazos de N y el pausado de H y se reanuda el de A.

**Textos del modal (ejemplos):** "Esta licencia ya tuvo clases hasta el 26/10/2026: no se borra, se cierra en esa fecha. Se conservan 2 reemplazos ya dados (Lelli: 19/10 y 26/10). Se anulan 3 reemplazos de fechas futuras (Lelli: 02/11, 09/11, 16/11). La licencia hija #45 (09/11) se elimina porque todavía no empezó." Botón: Cerrar la licencia el 26/10. Sin pasado: "La licencia todavía no tuvo clases: se elimina. Se anulan 2 reemplazos…". Rechazo al acortar: "No se puede acortar la licencia antes del 26/10: ese día ya hubo un reemplazo dado (Lelli)…". Artículo (commit 7): "Cambiar el artículo cambia el pasado: 1 clase ya terminada cambia de estado…".

**Casos de prueba** (reloj 27/10 a las 10:00; clases los lunes a las 8:00: 19/10 y 26/10 terminadas; 02, 09 y 16/11 futuras): E1 eliminar sin reemplazos (borra sin aviso); E2 con Lelli (409 anula 3; con confirmación, borrada); E3 P del 19/10 al 16/11 (corte 26/10, anula 3, 19 y 26/10 `REEMPLAZADA`, el resto `PROGRAMADA`); E4 licencia ya transcurrida (409 "ya transcurrió"); E5 P con H futura (P acortada, H eliminada, se anulan Lelli, pausado y Cubre); E6 P con H que cruza el corte (las dos acortadas al 26/10); E7 eliminar H futura con Cubre (409; luego Lelli se reanuda); E8 H que cruza el corte; E9 tres niveles; E10 clase dada de baja (el pausado se anula, no se reanuda); U1 a U7 (editar: observación/artículo sin aviso, acortar con aviso, rechazos por reemplazo pasado, ampliar, padre con hijas, hija); R1 a R4 (artículo, commit 7: feriado futuro sin aviso, feriado pasado con "cambia el pasado", volver al artículo que paga, los días de la hija no cambian); más una prueba de ruta del 409 y el reintento confirmado. Un test existente cambia: `tests/incidencias.test.ts` (HTTP, "Camino INCIDENCIA") elimina licencias de agosto de 2026 y espera `deleted: true`; con la decisión 2 se acortarían. Ya está entre los 42 fallos conocidos pero cambiaría el motivo: propuesta pasarle las fechas al futuro, mostrando el diff antes de tocarlo.

**Preguntas abiertas (a confirmar mañana) y mi recomendación:**
1. Eliminar una licencia ya transcurrida por completo: rechazar con 409 "ya transcurrió completa" (recomendado; borrar también el pasado queda como opción explícita futura, fuera de esta fase).
2. Una clase terminada sin reemplazo que queda afuera al editar el rango (pasaría de `SUSPENDIDA` a `DICTADA`): pedir "cambia el pasado" con la cantidad de clases (recomendado, igual que la regla de la reconciliación).
3. Commit 7 (artículo) separado, con la misma aprobación que el 6: sí.
Además: aprobar el cambio de fechas de `tests/incidencias.test.ts` mostrando el diff antes.

**Riesgos anotados:** Dashboard: "reemplazos activos" y "vencen esta semana" bajan por las anulaciones; una licencia acortada al pasado sale de "vigentes hoy" (correcto); "Eliminar" ya no la saca del listado si tuvo pasado (queda cerrada). Fase 5: sus días pasados siguen en los reportes (es lo buscado); cambian las ventanas por fechas de las hijas acortadas; el reporte del profesor incluye reemplazos anulados como historial, por lo que entrarían reemplazos futuros que nunca se dieron: excluir en la Fase 5 los que se anularon antes de que terminara la clase. Deshacer: una licencia acortada no tiene "reactivar"; se amplía editándola, pero los reemplazos anulados no vuelven y hay que cargarlos de nuevo (candidato a nota de UX en la Fase 6).

**Pruebas manuales previstas en la copia de Ceferino (commit 6):** eliminar una licencia que ya tuvo clases (texto del modal, corte, conservados y anulados); eliminar una futura con reemplazos; eliminar una hija con cobertura y verificar que la padre recupera a su suplente; eliminar una padre con hijas; acortar con reemplazos (caso permitido y rechazado); cambiar artículo y observación de una padre con hijas; cambio de artículo con feriado pasado (commit 7); `impacto-motor` después de cada prueba.

Al final de la fase: pruebas manuales en la copia de Ceferino (aplicar M1 con `prisma migrate deploy` solo a la copia, comprobar `\d "Incidencia"`; recargar una licencia eliminada con la misma fecha; hija el mismo día que la padre; la cadena de Lelli con y sin cobertura; eliminar o acortar con reemplazos pasados y futuros; cambio de artículo con feriado; script de M2 y casos ambiguos; `impacto-motor` tras cada etapa), suites completas contra los 42 fallos, informe de cierre.

## 7. Hallazgos nuevos (fuera de alcance, anotados)

- `actualizarItem` del codigario cambia `porcentajeComputable` pero no re-resuelve las clases con feriado.
- `/api/incidencias/validar-superposicion` no usa ancestros y ningún front lo llama.
- `listar` hace una consulta extra por cada hija (se resuelve con M2).
- Reporte de ausencias (`lib/pdf/datasets/ausencias.ts:231-239`): infiere el saliente con el "último inactivo" y atribuye por ventana de fechas → Fase 5 debe usar `agenteAusenteId` y `Reemplazo.incidenciaId`.
- **Fase 6 (UX):** filtros por profesor y por rango de fechas en la página de incidencias; buscador de Distribuciones por unidad, materia y comisión (y typo "distribuciónes"); el `catch` del login debería registrar el error original.
- **Fase 7 (datos):** reparar las hijas ya existentes en Ceferino (reemplazo de la padre desactivado con `deletedAt`, modelo viejo): script de solo lectura que lista "pausas seguras" (`deletedAt` a menos de 5 s del `createdAt` del reemplazo de la hija), "dudosos" (revisión manual) e "hijas sin cobertura" (reemplazo de la padre todavía activo); el reparo pone `deletedAt = NULL` solo en las seguras, con backup previo.

## 8. Cómo retomar

1. Estado limpio: parar la app si corre (`pkill -f "next dev"`) y, si se tocó la copia local, restaurarla (`DROP DATABASE alnext_ceferino WITH (FORCE)`, `CREATE DATABASE`, `pg_restore --no-owner --no-acl ~/datos_ceferino/base_copia_limpia.dump`; esperado 2404 clases, 78 asignaciones, 43 incidencias, 465 reemplazos, 79 distribuciones).
2. `git branch --show-current` debe decir `fix/motor-clases-fase-4`; `git log --oneline -5` debe mostrar `51c7a3b` (o los commits de B si ya se hicieron) y `git status` limpio.
3. B (commit 5) y los tests de `escenariosPiloto` (`c4e31d8`) ya están hechos. **Siguiente paso: aprobar el plan del commit 6 (sección 6 bis)** respondiendo a Claude Code las tres preguntas (mis recomendaciones: 1 rechazar con 409 "ya transcurrió completa"; 2 pedir "cambia el pasado"; 3 commit 7 separado con la misma aprobación) y aprobando el cambio de fechas de `tests/incidencias.test.ts` con su diff previo. Después Claude Code ejecuta 6a, 6b, 6c y 7, uno por uno, parando tras cada commit con resumen corto. Si la sesión de Claude Code ya no tiene el contexto, pasarle este informe (secciones 2 a 6 bis).
4. Prompt de arranque para una sesión nueva de Claude Code: "Estamos en la Fase 4 (licencias) del plan docs/plan-correccion-motor-clases-2026-10-22.md, rama fix/motor-clases-fase-4. Leé docs/punto-de-partida-sesion-de-cierre-2026-10-27.md (secciones 2 a 6). Hecho: commits 1 a 3 (M1, ancestros, clases vivas). Siguiente: [B / commit 6 / ...] según el estado de git log. Mismas reglas de siempre: solo gestor_test, servidor 3100, commits chicos, comparación contra los 42 fallos de docs/suites-comparacion-http.md, plan y aprobación antes de editar, resumen corto."

## 9. Pendientes abiertos (heredados)

- Fusión de ramas (1, 2, 3, 4) en orden, con comparación de suites en la rama resultante.
- El control diario de `withContext` corre una vez por día.
- `tests/helpers/auth.ts` no verifica la base del servidor; `crearReemplazo` no valida un `incidenciaId` explícito distinto del de la clase; doble lectura de la clase por resolución; `validarSuperposicionSuplente` importado desde `reconciliacionService` (deuda de capas).
- Seguridad: quitar el log de la URL de la base (`lib/prisma.ts`, "DB USADA", #281); rotar la contraseña de la base de Ceferino (`alnext_app`) y la del usuario `admin` local presente en docs viejos; #205, #206, #207, #217 antes de datos reales.
- Verificar `Intl` con zonas horarias en el Node portable de la instalación (`C:\ALNEXT\node`; debe mostrar 20:59).
- Fase 5 (reportes de ausencias), Fase 6 (UX/deuda), Fase 7 (despliegue: `impacto-motor` con copia fresca, reparo de datos de la asignación 43 y de las cadenas, backup, migraciones M1 y M2, paquete v5, actualización de Ceferino, repetir comparación de suites HTTP).
- Paquetes v4/v5; Ceferino Parte B; tareas #167–#173, #189, #191, #247, #278–#280; normativa sobre días que suspenden clases; renombrar el snapshot de VirtualBox.
- Reglas operativas en Ceferino hasta el despliegue: no guardar licencias en asignaciones con cambios de distribución; no usar "Editar" para enroques provisorios; control de consistencia tras cambios grandes y backup antes.

## 10. Reglas de trabajo vigentes

- Verificar, no asumir. Leandro corre los comandos y pega solo la salida del último.
- No pegar líneas con contraseñas ni `DATABASE_URL` con credenciales; no escribir credenciales en docs del repo; al levantar la app de desarrollo usar las credenciales locales reales (no marcadores).
- Datos reales de Ceferino fuera del repo y nunca en GitHub; la app de desarrollo solo apunta a la copia local.
- Tests HTTP únicamente contra el servidor propio `NODE_ENV=test` en el 3100 con `gestor_test`. Las migraciones de esta fase se aplican solo a `gestor_test`; en la copia de Ceferino las aplica Leandro, a mano. Claude Code no se conecta a `alnext_ceferino` salvo por scripts de solo lectura que corre Leandro.
- Commits chicos, con tests y build tras cada uno; los tests existentes que cambian se muestran antes de aplicar.
