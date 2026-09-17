# Punto de partida — cierre de sesión 17/09/2026

## Contexto

Continuación directa del cierre del 16/09. Objetivo del día: correr las 5 (terminaron siendo 6) pruebas de validación en VM del paso 4 del instalador (`installer/Install-Postgres.ps1` + refactor de `Preflight.ps1`/`Common.ps1`) antes de dar el paso por cerrado.

## Resultado: los 6 escenarios validados, con 2 bugs reales encontrados y corregidos en el camino

### Preparación

- Copiados `Common.ps1`, `Preflight.ps1` e `Install-Postgres.ps1` a `C:\ALNEXT\installer\` en la VM (método: `cat` en WSL + pegado en Bloc de notas).
- **Hallazgo de proceso:** el pipeline de copia (WSL → portapapeles → Bloc de notas → "Guardar como") pierde el BOM UTF-8 sistemáticamente, sin importar si el archivo de origen en el repo lo tiene o no. Se volvió a verificar y corregir el BOM (bytes `EF BB BF`) cada vez que se copiaron archivos nuevos a la VM durante la sesión — quedó como paso estándar del proceso, no una excepción.

### Bloque 1 (snapshot "Smoke test OK — Postgres18 coexiste con Postgres17")

1. **Regresión fix A (bloqueo por instalación existente) — OK.** Confirmado exit 3 sin `-AllowExistingInstallation`, exit 0 con el flag. El refactor a `Common.ps1` no rompió nada.
2. **Regresión fix C (auto-elevación + relay JSON) — OK.** Probado con el usuario `docente` (no-admin) vía `runas`; hubo que recrear el usuario (no existía en esta snapshot, se creó en una sesión posterior no snapshoteada) y resetear su contraseña dos veces por desajustes de tipeo. Una vez resuelto, UAC real + relay por archivo temporal funcionaron igual que antes del refactor.
3. **Camino de reuso de `Install-Postgres.ps1` — bloqueado por bug real, corregido, revalidado OK.**
   - **Bug 1 (crítico):** al invocar `Preflight.ps1` como proceso hijo (`& powershell.exe @preflightArgs`), su salida de `Write-Host` (resumen de consola) queda mezclada con el JSON en `$preflightRaw` — no se descarta como se asumía en la revisión de código original. Esto rompía `ConvertFrom-Json` siempre que Preflight salía con éxito, activando el fallback `preflightJsonInvalido` (exit 6) incluso en el camino feliz. **Fix:** `Preflight.ps1` emite el JSON comprimido (`-Compress`, una sola línea); `Install-Postgres.ps1` toma la última línea no vacía de la salida capturada en vez de unir todo el bloque.
   - **Bug 2 (diseño, crítico):** una vez resuelto el bug 1, se confirmó que el camino de reuso era **inalcanzable con éxito en cualquier escenario real**: si el servicio propio está corriendo, el puerto aparece ocupado y Preflight aborta con exit 2 antes de evaluar que es reusable; si está detenido (para liberar el puerto), nada lo arranca y el loop de verificación siempre termina en timeout (exit 4). **Fix:** (a) camino rápido al principio de `Install-Postgres.ps1` — si el servicio propio ya está corriendo y responde, éxito inmediato sin invocar Preflight ni depender de `-AllowExistingInstallation`; (b) en el camino de reuso normal, `Start-Service` explícito antes del loop de verificación, para el caso "instalación existe pero servicio detenido".
   - Ambos sub-escenarios (servicio corriendo → camino rápido; servicio detenido → `Start-Service`) revalidados en VM con éxito (exit 0 en los dos).
4. **Aborto por instalación existente sin flag — OK.** Exit 3 confirmado, sin invocar el instalador.

### Bloque 2 (snapshot "Conflicto puerto 5432 - Postgres17")

Esta snapshot es previa a la descarga del instalador de Postgres 18 — hubo que volver a descargarlo (misma build 18.6-3) desde la página oficial de EnterpriseDB.

5. **Instalación limpia de punta a punta — OK.** Exit 0, `instaladorInvocado:true`, `postgresListo:true`. Verificación adicional que nos preocupaba desde la revisión de código: conexión real con `psql` usando el `SuperPassword` exacto pasado al script — confirmó que el armado de argumentos vía `Start-Process -ArgumentList` (con comillas escapadas) pasa las credenciales correctamente al instalador real.
6. **Aborto por puerto ocupado — OK.** Exit 2 confirmado (puerto ocupado por `TcpListener` falso), sin invocar el instalador.

## Paso 4 del instalador: CERRADO

Los 6 escenarios (regresión de Preflight ×2, reuso ×2 sub-casos, aborto por instalación existente, instalación limpia, aborto por puerto ocupado) están validados empíricamente en VM, no solo por revisión de código. `installer/Preflight.ps1` e `installer/Install-Postgres.ps1` quedan con dos rondas de fixes aplicadas hoy sobre lo commiteado ayer (`0639919`).

## Estado de git

Pendiente de commitear al cierre de esta sesión: los fixes de hoy a `installer/Preflight.ps1` (`-Compress`) e `installer/Install-Postgres.ps1` (extracción de última línea + camino rápido + `Start-Service`), más este documento de cierre.

## Pendiente para la próxima sesión

- Paso 5 en adelante del plan original: usuario/DB/env/migrate/seed, arranque de la app, registro de tarea de backup, estrategia de actualización — nada de esto empezó todavía.
- Limitación conocida documentada en el header de `Install-Postgres.ps1`, sin resolver: `-AllowExistingInstallation` asume que la instalación detectada por Preflight es la propia de ALNEXT — no distingue un Postgres 18 ajeno en la máquina (otro servicio/puerto). Bajo riesgo para el escenario real del piloto, no resuelto.
- Ítem cosmético sin resolver: `preflightExitCode` en el JSON de salida muestra `-1` en vez de un valor más claro cuando se toma el camino rápido (el mensaje de consola sí lo aclara). No bloqueante.
- Caso borde documentado por Claude Code pero no probado: servicio `Running` pero Postgres todavía no acepta conexiones (ventana de arranque muy angosta) — podría dar exit 2 en vez de detectarse correctamente. No estaba en el alcance de las pruebas de hoy.
- Backlog sin tocar: igual que el 16/09 (#11, #167-173, #189, #191, #204-217, etc.)

## Nota técnica: estado de la VM al cierre

Snapshot final recomendada: tomar una nueva instantánea del estado actual (Postgres 18 real instalado y corriendo, servicio `postgresql-alnext` sano en el puerto 5433, sobre la base de "Conflicto puerto 5432 - Postgres17") antes de apagar, para tener un punto de partida limpio y ya validado para la próxima sesión.