# ALNEXT · Piloto Ceferino: punto de partida (sesión de cierre 21/10/2026)

Bitácora de depuración del primer piloto y prompt para Claude Code.
Escuela: Nva. Esc. Ceferino Namuncurá · Período: Ciclo lectivo 2026, 19/10/2026 → 31/12/2026.
Estado de la base: actualizado al 22/10/2026, 09:55. Bugs y mejoras actualizados al 22/10, 11:20.

---

## 1. Resumen

El primer piloto funcionó: la activación del período generó las clases exactas, y la base quedó consistente el 21/10 con **2.404 clases y 0 superposiciones** (22/10). La depuración encontró inconsistencias de carga y 20 problemas en el código, más una mejora pedida para el reporte de ausencias. El más importante: las rutas que crean clases tratan distinto un feriado dentro de una licencia.

- **Período:** 19/10/2026 → 31/12/2026, con 5 días no laborables (19/10, 07/12, 08/12, 25/12, 31/12).
- **Activación (20/10, 23:06):** 2.133 clases para 69 asignaciones. Coincide con el cálculo hecho sobre los horarios de 1ro a 5to A: 1.936 programadas y 197 suspendidas por calendario.
- **Problema visible:** Lengua y Administración de 4to A aparecían en gris. La causa no era la generación sino asignaciones duplicadas o con módulos superpuestos.
- **Estado final:** cada materia en una designación por módulo, feriados con los reemplazos que corresponden según la política del ministerio, historial de dictadas sin duplicar, enroque provisorio de 2do A consistente.
- **Regla de negocio confirmada:** en una licencia larga (más de 2 días, según el artículo), el suplente cobra también los feriados del período.

Todas las correcciones se hicieron con backup previo, dentro de transacciones y con controles de seguridad.

---

## 2. Cronología

Orden en que ocurrió, de lo más antiguo a lo más reciente.

| Momento | Hecho | Conclusión |
| --- | --- | --- |
| 20/10 | Cálculo previo sobre los PDF de horarios de 1ro a 5to A | 197 módulos semanales; esperado 2.133 clases, 1.936 programadas + 197 suspendidas |
| 20/10, 23:06 | Activación: "Se generaron 2133 clases para 69 distribuciones vigentes" | Coincide. Primero pareció un bug (no excluía feriados), pero ALNEXT crea todas y marca las de feriado como suspendidas |
| 20/10 | Lengua y Administración de 4to A aparecen en gris en el selector | Se sospechó que el generador tomó la v1 en vez de la v2. **Descartado**: las clases se atan a la asignación, no a la versión |
| 21/10 | Se cargan distribuciones para las materias en gris; el conteo pasa a 71 | Se sospechó de v1 vigentes de más. **Descartado** |
| 21/10 | Primera consulta a la base: 2.392 clases y 183 suspendidas por calendario (no 197) | Hay clases extra y feriados con reemplazo |
| 21/10 | Clases por asignación y fecha de creación | Las 259 extra = 24 módulos semanales nuevos: cargos 1 a 4 (sin materia ni comisión) + 688516 + 683273. Sin duplicados por asignación |
| 21/10 | Superposición por comisión, módulo y fecha | 4to A: Lengua 688521/688516 (22 fechas) y Administración 573381/683273 (10 fechas) |
| 21/10 | Feriados con incidencia | 37 clases en 5 feriados reemplazadas por 15 incidencias. Se tomó como bug y se corrigió |
| 21/10 | Lengua: queda 688516, se da de baja 688521 desde la app | La app suspende sus clases futuras con FIN_ASIGNACION y conserva las dictadas |
| 21/10 | Administración: las dos designaciones son reales (3 + 1 módulos) | 573381 conservaba 10 clases del módulo que se le quitó con "Editar" (viernes 11:10), con licencia y reemplazo |
| 21/10 | Política del ministerio: en una licencia larga (más de 2 días, según el artículo) el suplente cobra los feriados | La corrección de feriados fue un error. **Revertida** desde el backup de las 17:48: 36 clases y 34 reemplazos restaurados |
| 21/10 | Primer enroque en 2do A con "Editar": Historia (564335) viernes → jueves y Físico-Química (564334) jueves → viernes, mientras la titular de Historia está de licencia | Físico-Química correcto. Historia: las 20 clases del viernes quedaron con la licencia y las 22 nuevas del jueves nacieron PROGRAMADA, sin la licencia |
| 21/10 | El jueves 09:40 la titular de Historia figura en 2do A y en 3ro A | No es un choque real: la cubren dos suplentes distintos. ALNEXT arma los choques con la titular |
| 21/10 | Se eliminan los reemplazos y la licencia 19; no se puede crear una nueva ("Error creando incidencia"); se reactiva la 19 | La licencia reactivada toma también las 20 clases viejas del viernes (64 afectadas) |
| 21/10, 18:45 | Script de consistencia general | 20 clases de Historia del viernes → CAMBIO_DISTRIBUCION. 0 huérfanas, 0 superposiciones. Total 2.424 |
| 22/10 | El primer enroque estaba mal. Horario correcto: Físico-Química jue 09:00–10:20 y vie 07:30–08:50; Historia mar 09:00–10:20 y mié 10:30–11:45 | ALNEXT **reactivó** bien los jueves de Físico-Química, pero dejó el 31/12 programado. Historia: jueves siguieron con la licencia (bug 2), miércoles nuevos sin la licencia (bug 3) y 2 clases retroactivas del 21/10 marcadas dictadas |
| 22/10, 08:35 | Script de corrección del segundo enroque | 24 clases de Historia → CAMBIO_DISTRIBUCION, 20 miércoles → licencia 19, 31/12 de Físico-Química → calendario. 0 superposiciones. Total 2.446 |
| 22/10, 08:37 | Se guarda la licencia 19 | ALNEXT la reaplica a las 86 clases de Historia 2do en el rango, incluidas las 44 dadas de baja. La licencia muestra 86 afectadas y el panel del día marca Historia jueves 09:00 "sin cobertura" (bug 4) |
| 22/10, 08:47 | Borrado de las 44 clases sobrantes de Historia 2do (jueves, viernes y miércoles 21/10), sin reemplazos | Una nueva edición de la licencia ya no las puede revivir. Historia queda con 42 clases (martes y miércoles). Total 2.402 |
| 22/10, 08:52 | Simoncini cargada por script como suplente de Historia 2do en las 42 clases de la licencia 19 | Sin choques de horario. Sus reemplazos aparecen bien agrupados en la #19 |
| 22/10 | "Ausencias y reemplazos" muestra a Lelli (suplente de Zapp, Inglés 3ro A, licencia 5) dentro de la #24 de Boelart, sin su titular | Datos correctos. Se completó `incidenciaId` en 370 reemplazos (09:16) y la pantalla siguió igual: error de cómo arma los grupos (bug 19) |
| 22/10, 09:55 | Faltan las 2 clases de Historia 2do del miércoles 21/10: las había borrado el script de las 08:47, suponiendo que ese módulo lo había dado Físico-Química (figuraba dictada por el bug 12) | Error de análisis. Se recrearon las 2 clases con la licencia 19 y Simoncini como suplente, y las 2 de Físico-Química del 21/10 pasaron a CAMBIO_DISTRIBUCION. Historia 2do: 44 clases. Total 2.404 |

---

## 3. Correcciones aplicadas

Las correcciones dejaron la base sin superposiciones y con Lengua y Administración de 4to A limpias. El total quedó en 2.404 clases: bajó a 2.382 con las correcciones de 4to A, subió con los dos enroques de 2do A, bajó al borrar 44 clases de Historia y se recuperaron 2 de ellas (21/10) que sí existían. La corrección de feriados se revirtió: era la política del ministerio, no un error.

| Corrección | Vía | Filas |
| --- | --- | --- |
| Baja de la asignación 43 (688521, Lengua 4to A) | App | 30 clases futuras → SUSPENDIDA / FIN_ASIGNACION |
| Distribución 49 de la 688521: `estado` alineado a INACTIVO | Script | 1 |
| 3 clases dictadas duplicadas de la 688521 (20 y 21/10) → FIN_ASIGNACION | Script | 3 |
| `fecha_fin` de la 688516 (asig. 76) estaba en 01/10/2026 → vacía | Script | 1 |
| Reemplazos de las clases sobrantes de la 573381 (viernes 11:10) borrados | Script | 10 |
| Clases sobrantes de la 573381 (módulo 38) borradas | Script | 10 |
| Feriados: 37 clases a calendario y 35 reemplazos anulados | Script | **Revertido** |
| Reversión desde el backup: estado, causa e incidencia originales | Script | 36 clases y 34 reemplazos (la 37.ª era una de las 10 sobrantes ya borradas) |
| Primer enroque de 2do A (Historia y Físico-Química) | App ("Editar") | 22 clases de Físico-Química del jueves → CAMBIO_DISTRIBUCION; 20 nuevas los viernes y 22 nuevas de Historia los jueves |
| Clases viejas de Historia 2do del viernes 07:30 y 08:10 → SUSPENDIDA / CAMBIO_DISTRIBUCION | Script | 20 |
| Segundo enroque de 2do A (horario correcto) | App ("Editar") | Jueves de Físico-Química reactivados; miércoles de Físico-Química → CAMBIO_DISTRIBUCION; 22 miércoles nuevos de Historia |
| Historia jueves (22) y miércoles retroactivos del 21/10 (2) → CAMBIO_DISTRIBUCION | Script | 24 (luego revividas por la licencia y borradas) |
| Historia miércoles desde el 28/10 → licencia 19 (sin cubrir) | Script | 20 |
| Físico-Química 31/12 → SUSPENDIDA / CALENDARIO_ESCOLAR | Script | 2 |
| Clases sobrantes de Historia 2do (jueves 22, viernes 20, miércoles 21/10 2) borradas, sin reemplazos | Script | 44 |
| Simoncini como suplente de Historia 2do (licencia 19): reemplazos creados y clases → REEMPLAZADA | Script | 42 |
| `Reemplazo.incidenciaId` completado desde la clase en los reemplazos activos que no lo tenían | Script | 370 |
| Historia 2do 21/10 recreada (2 clases, licencia 19, reemplazadas por Simoncini) y Físico-Química 21/10 → CAMBIO_DISTRIBUCION | Script | 2 + 2 reemplazos + 2 |

**Totales por estado**

| Estado / causa | Antes (21/10) | Después (22/10, 09:55) |
| --- | --- | --- |
| Programada | 1.690 | 1.623 |
| Dictada | 66 | 98 |
| Suspendida / incidencia | 43 | 23 |
| Suspendida / calendario escolar | 183 | 183 |
| Suspendida / cambio de distribución | 0 | 22 |
| Suspendida / fin de asignación | 0 | 33 |
| Reemplazada / incidencia | 410 | 422 |
| **Total** | **2.392** | **2.404** |

**Estado final por curso**

- **4to A, Lengua:** solo 688516 (mar 09:00, mar 09:40, mié 07:30).
- **4to A, Administración:** 573381 (mié 11:55, mié 12:35, vie 10:30; 32 clases) y 683273 (vie 11:10; 10 clases), ambas con su licencia y su reemplazo.
- **2do A, Físico-Química (564334):** jue 09:00–10:20 y vie 07:30–08:50 activos (25/12 y 31/12 suspendidos por calendario); miércoles en CAMBIO_DISTRIBUCION.
- **2do A, Historia (564335):** mar 09:00–10:20 y mié 10:30–11:45 con la licencia 19 (44 clases, cubiertas por Simoncini); jueves y viernes borrados.

**Pendientes en la app**

- [x] Hecho el 22/10 por script: Simoncini cubre las 44 clases de Historia 2do (licencia 19), incluidas las 2 del 21/10 recreadas a las 09:55. Verificar en la app y no guardar la licencia 19 sin revisar después (bug 4). La licencia debería mostrar 44 clases. Las de jueves y viernes se borraron: si reaparecen después de guardar la licencia, ALNEXT las está recreando.
- [ ] Volver a registrar los reemplazos de clases ya dadas (por ejemplo, 20/10) que se borraron al eliminar la licencia.
- [ ] 25/12 de la 683273: si el artículo de la licencia paga feriados, falta el reemplazo.
- [ ] Cuando vuelva la titular de Historia, restaurar el horario original de 2do A: Historia mar 09:00–10:20 y vie 07:30–08:50; Físico-Química mié 10:30–11:45 y jue 09:00–10:20. La reactivación de clases funciona (probado el 22/10), pero revisar feriados y licencias después del cambio.

---

## 4. Bugs y mejoras

La prioridad es el bug 1: hoy, que un suplente figure o no en un feriado depende del orden en que se cargaron los datos, no del artículo de la licencia.

| # | Prioridad | Problema | Evidencia | Corrección propuesta |
| --- | --- | --- | --- | --- |
| 1 | Alta | Las rutas que crean o actualizan clases tratan distinto un feriado dentro de una licencia | Incidencia aplicada sobre clases existentes → REEMPLAZADA con suplente (36 clases). Clases generadas después de la incidencia → SUSPENDIDA por calendario, sin suplente (asig. 57, 25/12) | Una sola regla que consulte el artículo de la licencia (codigario): si el artículo paga feriados, el reemplazo queda vigente. Definir si la clase figura REEMPLAZADA o SUSPENDIDA con reemplazo vigente para liquidar |
| 2 | Alta | Al cambiar una distribución, solo pasan a CAMBIO_DISTRIBUCION las clases PROGRAMADA; las que tienen incidencia quedan como estaban | 573381: 10 clases reemplazadas del módulo quitado. Historia 2do: 20 clases del viernes (21/10) y 22 del jueves (22/10) siguieron con la licencia | El cambio de distribución tiene prioridad: toda clase futura de un módulo quitado pasa a CAMBIO_DISTRIBUCION; si tiene reemplazo, avisar antes de anularlo |
| 3 | Alta | Las clases nuevas que genera un cambio de distribución no heredan la licencia vigente | Historia 2do: 22 jueves (21/10) y 20 miércoles (22/10) nacieron PROGRAMADA con la titular de licencia | Al generar o reactivar clases, aplicar las incidencias vigentes de la asignación con la misma regla que el bug 1 |
| 4 | Alta | Guardar una licencia la vuelve a aplicar a todas las clases de la asignación en su rango, incluidas las dadas de baja | 22/10, 08:37:42: al guardar la licencia 19, 44 clases de Historia 2do en CAMBIO_DISTRIBUCION volvieron a "suspendida por licencia". La licencia mostró 86 afectadas y el panel del día marcó "sin cobertura" con la opción "Asignar" | Aplicar la licencia solo a clases vivas de módulos de la distribución activa; respetar CAMBIO_DISTRIBUCION y FIN_ASIGNACION; no ofrecer "Asignar" ni "+ Agregar" en clases dadas de baja |
| 5 | Alta | Se permite superponer módulos de una misma comisión y de una misma docente | 688521 y 688516 (misma docente) compartían martes 09:00 y 09:40 | Validar choque de comisión y de agente al guardar una distribución, considerando quién da la clase en cada fecha (titular o suplente) |
| 6 | Media | No hay forma de cargar un cambio de horario provisorio | Los enroques de 2do A se hicieron con "Editar": pisaron la v1 y se perdió el horario original | "Nueva versión" con vigencia hasta una fecha y vuelta automática al horario anterior. La reactivación de clases ya funciona (probado el 22/10) |
| 7 | Media | Al reactivar clases, se ignora el calendario | Jueves de Físico-Química reactivados: el 31/12 (feriado) quedó PROGRAMADA | Al reactivar, volver a resolver el estado con calendario e incidencias, no pasar directo a PROGRAMADA |
| 8 | Media | Después de eliminar una licencia no se puede crear otra para la misma designación | "Error creando incidencia" al recargar la licencia de Historia 2do; hubo que reactivar la eliminada | Revisar la validación de superposición de licencias: probablemente cuenta las dadas de baja. Mostrar el motivo del error |
| 9 | Media | Eliminar una licencia borra también los reemplazos de clases ya dadas, sin advertir | Las clases de Historia 2do del 20/10 pasaron de reemplazadas a "sin cubrir" | Pedir confirmación y conservar los reemplazos de fechas pasadas |
| 10 | Media | Una distribución nueva genera clases aunque la asignación tenga `fecha_fin` pasada | Asig. 76 con fin 01/10/2026 generó 33 clases hasta el 31/12. La activación sí la había excluido | Unificar el criterio de vigencia entre activación y alta de distribución |
| 11 | Media | Las clases generadas con fecha pasada nacen como DICTADA | 688516: clases creadas el 21/10 figuraban dictadas el 20 y 21/10. Físico-Química 2do figuraba dictada el miércoles 21/10, cuando ese módulo ya era de Historia: eso llevó a borrar por error las 2 clases de Historia de ese día | Las clases retroactivas deberían nacer pendientes de confirmación, o no generarse antes de la fecha del cambio |
| 12 | Media | Las clases del día figuran como DICTADA desde la mañana, antes de la hora de clase | 22/10 a las 08:33: 102 dictadas, incluida Físico-Química de las 09:00 | Marcar como dictada al terminar el módulo (o al confirmar la asistencia), no al empezar el día |
| 13 | Media | `Reemplazo.incidenciaId` no se carga en todas las rutas | 370 reemplazos activos en 23 licencias lo tenían vacío; los de las licencias 20, 21 y 22 sí lo tenían. Se completó por script el 22/10 | Encontrar qué forma de cargar reemplazos lo omite y cargarlo siempre |
| 14 | Media | Fechas que se muestran un día antes | Distribución creada con vigencia 01/10/2026: el listado muestra 2026-10-01, pero el detalle (`/distribuciones/[id]`, campo "Vigencia desde") muestra 30/9/2026 | Formatear fechas sin hora con `timeZone: "UTC"` o como texto `YYYY-MM-DD`; revisar todos los `input type=date` |
| 15 | Baja | Al dar de baja, `activo` y `estado` quedan desalineados | Distribución 49: activo = false, estado = ACTIVO | Actualizar ambos campos juntos, o derivar uno del otro |
| 16 | Baja | `ClaseProgramada.calendarioEscolarId` nunca se carga | Ninguna clase suspendida por calendario lo tiene | Cargarlo al suspender por calendario, o eliminar la columna |
| 17 | Baja (UX) | "Editar" no lleva la pantalla al formulario | En la mayoría de las pantallas de consulta hay que scrollear hasta el formulario | Al abrir la edición, `scrollIntoView()` del formulario y foco en el primer campo |
| 18 | Baja (UX) | Poco contraste en los módulos seleccionados de una distribución | En "Módulos horarios" (`/distribuciones/[id]/modulos`) los módulos marcados se ven casi igual que los vacíos | Fondo y borde de color, texto en negrita, tilde con color de acento |
| 19 | Media | "Ausencias y reemplazos" agrupa mal: muestra reemplazos bajo una licencia ajena y no muestra a su titular | Lelli (suplente de Zapp, Inglés 3ro A, licencia 5) aparece dentro de la #24 de Boelart. El grupo #24 muestra fechas 21/10–30/12, que mezclan las licencias 24, 27 y 30. Sigue igual con `incidenciaId` completo | Armar cada grupo por licencia (`Reemplazo.incidenciaId` o la incidencia de la clase), con su titular y sus reemplazos, y mostrar las fechas reales de cada licencia |
| 20 | Media (mejora) | "Ausencias y reemplazos" no muestra el artículo de la licencia | En la fila del titular de cada licencia no figura el artículo (codigario); por ejemplo, Boelart tiene licencias por artículo 8 (24, 27, 30) y artículo 72 (35), y la pantalla no lo distingue | Mostrar en la fila del titular el artículo de la licencia (código y descripción del codigario), además de sus fechas. En las licencias encadenadas, ver también el bug 21 |
| 21 | Alta | En una licencia encadenada (el suplente del titular se ausenta), la licencia hija muestra como reemplazo al suplente ausente | Titular ausente cubierto por A; A se ausenta y lo cubre B. Los dos reemplazos apuntan a la misma clase. En la licencia del titular figura A (correcto), pero en la encadenada también figura A como reemplazo. Si se borra el reemplazo de B, la encadenada sigue mostrando a A. El 22/10 se completó `Reemplazo.incidenciaId` por script con la licencia de la clase, lo que pudo vincular mal los reemplazos de B | Cada reemplazo pertenece a una licencia: el de A a la del titular, el de B a la encadenada. En la encadenada mostrar a A como ausente y a B como reemplazo; definir quién figura dando la clase (y quién cobra) en cada fecha |

**Mejoras sugeridas**

- Al activar un período, informar el desglose: programadas, suspendidas por calendario y materias de cada comisión sin distribución vigente.
- Al dar de baja una asignación, dar de baja también sus distribuciones activas.
- Una consulta de control periódica: superposiciones, clases fuera de la distribución activa y clases de asignaciones dadas de baja.
- Definir la prioridad entre causas cuando coinciden (por ejemplo, el 31/12 de Físico-Química pasó de CALENDARIO_ESCOLAR a CAMBIO_DISTRIBUCION y, al reactivarse, a PROGRAMADA).

---

## 5. Consultas y procedimiento

Toda corrección sigue el mismo orden: backup, prueba con ROLLBACK, comparar números, y recién entonces COMMIT. La base es PostgreSQL local en el puerto 5433, con `psql` en `C:\ALNEXT\pgsql\bin`. La conexión se lee del `.env` de la app (`C:\ALNEXT-paquete-offline\app\.env`), así que la clave no se escribe en ningún lado.

Backups generados hoy en `C:\ALNEXT`: `backup_antes_limpieza_20261021_1748.dump` y `backup_antes_consistencia_20261021_1845.dump`.

**1. Backup**

```powershell
$linea = (Select-String -Path C:\ALNEXT-paquete-offline\app\.env -Pattern '^DATABASE_URL').Line
$m = [regex]::Match($linea, 'postgresql://([^:]+):([^@]+)@')
$env:PGPASSWORD = $m.Groups[2].Value
& "C:\ALNEXT\pgsql\bin\pg_dump.exe" -h localhost -p 5433 -U $m.Groups[1].Value -d alnext -Fc -f "C:\ALNEXT\backup_$(Get-Date -Format yyyyMMdd_HHmm).dump"
Remove-Item Env:PGPASSWORD
```

**2. Correr SQL desde PowerShell.** El SQL va dentro de `@' ... '@` y se pasa a `psql`. Pegado suelto, PowerShell lo interpreta como comandos propios y falla.

```powershell
$psql = "C:\ALNEXT\pgsql\bin\psql.exe"
$linea = (Select-String -Path C:\ALNEXT-paquete-offline\app\.env -Pattern '^DATABASE_URL').Line
$m = [regex]::Match($linea, 'postgresql://([^:]+):([^@]+)@')
$env:PGPASSWORD = $m.Groups[2].Value
$u = $m.Groups[1].Value
$sql = @'
\set ON_ERROR_STOP on
BEGIN;
-- cambios y verificaciones
'@
($sql + "`nROLLBACK;") | & $psql -h localhost -p 5433 -U $u -d alnext -P pager=off > C:\ALNEXT\prueba.txt 2>&1
Remove-Item Env:PGPASSWORD
```

**3. Aplicar:** el mismo script con `COMMIT` en lugar de `ROLLBACK`. Los cambios críticos llevan un bloque `DO $$ ... RAISE EXCEPTION` que aborta si los conteos no son los esperados.

**4. Recuperar datos de una tabla desde un backup** (como en la reversión de feriados): `pg_restore -a -t ClaseProgramada -f salida.sql backup.dump`, reemplazar `COPY public."ClaseProgramada"` por una tabla temporal, cargarla en la misma transacción y cruzar por `id`.

**Consulta de control** (tiene que devolver 0 en las tres filas)

```sql
WITH dm AS (
  SELECT d."asignacionId", d.activo,
         COALESCE(to_jsonb(x)->>'moduloId', to_jsonb(x)->>'moduloHorarioId')::int AS modulo_id
  FROM "DistribucionModulo" x JOIN "DistribucionHoraria" d ON d.id = x."distribucionHorariaId")
SELECT 'superposiciones' AS control, count(*) FROM (
  SELECT 1 FROM "ClaseProgramada"
  WHERE "comisionId" IS NOT NULL AND "moduloId" IS NOT NULL
    AND NOT (estado = 'SUSPENDIDA' AND causa IN ('FIN_ASIGNACION','CAMBIO_DISTRIBUCION'))
  GROUP BY "comisionId", "moduloId", fecha HAVING count(*) > 1) s
UNION ALL
SELECT 'clases fuera de la distribucion activa', count(*)
FROM "ClaseProgramada" c JOIN "Asignacion" a ON a.id = c."asignacionId" AND a.activo
WHERE c."moduloId" IS NOT NULL AND c.fecha::date >= current_date
  AND NOT (c.estado = 'SUSPENDIDA' AND c.causa IN ('CAMBIO_DISTRIBUCION','FIN_ASIGNACION'))
  AND NOT EXISTS (SELECT 1 FROM dm WHERE dm."asignacionId" = c."asignacionId"
                  AND dm.activo AND dm.modulo_id = c."moduloId")
UNION ALL
SELECT 'clases vivas de asignaciones dadas de baja', count(*)
FROM "ClaseProgramada" c JOIN "Asignacion" a ON a.id = c."asignacionId"
WHERE a.activo = false AND c.estado IN ('PROGRAMADA','REEMPLAZADA');
```

**Modelo de datos relevante**

- `Asignacion` → `DistribucionHoraria` (con `version`) → `DistribucionModulo` → `ModuloHorario` (`dia_semana`, `hora_desde`/`hora_hasta` en minutos).
- `ClaseProgramada` se ata a la asignación, con clave única por asignación + módulo + fecha. Estados: PROGRAMADA, DICTADA, SUSPENDIDA, REEMPLAZADA. Causas: NINGUNA, INCIDENCIA, CALENDARIO_ESCOLAR, FIN_ASIGNACION, CAMBIO_DISTRIBUCION.
- Los cargos sin materia (asignaciones 1 a 4) generan una clase diaria con `moduloId` NULL.
- `Reemplazo.claseId` impide borrar una clase con reemplazos (RESTRICT).

---

## 6. Prompt para Claude Code

Pegalo en Claude Code abierto en la carpeta del código de ALNEXT. Le pide primero un diagnóstico con ubicación exacta en el código, y que no toque nada hasta que apruebes el plan.

```text
Contexto: ALNEXT es una app Next.js + Prisma + PostgreSQL para gestionar clases, incidencias y reemplazos docentes. En el primer piloto (Nva. Esc. Ceferino Namuncurá, período 19/10/2026 a 31/12/2026) depuramos la base y encontramos los problemas de abajo. La base ya fue corregida a mano; ahora quiero corregir el código para que no se repitan.

Modelo relevante: Asignacion -> DistribucionHoraria (version, activo, estado, fecha_vigencia_desde/hasta) -> DistribucionModulo -> ModuloHorario. ClaseProgramada (asignacionId, moduloId, comisionId, fecha, estado PROGRAMADA|DICTADA|SUSPENDIDA|REEMPLAZADA, causa NINGUNA|INCIDENCIA|CALENDARIO_ESCOLAR|FIN_ASIGNACION|CAMBIO_DISTRIBUCION, incidenciaId, calendarioEscolarId, versionResolucion), con UNIQUE(asignacionId, moduloId, fecha). Los cargos sin materia generan una clase diaria con moduloId NULL. Reemplazo (claseId, agenteSuplenteId, incidenciaId, activo). Incidencia. TitularAsignacion. Codigario/CodigarioItem (artículos de licencia). CalendarioEscolar. PeriodoOperativo.

Regla de negocio clave (política del ministerio): en una licencia larga (por ejemplo, más de 2 días), según el artículo, el suplente cobra también los feriados que caen dentro del período. Un feriado dentro de una licencia NO anula automáticamente el reemplazo.

Problemas a investigar, en orden de prioridad:

1. Las rutas que crean o actualizan clases tratan distinto un feriado dentro de una licencia. Si la Incidencia se aplica sobre clases YA generadas, la clase del feriado pasa a REEMPLAZADA/INCIDENCIA con Reemplazo. Si las clases se generan DESPUÉS de la incidencia, queda SUSPENDIDA/CALENDARIO_ESCOLAR sin Reemplazo. Buscá todas las rutas (aplicar incidencias, activar período, alta y edición de distribución) y el uso de versionResolucion. Verificá si el Codigario indica si el artículo paga feriados o una duración mínima. Proponé una sola regla en un solo lugar y decime qué dato falta. Planteame si conviene distinguir "clase no dictada por feriado" de "reemplazo vigente para liquidar".
2. Al cambiar una distribución, solo pasan a CAMBIO_DISTRIBUCION las clases PROGRAMADA. Las que tienen incidencia (REEMPLAZADA o SUSPENDIDA/INCIDENCIA) quedan como estaban en módulos que ya no pertenecen a la asignación. Buscá ese filtro. El cambio de distribución debería tener prioridad, avisando antes de anular un reemplazo.
3. Las clases nuevas que genera un cambio de distribución no heredan la licencia vigente de la asignación: nacen PROGRAMADA aunque la titular esté de licencia.
4. No hay validación de choques: se pudieron guardar dos asignaciones de la misma comisión (e incluso del mismo agente) en el mismo módulo. La validación tiene que considerar quién da la clase en cada fecha (titular o suplente): un enroque mientras la titular está de licencia, cubierto por dos suplentes distintos, es legítimo.
5. No hay forma de cargar un cambio de horario provisorio: "Editar" pisa la versión y se pierde el horario original. Proponé "Nueva versión" con vigencia hasta una fecha y vuelta automática al horario anterior. Ojo: por el UNIQUE(asignacionId, moduloId, fecha), la vuelta tiene que reactivar las clases suspendidas por CAMBIO_DISTRIBUCION, no crearlas de nuevo.
6. Después de eliminar una incidencia no se puede crear otra para la misma asignación ("Error creando incidencia"). Revisá la validación de superposición de incidencias (¿cuenta las eliminadas?) y que el error muestre el motivo.
7. Eliminar una incidencia borra también los reemplazos de clases ya dadas, sin advertir. Debería pedir confirmación y conservar los de fechas pasadas.
8. La activación del período excluye asignaciones con fecha_fin pasada, pero dar de alta una distribución genera clases igual. Unificá el criterio de vigencia.
9. Las clases generadas con fecha pasada nacen como DICTADA. Mostrá dónde se decide y qué regla aplica.
10. Reemplazo.incidenciaId no se carga en todas las rutas: 370 reemplazos lo tenían vacío y los de algunas licencias sí lo tenían. Encontrá qué forma de cargar reemplazos lo omite.
11. Fechas sin hora (timestamp 00:00 UTC) se muestran un día antes en Argentina (UTC-3). Ejemplo: una distribución con vigencia 01/10/2026 se ve bien en el listado, pero el detalle (/protected/dashboard/distribuciones/[id], campo "Vigencia desde") muestra 30/9/2026. Revisá todos los input type=date y sus valores iniciales.
12. Al dar de baja una asignación, sus distribuciones quedan con activo=false pero estado=ACTIVO.
13. ClaseProgramada.calendarioEscolarId nunca se carga al suspender por calendario.
14. En la mayoría de las pantallas de consulta, al tocar "Editar" la pantalla no sube al formulario. Quiero scroll al formulario y foco en el primer campo.
15. En "Módulos horarios" de una distribución (/protected/dashboard/distribuciones/[id]/modulos) los módulos seleccionados casi no se distinguen de los vacíos. Proponé un estilo con más contraste.
16. Guardar una Incidencia la vuelve a aplicar a todas las clases de la asignación en su rango de fechas, incluidas las SUSPENDIDA por CAMBIO_DISTRIBUCION (y probablemente FIN_ASIGNACION): las revive como SUSPENDIDA/INCIDENCIA y aparecen "sin cobertura" en el panel del día con la opción "Asignar". Buscá la rutina que se ejecuta al guardar una incidencia. Tiene que aplicar solo a clases vivas en módulos de la distribución activa, y las pantallas no deberían ofrecer "Asignar" ni "+ Agregar" en clases dadas de baja.
17. Al reactivar clases de un módulo que vuelve a la distribución, quedan PROGRAMADA aunque la fecha sea feriado. La reactivación tiene que pasar por la misma resolución de estado (calendario e incidencias).
18. Las clases del día figuran DICTADA desde la mañana, antes de la hora del módulo. Mostrá qué proceso las marca y con qué criterio de hora.
19. La pantalla "Ausencias y reemplazos" agrupa mal: un reemplazo de una licencia (suplente de Inglés 3ro A, licencia 5) aparece dentro del grupo de otra licencia de otra docente (#24), sin mostrar a su titular, y el grupo muestra fechas que mezclan varias licencias mensuales de la misma docente. Los datos están bien (Reemplazo.incidenciaId completo). Revisá cómo se arman los grupos y las fechas de esa pantalla.
20. Mejora pedida: en "Ausencias y reemplazos", la fila del titular de cada licencia tiene que mostrar el artículo de la licencia (código y descripción del CodigarioItem), además de sus fechas. Hoy no aparece.
21. Licencias encadenadas (Incidencia.incidenciaPadreId): el titular está ausente y lo cubre el suplente A; luego A se ausenta (licencia hija) y lo cubre B. Ambos Reemplazo apuntan a la misma ClaseProgramada. En la licencia del titular es correcto mostrar a A como reemplazo, pero en la licencia encadenada A aparece como reemplazo cuando es el ausente; debería figurar como ausente y B como reemplazo. Si se borra el reemplazo de B, la encadenada sigue mostrando a A. Revisá cómo se modela la cadena (qué reemplazo pertenece a qué licencia, Reemplazo.incidenciaId de la hija), cómo la muestran las pantallas y quién figura como el que da la clase en cada fecha. Ojo: el 22/10 se completó Reemplazo.incidenciaId por script tomando la licencia de la clase (la del titular), lo que pudo dejar mal vinculados los reemplazos de B.

Qué quiero que hagas:
- Explorá el repo y para cada problema indicá archivo, función y líneas responsables, con la causa en una o dos frases.
- Proponé la corrección mínima y un test que reproduzca el problema (fallando antes, pasando después).
- Listá todas las rutas que escriben ClaseProgramada o Reemplazo y señalá las que no pasan por la misma lógica.
- Sugerí mejoras: un módulo único de resolución de estado de clase con prioridades explícitas (fin de asignación, cambio de distribución, calendario, incidencia según artículo), validaciones al guardar distribuciones, y un mensaje de activación con desglose.

Restricciones:
- No te conectes a la base de producción ni corras migraciones o seeds sin preguntarme.
- No cambies el schema de Prisma sin explicar el motivo y el impacto en los datos existentes.
- No asumas reglas de liquidación: si una regla depende de normativa, preguntame.
- Antes de editar código, mostrame el diagnóstico y el plan, y esperá mi aprobación.
- Respondé en español.
```