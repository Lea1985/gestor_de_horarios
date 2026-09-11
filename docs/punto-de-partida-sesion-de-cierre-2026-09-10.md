# ALNEXT — Punto de partida / cierre de sesión 10/09/2026

## Resumen del día

Cierre de Fase 9 (Reportes) y arranque del bloque "antes del piloto — backup/restauración/instalador" del plan registrado el 09/09. Pivote arquitectónico importante a mitad de sesión: el destino de instalación del piloto pasa de **WSL2+Ubuntu** a **Windows nativo**, decidido por dos motivos del usuario: las máquinas de las escuelas se apagan al finalizar la jornada (WSL2/cron no es confiable en ese escenario) y el proyecto ya no depende de ningún build nativo (`bcrypt`→`bcryptjs`), así que instalar en Windows puro es totalmente viable.

## Hecho hoy

1. **UX-REP-005** aplicado en `jornadas` y `modulos-computables` (botones ver/descargar unificados) — commit `74aa697`. De paso se restauró lógica de UX-REP-001 que se había perdido en una edición manual del usuario.
2. **UX-REP-011 y UX-REP-012** — decisión explícita del usuario: documentados como aceptados, no implementados. **Fase 9 (Reportes) queda formalmente cerrada.**
3. **UX-INC-014 (#150)** — wizard de nueva incidencia ahora distingue asignaciones sin clases vigentes (gris, deshabilitadas, tooltip) — commit `f880fc7`.
4. **#109** — incidencia hija de "Ausencia del suplente" ya no se atribuye módulos que el suplente ausente nunca cubrió (nuevo estado `"parcial"` en `ModalAusenciaSuplente.tsx`) — commit `351cc97`.
5. **Auditoría UX Fase 10** (Institución, agentes y acceso — 13 hallazgos UX-ADM-001 a 013) recibida, corregida y registrada — commit `eb844fe`.
6. **Plan pre-piloto/post-piloto** del usuario revisado con feedback técnico propio (no solo validación), registrado como documento vivo (`plan-pre-post-piloto-alnext.md`, en outputs, no en el repo — es un doc de planificación de negocio, no de código). Incluye criterios de éxito del piloto definidos con el usuario.
7. **Hasheo de contraseñas**: confirmado que ya usa `bcrypt` en creación y login, sin acción pendiente.
8. **Script de reseteo manual de contraseña** (`scripts/resetear-password.ts`) — hecho, probado en vivo (43 sesiones cerradas de un usuario real). Depende de `eliminarTodasLasSesiones`.
9. **UX-ADM-005** (texto engañoso del modal de eliminar agente) y **UX-ADM-007** (link muerto "¿Olvidaste tu contraseña?") — commit `6427cfb`.
10. **UX-ADM-006** (ninguna pantalla distingue un 401 de un error genérico) — interceptor global de `fetch` en `useAuth.ts` + mensaje en login — commit `7df00dd`.
11. **Criterios de éxito del piloto** definidos con el usuario (ventana hasta 31/12/2026, señales de éxito/fracaso concretas, referencia de precio $75.000/mes).
12. **Pivote WSL2 → Windows nativo** para el destino de instalación, decidido y confirmado con el usuario.
13. **Postgres 18 nativo instalado y configurado en la máquina de desarrollo del usuario** (side-by-side con su Postgres de WSL2, sin conflicto) — solo para diseñar/probar los scripts de backup, no para desarrollo real. Incluyó resolver un lockout de contraseña post-instalación silenciosa de winget (procedimiento estándar: `pg_hba.conf` → trust temporal → reset → restaurar).
14. **`scripts/backup-alnext.ps1`** — `pg_dump` contra `DATABASE_URL` (o `-DatabaseUrl` directo para pruebas), archivo timestampeado, retención automática de los últimos 14. **Probado manualmente con éxito** contra una base de prueba (`gestor_prueba_backup`), incluyendo verificación de contenido real del dump.
15. **`scripts/restaurar-alnext.ps1`** — restauración destructiva con confirmación explícita (escribir el nombre exacto de la base), `DROP DATABASE`/`CREATE DATABASE`/`psql -f`. **Ciclo completo probado con éxito de forma manual**: creé tabla de prueba → backup → restauré → confirmé que el dato volvió intacto.

## Bloqueador abierto — sin resolver

Al registrar los dos triggers de Task Scheduler (uno "al iniciar sesión", otro repitiendo cada 4 horas, vía módulo `ScheduledTasks` de PowerShell) para automatizar `backup-alnext.ps1`:

- El registro de la tarea (`Register-ScheduledTask`) funcionó sin problemas (tras correr como Administrador).
- **Disparar la tarea manualmente con `Start-ScheduledTask` reporta éxito (`LastTaskResult: 0`), pero NO genera ningún archivo de backup nuevo** — se probó dos veces, con espera de hasta 10 segundos.
- Correr exactamente la misma línea de comando (`powershell.exe -ExecutionPolicy Bypass -File "..." -DatabaseUrl "..."`) directamente en una consola normal **sí funciona siempre**, sin excepción.
- Se verificó que el `Arguments` registrado en la tarea es idéntico, carácter por carácter, al que funciona manualmente (`Get-ScheduledTask ... | Format-List Actions`).
- **Próximo paso concreto, sin empezar**: revisar el log `Microsoft-Windows-TaskScheduler/Operational` filtrado por el nombre de la tarea (`Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" ... | Where-Object {$_.Message -match "ALNEXT-Backup-TEST"}`) para ver si el proceso realmente se lanza o si Task Scheduler está reportando un falso éxito. Si el log no tiene entradas, primero hay que habilitar el historial de esa tarea (deshabilitado por default en Windows).

**Estado dejado en la máquina del usuario**: la tarea programada `ALNEXT-Backup-TEST` queda registrada y activa (dispara cada 4 hs + al iniciar sesión), apuntando a `gestor_prueba_backup` (base de prueba, no la real de desarrollo — no hay riesgo de datos reales). No hace falta actuar con urgencia, pero conviene retomar esto antes de dar por terminado el diseño del backup automático, y eventualmente borrar la tarea de prueba (`Unregister-ScheduledTask -TaskName "ALNEXT-Backup-TEST"`) una vez resuelto el diagnóstico.

## Pendiente (orden sugerido al retomar)

1. **Diagnosticar el bloqueador de arriba** — revisar el log de Task Scheduler, entender por qué el trigger no ejecuta realmente `pg_dump` pese a reportar éxito.
2. Una vez resuelto: terminar de validar el backup automático (dejar los dos triggers funcionando de verdad), diseñar el flujo de backup manual/bajo demanda (ya cubierto por el mismo script corrido a mano — bajo costo, sin UI nueva necesaria).
3. Reescribir el "plan de instalación en máquina nueva" (hoy documentado para WSL2 en `docs/ Verdades del entorno — ALNEXT.md`) apuntando a Windows nativo.
4. Decidir sobre los dos `.sql` sueltos en la raíz del repo (`backup_antes_migracion.sql`, `gestor_horarios_backup.sql`) — probablemente remanentes de una migración de PC vieja, candidatos a borrar antes de que el nuevo sistema de backups genere confusión.
5. Ubicar/confirmar el seed real de Codigario + Colegio Ceferino (tarea #11) — insumo para el paso de instalador que carga datos operativos.
6. Cosmético, sin apuro: renombrar `docs/ Verdades del entorno — ALNEXT.md` (tiene espacio y guion largo al inicio) a una convención tipo `docs/verdades-entorno-alnext-2026-07-29.md`.
7. Hallazgos Fase 10 restantes, todos ya clasificados en `plan-pre-post-piloto-alnext.md`: UX-ADM-001/002/003 (post-piloto, roles/sesiones/endurecimiento), UX-ADM-004 (resuelto vía seed del instalador, sin tarea de código), UX-ADM-008/009/010/011/012/013 (sin urgencia).
8. Backlog no tocado esta sesión: #167-173 (45 tests desactualizados), #189 (UX-DSH-007, documentado no implementado), #191, #204 (post-piloto, licencias MVP).

## Archivos nuevos de esta sesión (fuera del repo git, en outputs — pendiente decidir si van a `scripts/` del repo)

- `backup-alnext.ps1` — validado, funciona manualmente.
- `restaurar-alnext.ps1` — validado, funciona manualmente (incluye un fix en vivo: `$dbHost:$dbPort` interpretado como unidad de disco, corregido a `${dbHost}:${dbPort}`).

Ambos están hoy en `C:\Users\leand\alnext-backup-test\` en la máquina del usuario (carpeta de prueba, no el repo real). Cuando se resuelva el bloqueador de Task Scheduler, hay que moverlos a `scripts/` del repo real y commitearlos.