# Punto de partida — cierre de sesión 16/09/2026

## Contexto

Continuación directa del cierre del 15/09 (documento `analisis-completo-instalador-alnext-2026-09-15.md`, commit `38ecfba`). Ese día se entregó el análisis consolidado y el prompt de implementación para Claude Code. Hoy arrancó la implementación real en la rama `feature/instalador-alnext`, siguiendo el plan de 8 pasos definido en ese documento. Se avanzó del Paso 2 (ya cerrado ayer) hasta dejar el Paso 4 con el código completo, revisado y con un fix aplicado — pendiente de validación empírica en la VM mañana.

## Paso 3 — Fix del puerto 5433 hardcodeado en `test:run` — APROBADO

Cambio de Claude Code: `test:run` pasó de tener `cross-env DATABASE_URL=postgresql://admin:admin123@localhost:5433/...` hardcodeado a simplemente `vitest run --reporter=verbose`, apoyándose en el mismo mecanismo (`dotenv.config()` incondicional en `tests/setup.ts`) que ya usaba el script `test`.

**Validado empíricamente, no solo por lectura de código:**
- `npm run test:run` contra Postgres real (puerto 5433) confirmó vía `tests/prisma-runtime.test.ts` que `DATABASE_URL` se resuelve correctamente desde `.env.test` sin el hardcodeo (`DB USADA: postgresql://admin:admin123@localhost:5433/gestor_test`).
- `tests/checkMigraciones.test.ts` también pasó, conectando al mismo destino.
- Se confirmó además, corriendo `npx vitest run` directo (sin pasar por ningún script de `package.json`), que el patrón de fallos del resto de la suite es idéntico con o sin el fix — es decir, completamente independiente del cambio.

**Hallazgo aparte, no bloqueante:** ~258 tests fallando con un patrón sistemático de códigos HTTP invertidos entre validación de tenant y token (esperado 400/401, recibido el otro) en casi todos los endpoints de API. Se investigó como posible regresión de seguridad antes de confirmar que ya estaba documentado en el backlog: ítem **#168** ("Tests 'sin tenant' esperan 400, withContext devuelve 401 (~20 casos)"), parte de los 45 tests desactualizados post-auditorías UX (#167-173). No es un bug nuevo — se descarta como bloqueante para el instalador.

## Paso 4 — Orquestación de la instalación de Postgres — CÓDIGO COMPLETO, REVISADO, PENDIENTE DE VM

### Archivos

- **`installer/Common.ps1`** (nuevo): extrae `Test-Elevado` y `Invoke-Elevado` (patrón de auto-relanzamiento + relay de JSON por archivo temporal) desde `Preflight.ps1`, para no duplicar esa lógica — que ya pasó por tres rondas de bugs reales — en el nuevo script.
- **`installer/Preflight.ps1`** (refactor): ahora usa `Common.ps1`. Comportamiento preservado byte a byte en el resto del archivo (bind test IPv4+IPv6, detección de registro/servicio, bloqueo por instalación existente, salida JSON) — verificado por diff.
- **`installer/Install-Postgres.ps1`** (nuevo, ~275 líneas): orquestador del paso 4.

### Diseño de `Install-Postgres.ps1`

- Se auto-eleva (vía `Common.ps1`) porque necesita invocar al instalador de Postgres, que exige admin.
- Invoca `Preflight.ps1` como **proceso hijo real** (nunca dot-source ni `&` en el mismo proceso, porque Preflight termina con `exit`), capturando su JSON y exit code. Al estar ya elevado, el hijo hereda el token — no debería pedir un segundo UAC (pendiente de confirmar en VM).
- Decide según el exit code de Preflight sin repetir sus checks: 0 = seguir (instalar o reusar), 1/2/3 = abortar sin tocar nada.
- Si Preflight reporta instalación/servicio ya existente (con `-AllowExistingInstallation`), **nunca reinvoca el instalador** — solo verifica que la instancia existente responda. Decisión de diseño basada en el hallazgo del 14/09 (reinstalar la misma versión mayor puede reusar en silencio ignorando parámetros, o crashear).
- Espera activa: un solo loop de verificación (sin pollear por nombre de proceso, que era fráil y no verificado) — chequea directamente el estado final real: servicio `Running` + conexión TCP al puerto propio, hasta `-TimeoutMinutes` (default 15).
- Exit codes: 0 = instalado/reusado y verificado; 1/2/3 = heredados de Preflight; 4 = timeout esperando verificación real; 6 = fallo inesperado. (El 5 propuesto originalmente se descartó, fusionado en el 4.)

### Revisión de código — hallazgos

1. **Corregido:** si Preflight devuelve exit 0 pero su JSON no se puede parsear, el código ahora lo trata explícitamente como fallo inesperado (nuevo exit 6, flag `preflightJsonInvalido` trazable en el JSON de salida) en vez de asumir silenciosamente "no existe nada, instalar limpio". Verificado por diff — la corrección es correcta y mínima.
2. **Documentado, no bloqueante:** el exit code 1 de Preflight está sobrecargado (puede significar "sin elevación" o "cualquier otro error no controlado"). Queda anotado para una futura pasada de observabilidad, no urgente.
3. **Autodetectado por Claude Code, documentado en el header del script:** `-AllowExistingInstallation` asume que la instalación/servicio detectado por Preflight es la propia instancia de ALNEXT. Si existiera un Postgres 18 ajeno en la máquina (otro servicio/puerto), el script terminaría en timeout (exit 4) en vez de detectarlo como caso distinto — falla de forma segura (no silenciosa), pero no es el caso ideal. Bajo riesgo para el escenario real del piloto (PC de escuela sin Postgres previo). No resuelto en esta iteración.
4. **Sin verificar aún:** el armado de argumentos vía `Start-Process -ArgumentList` (con comillas escapadas por valor) para pasarle credenciales/paths al instalador de Postgres nunca se probó exactamente así — las pruebas del 14/09 tipeaban el comando directo en la terminal, un camino de parseo distinto. Hay que confirmar en la VM que el `SuperPassword` realmente llega bien al instalador (conectando después con `psql` usando esa misma contraseña).

## Pendiente para mañana — validación empírica en VM (5 escenarios)

No se dio nada por aprobado solo con la revisión de código — como en cada paso anterior, falta la prueba real:

1. **Regresión de Preflight.ps1 post-refactor a Common.ps1**: re-correr los tests de fix C (auto-elevación + relay JSON) y fix A (bloqueo por instalación existente) ya validados antes del refactor.
2. **Instalación limpia de punta a punta**: snapshot "Conflicto puerto 5432 - Postgres17" (sin Postgres 18) → correr `Install-Postgres.ps1` real → confirmar una sola elevación, Preflight sin UAC adicional, exit 0, y conexión real por `psql` con el `SuperPassword` dado.
3. **Camino de reuso**: snapshot "Smoke test OK - Postgres18 coexiste con Postgres17" (ya tiene `postgresql-alnext` corriendo) → correr con `-AllowExistingInstallation` → confirmar `instaladorInvocado:false`, exit 0.
4. **Aborto por instalación existente sin permiso**: misma snapshot, sin el flag → confirmar exit 3, sin invocar el instalador.
5. **Aborto por puerto ocupado**: snapshot limpia + puerto 5433 ocupado con `TcpListener` → confirmar exit 2, sin invocar el instalador.

## Estado de git

Rama `feature/instalador-alnext`, nada commiteado todavía:
```
 M package.json       (paso 2: engines; paso 3: fix test:run)
?? .nvmrc              (paso 2: 24.21.0)
?? installer/          (Preflight.ps1 refactorizado, Common.ps1 nuevo, Install-Postgres.ps1 nuevo)
```
Pendiente decidir si se commitea todo junto al cerrar el paso 4 validado, o por paso — no definido aún.

## Backlog sin tocar hoy

Todo lo de sesiones anteriores sigue igual: #11 (datos reales Colegio Ceferino), #167-173 (45 tests desactualizados, incluye #168 ya diagnosticado hoy), #189, #191, #204-217 (varios hallazgos UX-ADM pendientes), #222 (instalador, en progreso — este documento es su avance de hoy).