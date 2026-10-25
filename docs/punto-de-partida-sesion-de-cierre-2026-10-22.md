# ALNEXT · Punto de partida (sesión de cierre 22/10/2026)

## 1. Qué se hizo hoy

1. **Plan de corrección del motor de clases** (`docs/plan-correccion-motor-clases-2026-10-22.md`): diagnóstico por causa raíz de los 21 bugs del piloto de Ceferino, reglas de negocio, diseño, fases 0 a 7 y decisiones tomadas. Commiteado en `feature/instalador-alnext` (`0e85d77`). El plan tiene cambios sin commitear (ver sección 5).
2. **Copia local de la base de Ceferino** (Fase 0): dump generado en la notebook de Ceferino (`alnext_ceferino_20261022_1706.dump`, 170.462 bytes, SHA256 `2E4441385EC763A92309107D1A08D5A26086E05EBA9337D8DD7F77B890D91537`), verificado en WSL, restaurado como DB `alnext_ceferino` (pg_restore 18.6, exit 0, 2.404 clases). `prisma migrate status`: schema al día con las 13 migraciones. Respaldo de la copia limpia en `~/datos_ceferino/base_copia_limpia.dump`.
   - Baseline: 78 asignaciones, 43 incidencias, 465 reemplazos, 79 distribuciones, 1 institución.
   - Control de consistencia (4 consultas) en 0: sin clases vivas de asignaciones dadas de baja, ninguna fuera de distribución activa, ningún reemplazo activo en clase no suspendida, ninguna incoherencia incidencia/causa. Los bugs del piloto aparecen al ejecutar operaciones, no como datos corruptos hoy.
3. **Fase 1 (fechas) terminada** en la rama `fix/motor-clases-fase-1`, 5 commits:
   - `90558d9` helper `lib/helpers/fechaInstitucion.ts` (`hoyLocal`, `hoyLocalISO`, `minutosAhora`, `claseTermino`) + 18 tests sin base.
   - `c12aadf` servidor: ~17 archivos (motor, `resolverClasesVencidas`, `withContext`, dashboard, repositorios, etc.) más sitios A a E: `/api/clases?hoy`, cobertura por comisión, `cambiarTitularAsignacion`, rankings, "ayer" del overview.
   - `5a0a0b0` cliente (clases, incidencias, períodos, asignación) y nombre del PDF (sitio F).
   - `442c36e` `tests/fechaYaPaso.test.ts` (7 casos, reloj simulado solo de `Date`) y `tests/helpers/guardiaBaseTest.ts` (aborta si la base no es `gestor_test`).
   - `27d26bc` `tests/arquitectura-fechas.test.ts` (prohíbe `setUTCHours(0,0,0,0)` y `toISOString().split("T")` fuera del helper; lista blanca de 15 entradas con cantidad exacta y motivo).
   - Resultado: build limpio; suites 247 tests, 216 pasan, 31 fallos previos idénticos (#168 a #173), ninguno nuevo. Con el motor viejo, 5 de las 7 filas de `fechaYaPaso` fallan: el test detecta el bug.
   - Prueba manual con la copia de Ceferino (a las 21:xx locales, cuando el UTC ya había cambiado de día): el 23/10 no tiene ninguna clase DICTADA (solo PROGRAMADA y REEMPLAZADA, incluidas las de jornal).
4. **Prompt de la Fase 2** (motor) preparado: `prompt-claude-code-fase-2-motor.md`. Todavía no se ejecutó.

## 2. Estado de ramas y entornos

- Rama de trabajo: `fix/motor-clases-fase-1` (creada desde `feature/instalador-alnext`, base `0e85d77`). **Hacer `git push -u origin fix/motor-clases-fase-1`** si no se hizo. No fusionar todavía.
- Fase 2 arrancará en `fix/motor-clases-fase-2`, desde la rama de la Fase 1.
- Pruebas: Claude Code levanta un servidor propio `NODE_ENV=test` en el puerto 3100 contra `gestor_test`. El puerto 3000 se reserva para la app de desarrollo (puede apuntar a `alnext_ceferino`; nunca correr tests HTTP contra ese servidor).
- Comando de la app contra la copia de Ceferino: `DATABASE_URL="postgresql://<usuario>:<clave>@localhost:5433/alnext_ceferino?schema=public" DEV_TENANT_DOMAIN="" npm run dev`.
- Restaurar la copia limpia: `DROP DATABASE alnext_ceferino WITH (FORCE)`, `CREATE DATABASE`, `pg_restore --no-owner --no-acl ~/datos_ceferino/base_copia_limpia.dump`.

## 3. Hallazgos de la sesión

- **Seguridad:** `lib/prisma.ts:18` imprime la URL de la base con la contraseña en cada arranque (tarea #281). El build también imprime 15 líneas `DB USADA`. Se arregla en un commit aparte. Además, la contraseña de la base de Ceferino (`alnext_app`) quedó expuesta en el chat: rotar.
- **Tests HTTP:** usan el servidor de `localhost:3000` y no verifican a qué base apunta (ese puerto estaba conectado a `alnext_ceferino`). Mejora para la Fase 2: que `tests/helpers/auth.ts` aborte si el servidor no responde con `gestor_test`, o cambiar el puerto por defecto.
- **Control diario de `withContext`:** corre una vez por día. Con la hora del módulo, las clases de hoy pasan a DICTADA recién con la primera petición del día siguiente; durante el día, los indicadores de "dictadas hoy" las muestran como PROGRAMADA. Decisión: dejarlo en esta etapa; resolver aparte (por ejemplo, correr el control cada hora).
- **Node portable (`C:\ALNEXT\node`):** falta confirmar que soporta `Intl` con zonas horarias. Comando a correr en la VM (tiene que mostrar `20:59`):
  `C:\ALNEXT\node\node.exe -p "process.versions.node+' '+process.versions.icu+' '+new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date('2026-10-22T23:59:00Z'))"`
  Si no lo soporta, alternativa: desfase fijo de -3 h (Argentina no tiene horario de verano).
- `periodos-operativos/page.tsx` y `AvisoPeriodoOperativo.tsx` recortan a medianoche `fecha_hasta` de la base: no cambia nada, se puede quitar en la Fase 6.
- El test de arquitectura solo detecta los dos textos exactos; un `new Date()` comparado directamente contra una fecha no lo detecta.

## 4. Reglas operativas vigentes en Ceferino hasta que se despliegue la corrección

- No guardar licencias en asignaciones con cambios de distribución.
- No usar "Editar" distribución para enroques provisorios.
- Correr el control de consistencia tras cambios grandes y hacer backup antes.
- La notebook sigue con el paquete v2 (fuentes con wizard y corrección de zona horaria #282). No hay despliegue nuevo hasta la Fase 7.

## 5. Pendientes

**Inmediatos**
1. Push de `fix/motor-clases-fase-1`.
2. Fase 2 (motor): ejecutar `prompt-claude-code-fase-2-motor.md` en `fix/motor-clases-fase-2`. Primero tabla de casos de `resolverEstadoYCausa` y diagnóstico; punto clave a decidir: que una clase ya DICTADA no pase a `CAMBIO_DISTRIBUCION`/`FIN_ASIGNACION` por re-resolución (la reescritura del pasado va por la reconciliación explícita de la Fase 3).
3. Commit aparte de seguridad (#281): quitar el log de `lib/prisma.ts:18` y las líneas `DB USADA`.
4. Decidir qué hacer con el cambio sin commitear de `docs/plan-correccion-motor-clases-2026-10-22.md` y copiar a `docs/` el prompt de la Fase 2 y este informe.
5. Verificar `Intl` en el Node portable de la VM.

**Plan de fases (resto):** Fase 3 reconciliación (`reconciliarAsignacion`, transacciones), Fase 4 licencias (índice único parcial con migración SQL, ancestros, edición/eliminación con reemplazos, `agenteAusenteId`), Fase 5 reportes (agrupar por `incidenciaId`, segmento posterior a hija, artículo visible, borrar `obtenerCadenaOperativaClases.ts`; revisar `reportes/ausencias/page.tsx`), Fase 6 UX y deuda menor, Fase 7 despliegue (control de consistencia, backup, migraciones, paquete v5, actualización de Ceferino con el procedimiento validado).

**Abiertos de antes:** rotar contraseña de la base de Ceferino; seguridad P0/P1 antes de datos reales (#205, #206, #207, #217); paquete v4/v5; Ceferino Parte B (Tailscale + control de licencia) y carga de datos reales; tareas #167 a #173 (tests desactualizados), #189, #191, #247, #278 a #280; confirmar con la normativa la regla de días que suspenden clases (`suspendeClases` vs `esFeriado`); actualizar el informe del 06/10 con la instalación en Ceferino (hash verificado, backup en `C:\ALNEXT-respaldo\app_20261013_1718`, exit 0); postproducción opcional del video de la demo; renombrar snapshot de VirtualBox a "02-10 con Tailscale".

## 6. Reglas de trabajo que se mantienen

- Verificar, no asumir; Leandro corre los comandos y pega las salidas (solo la salida del último comando).
- No pegar líneas con contraseñas (`DB USADA:`, `DATABASE_URL`); `config/institucion-demo.json` no se commitea.
- Datos reales de Ceferino siempre fuera del repo y nunca en GitHub; no apuntar nunca la app de desarrollo a la base viva del piloto ni tocar migraciones o seeds en el piloto.
- Verificar SHA256 tras expulsar y reinsertar el pendrive.