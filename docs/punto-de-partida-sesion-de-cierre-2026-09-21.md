# Informe de avance — sesión 21/09/2026

## Objetivo de la sesión

Terminar de construir y validar `Install-ALNEXT.ps1` (el orquestador único de los 4 pasos del instalador) de punta a punta, y avanzar en el mayor gap arquitectónico restante: cómo empaquetar el instalador para una máquina realmente en blanco (sin Node.js ni el código de la app preinstalados a mano).

## Resumen ejecutivo

Sesión larga y muy productiva. Se logró:

1. **Validación end-to-end 100% exitosa del orquestador** — primera vez que `Install-ALNEXT.ps1` corre los 4 pasos completos, desde una VM en estado limpio (rol y base de datos reseteados), hasta la app funcionando en `http://127.0.0.1:3000`, con `exitCode:0` en los 4 pasos en una sola invocación.
2. **5 commits nuevos** a `feature/instalador-alnext`, todos validados en la VM antes de pushear: los 3 bugs del orquestador (puerto/quoting/timeout), auto-elevación standalone, fallback de `psql.exe`, banner cosmético, y el mecanismo de Node.js portable.
3. **Diseño e implementación de la primera pieza de #248** (empaquetado offline): la app ahora puede correr con una copia portable de Node.js en vez de depender de una instalación formal, validado en dos escenarios reales en la VM.

## 1. Orquestador: 3 bugs corregidos y portados a WSL

El commit `5ccf826` (de una sesión anterior) tenía `Install-ALNEXT.ps1` pero con 3 bugs, solo detectables corriendo el flujo orquestado real (no probando cada script por separado). Los 3 se diagnosticaron y arreglaron directo en la VM, y hoy se portaron al repo:

**Bug A — `Preflight.ps1` no contemplaba el escenario de reuso al chequear el puerto.** Abortaba con `exitCode 2` sin importar `-AllowExistingInstallation`, aun cuando el puerto ocupado era precisamente el de la instalación que se quería reusar. Fix: `$reusoEsperado = ($instalacionExistente -or $servicioPropioExistente) -and $AllowExistingInstallation`.

**Bug B — comillas manuales rompían el paso de argumentos a los sub-scripts.** `Invocar-Paso` usa `&` + splat de array contra `powershell.exe` como comando nativo, que ya cita cada elemento correctamente solo; comillas manuales de más (patrón necesario en cambio para `Start-Process -ArgumentList`) rompían el parseo de Windows y perdían tokens — confirmado con `-AllowExistingInstallation` desapareciendo en el proceso hijo.

**Bug C — dos problemas más del mismo origen:** el parámetro de `Invocar-Paso` se llamaba `$Args` (colisión con la variable automática reservada de PowerShell, renombrado a `$Argumentos`), y los flags opcionales vacíos (`-ServicePassword`, etc.) se agregaban siempre al array aunque estuvieran vacíos — un string vacío se pierde al splatear contra un comando nativo, dejando al flag anterior sin valor.

Portados a WSL en el commit `366152c`.

## 2. Validación end-to-end completa

Se reseteó el estado de la VM (rol `alnext_app` y base `alnext` borrados) y se corrió `Install-ALNEXT.ps1` completo, con el fix de timeout del Paso 4 ya puesto:

| Paso | Resultado |
|---|---|
| 1/4 — Preflight | ✅ exitCode 0 |
| 2/4 — Install-Postgres | ✅ exitCode 0 (reuso de instalación existente) |
| 3/4 — Install-Database | ✅ exitCode 0 (rol, base, 13 migraciones, seed) |
| 4/4 — Install-AppService | ✅ exitCode 0, app respondiendo |

Primera corrida limpia y completa sin intervención manual.

## 3. Otros 3 fixes del lote chico

- **#259 — auto-elevación de `Install-AppService.ps1` standalone.** Antes requería que el operador abriera la consola ya como Administrador. Ahora se auto-eleva con el mismo patrón `Test-Elevado`/`Invoke-Elevado` que ya usan los otros scripts. Validado: consola sin elevar → pide UAC una vez → `exitCode:0`.
- **#249 — `psql.exe` resolvía mal en invocación standalone.** El fallback (cuando no se pasa `-PsqlPath` y psql no está en PATH) asumía la ruta default de EDB (`C:\Program Files\PostgreSQL\18\...`), pero el instalador usa `-Prefix` propio (`C:\ALNEXT\pgsql`). Nueva cadena: PATH → registro de Windows (`HKLM:\SOFTWARE\PostgreSQL\Installations\...`, da el `Base Directory` real sea cual sea el `-Prefix`) → convención de ALNEXT como último recurso.
- **#257 — banner rojo cosmético en `migrate status`.** El operador `2>&1` de PowerShell envuelve stderr de un comando nativo en `ErrorRecord`, y Windows PowerShell 5.1 lo muestra en rojo aunque `$ErrorActionPreference = "Continue"`. Fix: correr `npx prisma migrate status 2>&1` a través de `cmd /c "..."` para que el merge de stderr lo haga cmd.exe antes de que PowerShell lo vea.

Los 3 validados en VM y commiteados (`f6a3098`, `388f675`, `9984ee4`).

## 4. #248 — Empaquetado offline (parte 1: Node.js portable)

Decisión de diseño: un paquete offline único (`C:\ALNEXT\installer` + `app` + `node` + `postgres-installer`), copiable a una máquina en blanco sin necesitar internet el día de la instalación real — importante para una escuela con conectividad incierta.

Pieza clave que simplifica todo: `Install-AppService.ps1` ya corre `next build` como parte de su Paso 6, así que el paquete **no necesita** la app pre-compilada, solo código fuente + `node_modules` ya instalado (`npm install` corrido una vez al armar el paquete).

Cambio de código: nueva función `Add-NodePortableAlPath` en `Common.ps1` — si existe `C:\ALNEXT\node\node.exe`, la antepone al `$env:PATH` del proceso actual (no toca nada si ya hay Node en el PATH del sistema). Llamada agregada a `Install-ALNEXT.ps1`, `Install-Database.ps1` (que no la tenía, se le agregó también el dot-source de `Common.ps1`) e `Install-AppService.ps1`. Detalle importante: en los scripts que se auto-elevan, la llamada va **después** del bloque de elevación — un `$env:PATH` modificado antes se pierde en el relanzamiento por UAC, porque ese es un proceso nuevo que lee el PATH desde el registro, no hereda el de memoria del proceso que lo lanzó.

Validado en VM en los dos escenarios que importaban:
- `Install-Database.ps1` standalone con el Node del sistema **ocultado del PATH de la sesión** (prueba real de que usa el portable, no solo que ambos coexisten) → `exitCode:0`.
- `Install-AppService.ps1` standalone con auto-elevación por UAC → resuelve `nodeExe: C:\ALNEXT\node\node.exe` (prioridad sobre el Node real del sistema, que seguía instalado) → `exitCode:0`, `appRespondiendo:true`. Confirma que el PATH modificado sobrevive el relanzamiento elevado.

Commiteado en `26e27e0`.

## Estado de git al cierre

Rama `feature/instalador-alnext`, 5 commits nuevos hoy sobre `5ccf826`:

1. `366152c` — fix: portar fixes del orquestador probados en VM (#261, #262, #263)
2. `f6a3098` — feat: auto-elevación en Install-AppService.ps1 standalone (#259)
3. `388f675` — fix: psql.exe usa registro de Windows en vez de ruta EDB hardcodeada (#249)
4. `9984ee4` — fix: eliminar banner rojo cosmético de migrate status (#257)
5. `26e27e0` — feat: soporte para Node.js portable en paquete offline (#248, parte 1)

Todo pusheado a `origin/feature/instalador-alnext`.

## Pendiente para la próxima sesión

1. **Completar #248**: armar el paquete offline real completo (carpetas `node/` + `app/` + `postgres-installer/` juntas en una estructura distribuible) y probarlo contra una VM **genuinamente en blanco** — sin Node, sin Postgres, sin ninguna corrida previa. Lo de hoy valida el mecanismo de detección de Node portable, no el paquete completo armado ni el camino de instalación de Postgres/preparación de la app 100% desde cero.
2. **Backlog técnico menor sin tocar hoy**: #217 (rutas `/protected/*` sin protección server-side) y el resto de items P0/P1 de seguridad (#205, #206, #207) quedan fuera del alcance de esta sesión, centrada en el instalador.

## Notas operativas

- El mojibake de acentos que a veces aparece en la consola de la VM (`Ã³` en vez de `ó`) es solo un problema de codepage al mostrar el archivo — los archivos reales están en UTF-8 correcto, confirmado al portarlos a WSL.
- Al remover una entrada del `$env:PATH` a mano con `Where-Object`, cuidado con barras finales (`C:\Program Files\nodejs\` vs `C:\Program Files\nodejs`) — el filtro exacto no matchea si hay un `\` de más al final; usar `.TrimEnd('\')` al comparar.
- Sigue pendiente desactivar Quick Edit Mode en las propiedades de la consola de la VM (recomendado en sesiones anteriores) para evitar que clickear dentro de la ventana pause procesos en curso.
