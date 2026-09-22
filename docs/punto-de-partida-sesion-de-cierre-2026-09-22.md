# ALNEXT — Punto de partida / cierre de sesión 22/09/2026

## Objetivo de la sesión

Terminar el instalador portable: cerrar el gap identificado entre el plan del
12/09 (control de licencia vía Tailscale) y lo que realmente estaba
construido en el orquestador, y avanzar en el empaquetado offline (#248).

## Resumen ejecutivo

- Se sumó Tailscale como Paso 5 opcional del orquestador `Install-ALNEXT.ps1`.
- Se construyeron y validaron dos scripts nuevos para operar el control de
  licencia en producción: `Configure-AccesoRemoto.ps1` (server-side, abre
  Postgres solo a la subred de Tailscale con un rol angosto) y
  `tools/Set-EstadoInstitucion.ps1` (client-side, corre en la PC de Leandro
  para suspender/reactivar una institución sin que el cliente se entere).
- **Primera validación end-to-end real** del mecanismo de licencia: se
  suspendió la institución desde la PC de Leandro vía Tailscale, y se
  confirmó en el navegador de la VM que la app efectivamente bloquea el
  login con "El servicio está suspendido para esta institución. Contactá al
  proveedor para regularizarlo." Se reactivó y se confirmó que vuelve a la
  normalidad. Este es el primer test de esta arquitectura contra la app
  real, no solo contra la base de datos.
- Se armó la carpeta del paquete offline (#248) con las 5 piezas necesarias
  (node portable, instalador de Postgres, instalador de Tailscale, los
  scripts del instalador, y el código de la app con `node_modules`), 1.13 GB
  total. Queda pendiente probarlo contra la VM realmente virgen (en curso al
  cierre de la sesión, copiando a un pendrive).

## Trabajo del día

### 1. Paso 5 opcional: Tailscale en el orquestador

Se agregaron a `Install-ALNEXT.ps1` los parámetros `-TailscaleInstallerPath`,
`-TailscaleAuthKey` y `-TailscaleHostname` (todos opcionales). Si no se pasa
`-TailscaleInstallerPath`, el paso se omite por completo -- no rompe
instalaciones que no necesiten Tailscale. Si se pasa y el paso falla, aborta
la instalación igual que los otros 4 pasos (mismo criterio de "fail fast").
Corre al final, después de que la app ya está arriba.

Commit: `e1e913c`.

### 2. Configure-AccesoRemoto.ps1 (nuevo)

Server-side, corre una vez por VM instalada (con Postgres y Tailscale ya
arriba). Hace tres cosas:

- Edita `postgresql.conf` (`listen_addresses = '*'`) y agrega una regla a
  `pg_hba.conf` restringida a la subred de Tailscale (`100.64.0.0/10`) con
  password (`scram-sha-256`) -- nadie fuera del tailnet de Leandro puede
  llegar a ese puerto.
- Reinicia el servicio de Postgres para aplicar los cambios.
- Crea un rol nuevo y angosto, `alnext_remote_admin`, con permiso de
  `SELECT`/`UPDATE` únicamente sobre el campo `activo` de la tabla
  `Institucion` -- nada de superusuario ni acceso al resto de las tablas.
  Password generada random, se imprime una sola vez.

**Gap encontrado y NO resuelto todavía**: el script no abre el puerto 5433
en el Firewall de Windows. Hubo que agregarlo a mano durante la prueba de
hoy (`New-NetFirewallRule ... -LocalPort 5433 -RemoteAddress
100.64.0.0/10 -Action Allow`). Queda pendiente incorporar esta regla al
script para que no sea un paso manual en cada instalación real.

Commit: `8dbf6a3`.

### 3. tools/Set-EstadoInstitucion.ps1 (nuevo)

Client-side -- corre en la PC de Leandro, NO se instala en la VM del
cliente. Se conecta por Tailscale (hostname MagicDNS) a la VM de una
institución, usando el rol angosto de arriba, y activa o suspende
`Institucion.activo` con confirmación previa (muestra el estado actual,
pide escribir "si", aplica el cambio, y muestra el estado resultante).

Vive en `tools/` en vez de `installer/` a propósito, para dejar claro que es
una herramienta interna, no parte de lo que se instala en la máquina de un
cliente.

Commit: `504d282`.

### 4. Debugging de Tailscale (bastante largo)

La VM de prueba (`alnext-vm-prueba`) apareció "offline" en Tailscale al
retomar la sesión, pese a que la instalación original (21/09) había
quedado conectada. Se descartaron por orden: Postgres mal configurado (no
-- estaba escuchando en `0.0.0.0` correctamente), Firewall de Windows (no
-- ya se había agregado la regla), conectividad general a internet de la VM
(no -- funcionaba fine), DNS/TCP al dominio de control de Tailscale (no --
resolvía y conectaba bien). El problema real: el cliente de Tailscale en la
VM había perdido la sesión de login con el control plane
(`fetch control key: ... context canceled`), y ni `tailscale login` ni
`tailscale up` lograban revalidarla, incluso después de reiniciar el
servicio.

Se resolvió desinstalando Tailscale de la VM (`Get-Package "Tailscale" |
Uninstall-Package -Force`) y reinstalando limpio con
`Install-Tailscale.ps1` y una auth key nueva. Quedó conectada (confirmado
con `tailscale ping` real, respuesta en 21ms, y ambas máquinas en verde
"Connected" en la consola de admin).

**Hallazgo operativo importante**: la página de Keys de Tailscale muestra
solo el ID de cada auth key (ej. `kQ6aXqJcjt11CNTRL`), no el valor completo
usable (`tskey-auth-...`) -- ese valor completo solo se muestra una vez, en
el momento de generar la key, en un cartel con botón de copiar. Confundir
el ID con la key completa fue la causa de varios intentos fallidos de
reautenticación en sesiones anteriores.

### 5. Validación end-to-end real (ver resumen ejecutivo)

Con todo reconectado, se probó el ciclo completo: `Set-EstadoInstitucion.ps1`
desde la PC de Leandro → suspender → la app en la VM mostró el bloqueo
correcto en el login → reactivar → la app volvió a mostrar el flujo normal
de login (credenciales inválidas, ya no el bloqueo). Primera vez que se
valida este mecanismo contra la aplicación real en vez de solo contra la
base de datos.

### 6. Paquete offline (#248) -- armado, falta probar

Se armó `C:\ALNEXT-paquete-offline\` en la VM de prueba con:

- `node/` -- runtime portable, copiado tal cual (sin nada específico de la
  instalación).
- `tailscale-installer/` -- el `.msi`, tal cual.
- `postgres-installer/` -- `postgresql-18.6-4-windows-x64.exe` (la versión
  que efectivamente se usó en todas las pruebas, de las 3 que había
  descargadas).
- `installer/` -- los 8 scripts `.ps1` del instalador.
- `app/` -- código de la app + `node_modules`, copiado con `robocopy`
  excluyendo explícitamente `.git`, `.next`, `.env`, `.claude`, backups,
  logs, dumps, `tests/`, `docs/`, y el `installer/` duplicado que trae el
  propio checkout del repo. 30.753 archivos copiados.

Total: 1.13 GB. Al cierre de la sesión se estaba copiando a un pendrive
físico (USB passthrough de VirtualBox) para transferirlo a la VM
verdaderamente virgen (snapshot de instalación limpia de Windows) y probar
`Install-ALNEXT.ps1` de punta a punta sin conexión a internet en el
destino -- la prueba de fuego real del empaquetado offline.

## Commits del día

e1e913c feat(installer): sumar Paso 5 opcional Tailscale al orquestador
8dbf6a3 feat(installer): Configure-AccesoRemoto.ps1 -- acceso remoto restringido a subred Tailscale + rol angosto
504d282 feat(tools): Set-EstadoInstitucion.ps1 -- herramienta interna para activar/suspender institucion via Tailscale


(La reinstalación de Tailscale en la VM y el reseteo de la password de
`postgres` fueron operaciones directas sobre la VM, sin cambios en el
repo.)

## Pendiente

- Terminar de copiar el paquete offline al pendrive y probarlo contra la VM
  virgen, sin internet, de punta a punta.
- Agregar la regla de Firewall (puerto 5433, subred Tailscale) dentro de
  `Configure-AccesoRemoto.ps1`, para que no sea un paso manual.
- Decidir si `Configure-AccesoRemoto.ps1` se suma como Paso 6 del
  orquestador (opcional, como Tailscale) o se deja como paso manual aparte
  -- no se resolvió hoy, quedó corriendo standalone.
- Precio del piloto y acuerdo escrito con el cliente (consultar abogado) --
  pendiente de negocio, no técnico.

## Notas operativas

- **Booleans de PowerShell y comandos externos**: pasar `$false`/`$true` (o
  incluso el texto literal `"False"`) como argumento a un `powershell.exe`
  lanzado como proceso externo (`powershell -File ...`) lo corrompe a
  string vacío, rompiendo la conversión a `[bool]` en el parámetro de
  destino. Solución: invocar el script directamente con el operador `&` en
  la misma sesión (no como proceso externo nuevo), donde el binding de
  parámetros es nativo de PowerShell y no pasa por conversión de argv de
  comando nativo.
- **Windows Firewall bloquea por default**: aunque Postgres esté
  correctamente configurado y escuchando en todas las interfaces, Windows
  Firewall bloquea el puerto igual si no hay una regla explícita --
  confirmado que Postgres/`pg_hba.conf` estar bien configurados no alcanza
  por sí solo.
- **Tailscale Keys page**: solo muestra el ID de la key, nunca el valor
  completo usable, salvo en el momento de creación.
- **Passwords compartidas en el chat**: dos veces más se compartieron
  passwords/keys directamente en la conversación (la de `postgres` reseteada
  y una auth key vieja). Se recomendó guardarlas en un gestor de
  contraseñas en vez de pasarlas por acá -- práctica a reforzar en
  próximas sesiones.