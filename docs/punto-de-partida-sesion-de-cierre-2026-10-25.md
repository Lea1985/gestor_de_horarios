# ALNEXT · Punto de partida (sesión de cierre 25/10/2026)

Continúa el informe del 22/10 (`punto-de-partida-sesion-de-cierre-2026-10-22.md`). Plan de referencia: `docs/plan-correccion-motor-clases-2026-10-22.md` y, para la Fase 3, `docs/plan-fase-3-reconciliacion.md`.

## 1. Dónde estamos en el plan

```
Fase 0  Preparación (copia de la base de Ceferino)      HECHA
Fase 1  Fechas                                           HECHA
Fase 2  Motor de resolución                              HECHA  (+ medición de impacto en la copia)
Fase 3  Reconciliación                                   EN CURSO
  ├─ 3a  parámetro db + generarParaRango                 HECHA
  ├─ 3b  reconciliarAsignacion (servicio)                HECHA
  └─ 3c  cablear usecases, rutas, UI mínima, retirar atajos
         usecases cableados: HECHO (8 commits)
         rutas con `desde`, UI mínima, retiro de atajos, verificación final: PENDIENTES
Fase 4  Licencias        Fase 5  Reportes
Fase 6  UX / deuda       Fase 7  Despliegue a Ceferino      pendientes
```

## 2. Qué se hizo desde el 22/10

**Fase 2 (rama `fix/motor-clases-fase-2`, en GitHub, última en `452a771`):**
- `64f0f16` precedencia nueva (`FIN_ASIGNACION` > `CAMBIO_DISTRIBUCION` > `INCIDENCIA` > `PERIODO_OPERATIVO` > `CALENDARIO_ESCOLAR` > `DICTADA`/`PROGRAMADA`) y tabla de 83 casos de `resolverEstadoYCausa`.
- `b0fb7ee` `obtenerCondicionesVigentes` lee asignación (activa, `fecha_fin`, día de baja inclusive), distribución que cubre la fecha y contiene el módulo, incidencia activa y `porcentajeComputable` del artículo.
- `cc0fea5` `vincularIncidencia` solo toma clases vivas; `desvincularIncidencia` suelta también las `DICTADA`.
- `5fbbb26` `crearReemplazo` rechaza clases muertas (409) y toma el `incidenciaId` de la clase.
- `2cc863d` cinco escenarios del piloto como tests de integración.
- `f054543` y `7aa7d3a` guardia de `gestor_test` en tests (global, vía `tests/setup.ts`).
- `edf2305` `scripts/impacto-motor.ts` (solo lectura, sesión con `default_transaction_read_only=on`, solo acepta `alnext_ceferino` y `gestor_test`).
- `3cd2375` y `452a771` docs (la clave local salió del informe del 22/10).
- Regla clave: una clase ya `DICTADA` no pasa a `FIN_ASIGNACION` ni `CAMBIO_DISTRIBUCION` por re-resolución; reescribir el pasado se hace solo con reconciliación explícita y confirmación.
- Resultados: 7 archivos de tests nuevos, build limpio, las 9 suites de siempre con los mismos 31 fallos previos (#168 a #173). Consultas por clase en el motor: 8 a 9 (sin cambios), 9 a 10 (con escritura), 8 a 11 (incidencia + calendario).

**Medición de impacto sobre la copia de Ceferino** (2.404 clases, solo lectura): ninguna transición destructiva. Sin cambio: 2.275 de 2.306 no dictadas (428 `REEMPLAZADA`, 31 `FIN_ASIGNACION`, 22 `CAMBIO_DISTRIBUCION`, 21 `SUSPENDIDA/INCIDENCIA`); las 98 `DICTADA` intactas. Cambian 29: 27 `PROGRAMADA` a `DICTADA` (viernes 23/10, solo paso del tiempo) y 2 `FIN_ASIGNACION` a `DICTADA` (asignación 43, clases del 20/10, anteriores a su baja del 21/10). Estas 2 son una corrección de un dato mal guardado; queda como reparación de datos para la Fase 7.

**Fase 3 (rama `fix/motor-clases-fase-3`, desde `452a771`, todavía solo local):**
- Docs: `7a8c20b` plan de la Fase 3 (`docs/plan-fase-3-reconciliacion.md`) con las decisiones.
- 3a: `61c287f` parámetro opcional `db` (tipo `Db` en `lib/types/db.ts`) en el motor y sus dependencias, para correr dentro de transacciones; `1b82ec2` `generarParaRango` vincula cada clase nueva a la licencia activa que cubre su fecha (gana la hija) y la resuelve con el motor (bug 3). Esto cambia también lo que generan `activarPeriodo` y `crearDistribucion`.
- 3b: `reconciliarAsignacion` en `lib/services/reconciliacionService.ts` (commit `7b624e5`), más un commit previo que agrega `reescribirDictada` a `resolverClase` y `db` a `validarSuperposicionSuplente`. Genera las clases que faltan, re-resuelve las existentes y anula los reemplazos de clases futuras que dejaron de existir (con confirmación previa: sin ella lanza error, revierte todo y devuelve `requiereConfirmacion` con la lista exacta). No anida transacciones (con `db` corre dentro de la del llamador; sin `db`, abre la suya, límite 120 s). "Mantener reemplazo" crea los de las clases nuevas solo si la licencia tenía un único suplente. 7 tests nuevos, incluido el rollback ante falla a mitad de camino.
  - Tiempos en `gestor_test` (2.454 clases): unos 10 ms por clase, o sea unos 25 s para generar y resolver un período completo (una vez por período).
- 3c, usecases cableados (cada uno en una transacción con `reconciliarAsignacion`):
  - `cc94cde` la reconciliación exige confirmación para cualquier cambio en clases pasadas (salvo `PROGRAMADA` a `DICTADA`).
  - `7402ed2` `db` opcional en repositorios de `asignarModulos`, eliminar/reactivar distribución, softDelete/reactivar asignación.
  - `357cd34` `asignarModulos` ("Editar") con `desde` explícito.
  - `ade6710` "Nueva versión" copia los módulos de la anterior y rige desde la fecha elegida.
  - `da964f6` y `ad4dd6e` eliminar y reactivar distribución reconcilian desde el día de la baja.
  - `2fdb770` y `38e7a76` eliminar y reactivar asignación reconcilian desde el día de la baja.
- Un corte de red (`ECONNRESET`) interrumpió Claude Code durante los tests de "reactivar días después"; el árbol quedó limpio, sin cambios a medias.

## 3. Decisiones de diseño tomadas (Fase 3)

1. "Editar" retroactivo puede re-resolver también las `DICTADA` entre `desde` y hoy, solo con confirmación explícita y mostrando cuántas; por defecto, solo desde hoy.
2. Cualquier cambio de estado en una clase pasada, salvo `PROGRAMADA` a `DICTADA`, exige confirmación (incluye `REEMPLAZADA` pasadas que pasarían a `CAMBIO_DISTRIBUCION`).
3. "Mantener reemplazo" es una opción que elige el usuario en el modal, nunca automática, y solo con un único suplente.
4. "Nueva versión" nace con copia de los módulos de la anterior; crearla es un no-op para las clases (con test).
5. UI mínima en la 3c: campo de fecha en "Nueva versión", "desde hoy / desde el inicio" en "Editar", lista de reemplazos a anular en el modal.

## 4. Estado de ramas y entorno

- Pila lineal: `feature/instalador-alnext` (`0e85d77`, intacta) > `fix/motor-clases-fase-1` > `fix/motor-clases-fase-2` > `fix/motor-clases-fase-3`. Fases 1 y 2 en GitHub; tag `respaldo-fase1-ok`; **la Fase 3 aún no está en GitHub**: hacer `git push -u origin fix/motor-clases-fase-3`. Nada fusionado; fusionar en orden al validar cada fase.
- Si el push falla con `HTTP2 framing layer`: `git -c http.version=HTTP/1.1 push` o `git config http.version HTTP/1.1`.
- Copia de Ceferino local: DB `alnext_ceferino` (respaldo limpio en `~/datos_ceferino/base_copia_limpia.dump`). Medición de impacto: `scripts/README-impacto-motor.md`.
- Tests HTTP solo contra un servidor propio en el puerto 3100 con `gestor_test`; el 3000 queda para la app de desarrollo.
- Este informe está sin commitear (`docs/punto-de-partida-sesion-de-cierre-2026-10-25.md`): commitearlo aparte, cuando Claude Code no esté escribiendo en el repo.

## 5. Pendientes

**Inmediatos (cerrar la 3c):**
- Verificar que existen y pasan los tests de la 3c (eliminar/reactivar asignación, "reactivar días después de la baja", nueva versión, editar retroactivo, enroques de 2do A).
- Rutas con el parámetro `desde` y las confirmaciones.
- UI mínima (tres elementos); verificar estado de carga y doble envío en la activación de período (~25 s) y que no haya timeouts menores en el camino.
- Retirar los atajos (`suspenderNoVigentes`, reactivación de `reactivarDistribucion`, `migrarReemplazoATramo`, `suspenderPorFinAsignacion`), demostrando con grep que nadie los usa.
- Verificación final: tests sin servidor, build, 9 suites contra el 3100 y comparación contra los 31 fallos previos; resumen en `~/informe-fase3c.md`.
- Después: repetir `scripts/impacto-motor.ts` contra la copia de Ceferino y probar a mano el enroque de 2do A en pantalla.

**Siguientes fases:** Fase 4 licencias (índice único parcial con migración SQL, ancestros en actualizar/reactivar, edición y eliminación con reemplazos, `agenteAusenteId`; la licencia hija que empieza el mismo día que su padre da hoy error 500); Fase 5 reportes (agrupar ausencias por `incidenciaId`, segmento posterior a hija, artículo visible, borrar `obtenerCadenaOperativaClases.ts`, revisar `reportes/ausencias/page.tsx`); Fase 6 UX y deuda (enroques provisorios con vuelta automática, formato de fechas, etc.); Fase 7 despliegue (repetir `impacto-motor` con copia fresca, reparar datos de la asignación 43, backup, migraciones, paquete v5, actualización de Ceferino con el procedimiento validado).

**Deuda y hallazgos anotados:**
- El control diario de `withContext` corre una vez al día (las clases de hoy pasan a `DICTADA` recién con la primera petición del día siguiente).
- `tests/helpers/auth.ts` no verifica la base del servidor HTTP.
- `crearReemplazo` no valida un `incidenciaId` explícito distinto al de la clase.
- La clase se lee dos veces por resolución.
- `reconciliacionService` importa `validarSuperposicionSuplente` (al revés del orden de capas): moverla a un servicio.
- Falta confirmar que `Intl` con zona horaria funciona en el Node portable (`C:\ALNEXT\node`) en la VM.

**Seguridad:** quitar el log de `lib/prisma.ts:18` y las líneas `DB USADA` del build (#281); rotar la clave de `alnext_app` de Ceferino y la de `admin` del Postgres local (figura en documentos viejos del repositorio); P0/P1 (#205, #206, #207, #217) antes de datos reales.

**Abiertos de antes:** paquete v4/v5, Ceferino Parte B (Tailscale y control de licencia), carga de datos reales, tareas #167 a #173, #189, #191, #247, #278 a #280, normativa sobre días que suspenden clases, snapshot de VirtualBox.

## 5 bis. Cómo retomar mañana (instrucciones para Claude Code)

Estado al cortar: rama `fix/motor-clases-fase-3`, 8 commits de la 3c (`cc94cde` … `38e7a76`), árbol limpio, sin push. Decisión ya tomada: la confirmación en clases pasadas es **sí** (cualquier cambio salvo `PROGRAMADA` a `DICTADA`).

1. En WSL: `cd ~/gestor_clean`, `git branch --show-current` (debe decir `fix/motor-clases-fase-3`), `git status --short`, `git push -u origin fix/motor-clases-fase-3` (con `-c http.version=HTTP/1.1` si falla), y abrir `claude`.
2. Si la sesión de Claude Code se perdió, pasarle también `docs/plan-fase-3-reconciliacion.md` y este informe.
3. Pegarle este mensaje:

```text
Retomá la 3c. Veo en git log los commits hasta 38e7a76 y el árbol limpio. Orden, con un resumen de 5 líneas al terminar cada punto:
1) Verificá qué tests de la 3c ya existen y pasan (reactivar días después de la baja, eliminar/reactivar asignación, nueva versión, editar retroactivo, enroques de 2do A). Corré los tests sin servidor y decime cuáles faltan o fallan. El test "reactivar días después" estaba en edición cuando se cortó la conexión: confirmá si quedó.
2) Rutas: parámetro desde (y reescribirPasado/confirmaciones) en las rutas que corresponden.
3) UI mínima (fecha en "Nueva versión", "desde hoy / desde el inicio" en "Editar", lista de reemplazos a anular en el modal). Verificá estado de carga y doble envío en la activación de período (~25 s) y que no haya timeouts menores en el camino.
4) Retirar los atajos que ya no usa nadie (suspenderNoVigentes, reactivación de reactivarDistribucion, migrarReemplazoATramo, suspenderPorFinAsignacion), con grep que lo demuestre; si alguno sigue en uso, dejalo y decime dónde.
5) Verificación final: tests sin servidor, build, las 9 suites contra el 3100 verificado, y comparación contra los 31 fallos previos. Resumen de máximo 25 líneas, guardado también en ~/informe-fase3c.md.
Avisame antes de tocar cualquier test existente.
```

4. Al terminar la 3c: correr `scripts/impacto-motor.ts` contra la copia de Ceferino (comando en `scripts/README-impacto-motor.md`, con `IMPACTO_DATABASE_URL` definida en la propia terminal) y probar a mano el enroque de 2do A en la pantalla, con la app de desarrollo apuntando a `alnext_ceferino`.

## 6. Reglas de trabajo

- Verificar, no asumir; Leandro corre los comandos y pega solo la salida del último.
- Nunca pegar claves ni líneas `DB USADA:` / `DATABASE_URL`; no escribir claves en documentos del repositorio.
- Datos de Ceferino siempre fuera del repositorio; la app de desarrollo nunca apunta a la base viva del piloto.
- Interinamente en Ceferino: no guardar licencias sobre asignaciones con cambios de distribución, no usar "Editar" para enroques provisorios, correr el control de consistencia tras cambios grandes y hacer backup antes.