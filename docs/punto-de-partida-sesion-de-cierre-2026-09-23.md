# Punto de partida — sesión de cierre 23/09/2026

## Objetivo del día

Ejecutar la primera prueba end-to-end real del paquete de instalación offline
(#248): transferir el paquete armado ayer (22/09) a una VM **genuinamente en
blanco** (snapshot post-instalación de Windows, sin Node/Postgres/Tailscale/
`C:\ALNEXT`) vía pendrive, y correr `Install-ALNEXT.ps1` con la red
deshabilitada, para probar de verdad que no hay ninguna dependencia oculta de
internet ni de la máquina de desarrollo.

## Qué se hizo

1. Refresco de `app/` en el paquete offline (`C:\ALNEXT-paquete-offline\app`)
   a la última versión de WSL (HEAD `cec00f6`), incluyendo un `npm ci` limpio
   con el motor de Prisma regenerado.
2. Regeneración del zip (`tar`, mismo método que ayer) — 656.4 MB, confirmado
   por timestamp que refleja el refresco.
3. Copiado del zip a un pendrive FAT32 (14.64 GB, sin problema de límite de
   4 GB por archivo) y verificación de integridad por tamaño en ambos lados.
4. Restauración de la instantánea "Instantánea 1" (la VM en blanco genuina)
   en VirtualBox — con un error transitorio de VirtualBox
   (`VBOX_E_INVALID_VM_STATE`, "machine state: Snapshotting") que se resolvió
   solo reintentando.
5. Verificación de que la VM restaurada estaba efectivamente en blanco: sin
   `C:\ALNEXT`, sin servicio Postgres, sin `tailscale`/`node` en el sistema.
6. Copiado del zip desde el pendrive al escritorio de la VM, extracción con
   `Expand-Archive` (fue lento por la cantidad de archivos, pero terminó
   bien: ~32.750 archivos).
7. Deshabilitación del adaptador de red de la VM (Dispositivos → Red →
   desconectar) y verificación con `Test-NetConnection google.com -Port 443`
   (falló la resolución DNS, confirmando aislamiento real).
8. Ejecución de `Install-ALNEXT.ps1` con parámetros completos (`PgInstallerPath`,
   `SuperPassword`, datos de institución/admin de prueba), después de:
   - Copiar `app/` del paquete a la ubicación real esperada
     (`C:\ALNEXT\app`), ya que el instalador asume ese path por defecto.
   - Agregar el Node portable del paquete al `$env:Path` de la sesión.
   - Habilitar `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force`
     (la VM en blanco trae la política en `Restricted` por defecto — esto
     hay que tenerlo en cuenta para el instalador final, un cliente real no
     técnico se va a topar con esto).

## Resultado de la prueba

- **Paso 1/4 (Preflight): OK.**
- **Paso 2/4 (Instalación de Postgres): OK.** Instalador silencioso de EDB
  tardó varios minutos en segundo plano (proceso `postgresql-18.6-4-windows-x64`
  con PID visible, CPU subiendo) antes de que el servicio quedara `Running`
  y el puerto respondiera. Confirmado con `postgresListo: true`.
- **Paso 3/4 (Base de datos y seed): OK.** Rol `alnext_app` creado, base
  `alnext` creada, `.env` generado, 13 migraciones de Prisma aplicadas sin
  pending/drift, seed de instalación completado (institución "Escuela Prueba
  Offline", admin `admin@alnext.test`). Password del rol de app generada
  automáticamente: `uZlZQtbvA9HSWtSfoPY0xI5NSb5iyJO4` (solo válida en esta VM
  de prueba descartable).
- **Paso 4/4 (Arranque persistente de la app): FALLÓ.** Exit code 13
  (`Install-AppService fallo`). Error puntual: no se encontró
  `C:\ALNEXT\app\node_modules\next\dist\bin\next`.

## Hallazgo — bug real en el empaquetado (no en el instalador)

La causa raíz está en el comando `robocopy` usado ayer (22/09) para armar
`app/` dentro del paquete offline:

robocopy "C:\ALNEXT\app" "C:\ALNEXT-paquete-offline\app" /E /XD .git .next .claude backup_gestor_horarios docs tests installer
/XF .env app-service.log check.ts codigarios-dump.json "backup_pre_migracion_20260706_2303.dump" estructura.txt "gestor_tmp@0.1.0" CLAUDE.md README.md Dockerfile vitest.config.ts next node


`/XF` (exclude files) excluye por **nombre de archivo exacto en cualquier
profundidad del árbol**, no solo en la raíz. Los nombres `next` y `node`
puestos ahí (con la intención de excluir algún archivo puntual de nivel
superior) también excluyeron los binarios ejecutables `node_modules\next\dist\bin\next`
(y probablemente equivalentes de `node` en algún `.bin`), que son archivos
sin extensión llamados exactamente así. Resultado: el `node_modules` copiado
quedó casi completo pero le faltaba justo el launcher de Next.js — invisible
hasta que se intentó levantar la app de verdad.

**Esto confirma el valor de esta prueba**: nunca se habría detectado
validando solo contra la base de datos o corriendo la app ya instalada en la
VM de desarrollo (que nunca pasó por este robocopy).

## Pendiente para mañana

1. Corregir el `robocopy` de `app/` sacando `next` y `node` de la lista
   `/XF` (o reemplazar esos excludes por rutas más específicas si la
   intención original era otra).
2. Re-armar `app/` en el paquete offline con el robocopy corregido,
   re-generar el zip, y parchear (o re-transferir completo) la VM en blanco
   para completar la validación del Paso 4/4 y confirmar que la app queda
   corriendo y accesible.
3. Evaluar si conviene agregar una verificación post-copia al propio
   `Install-ALNEXT.ps1` o a un futuro `Build-Package.ps1` (la idea de
   "distribución reproducible" que se discutió el 22/09) que confirme la
   presencia de los binarios críticos (`next`, `node`, `npm`) antes de dar
   por buena la copia — hallazgo aplicable a esa iniciativa más grande,
   aunque siga deferida como hilo aparte.
4. Repetir la prueba completa desde una VM en blanco fresca una vez
   corregido el paquete, esta vez sin interrupciones, para validar los 4
   pasos de punta a punta.

## Notas operativas (nuevas de hoy)

- Una VM de Windows recién instalada trae la política de ejecución de
  PowerShell en `Restricted`. El instalador final va a necesitar o bien
  documentar el `Set-ExecutionPolicy -Scope Process -Bypass` como paso
  previo, o resolverlo desde un `.bat`/acceso directo que lo haga
  automáticamente — un cliente no técnico no va a saber hacerlo solo.
- `robocopy /XF <nombre>` es peligroso con nombres de archivo genéricos
  (`next`, `node`, etc.) porque no respeta profundidad ni contexto — conviene
  usar rutas relativas completas o patrones más específicos para excludes
  de archivos puntuales, reservando `/XF` con nombres cortos solo para casos
  donde se esté seguro de que ese nombre no se repite en ningún lado del
  árbol (algo que en un `node_modules` de miles de paquetes es imposible de
  garantizar a ojo).
- El error transitorio `VBOX_E_INVALID_VM_STATE` al restaurar una
  instantánea en VirtualBox se resolvió solo esperando y reintentando — no
  hizo falta reiniciar VirtualBox ni la VM.
