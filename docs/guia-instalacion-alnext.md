# Guía de instalación de ALNEXT

Procedimiento completo para instalar ALNEXT en la máquina de una institución nueva, offline, y dejarla con control de licencia remoto operativo. Consolida lo validado de punta a punta el 25/09/2026 (instalación offline) y el 02/10/2026 (acceso remoto vía Tailscale).

Son dos partes independientes pero secuenciales: **Parte A** instala ALNEXT en la máquina del cliente (no requiere internet). **Parte B** te da a vos (Leandro) la capacidad de suspender/reactivar esa instalación remotamente (requiere internet en la máquina del cliente, en ese momento puntual).

---

## Parte A — Instalación offline de ALNEXT

### A.1 Prerrequisitos del paquete

El paquete (`ALNEXT-paquete-offline-vX.zip`) debe contener, en su raíz:

- `app/` — código de la aplicación Next.js
- `installer/` — scripts PowerShell (`Install-ALNEXT.ps1`, `Common.ps1`, `Preflight.ps1`, `Install-Postgres.ps1`, `Install-Database.ps1`, `Install-AppService.ps1`, `Install-Tailscale.ps1`, `Configure-AccesoRemoto.ps1`)
- `node/` — Node.js portátil (build completo, no solo el `.exe`)
- `postgres-installer/` — instalador real de PostgreSQL (`.exe`); **no** el runtime ya instalado
- `tailscale-installer/` — el `.msi` de Tailscale (necesario para la Parte B)
- `check.sql` (opcional, script de verificación)

No incluir una carpeta `pgsql` con un runtime ya instalado — `Install-Postgres.ps1` instala Postgres limpio en el destino.

### A.2 Verificar integridad del paquete

Antes de tocar nada, en la máquina destino:

```powershell
Get-FileHash "C:\Users\<usuario>\Desktop\ALNEXT-paquete-offline-vX.zip" -Algorithm SHA256
```

Comparar contra el hash de referencia que te llevás vos al transferir el paquete (ver nota al final sobre transferencia por USB). **No continuar si no coincide.**

### A.3 Descomprimir

```powershell
mkdir C:\ALNEXT-paquete-offline -Force
tar -xzf "C:\Users\<usuario>\Desktop\ALNEXT-paquete-offline-vX.zip" -C C:\ALNEXT-paquete-offline

Get-ChildItem C:\ALNEXT-paquete-offline
```

Confirmar que aparecen `app`, `installer`, `node`, `postgres-installer`, `tailscale-installer`.

### A.4 Mover Node.js portátil a la ruta fija requerida

`Add-NodePortableAlPath` (en `installer/Common.ps1`) tiene como default hardcodeado `C:\ALNEXT\node`, sin parámetro para cambiarlo. **Este paso no es opcional** — sin él, el Paso 4/4 del instalador falla porque `npx`/`node` no están en el PATH.

```powershell
mkdir C:\ALNEXT -Force
robocopy C:\ALNEXT-paquete-offline\node C:\ALNEXT\node /E

Test-Path C:\ALNEXT\node\node.exe   # debe dar True
Test-Path C:\ALNEXT\node\npx.cmd    # debe dar True
```

### A.5 Habilitar ejecución de scripts (solo para esta sesión de consola)

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
```

Esto se resetea en cada consola nueva — si abrís otra para seguir, volvé a correrlo.

### A.6 (Opcional) Confirmar que la máquina está offline, si se quiere validar ese escenario

```powershell
Test-NetConnection 8.8.8.8 -InformationLevel Quiet   # debe dar False
```

### A.7 Verificar nombre exacto del instalador de Postgres

```powershell
Get-ChildItem C:\ALNEXT-paquete-offline\postgres-installer
```

El nombre del `.exe` puede variar según la versión empaquetada — usar el nombre real en el paso siguiente.

### A.8 Correr el orquestador completo

Requiere consola elevada (Administrador); el script auto-eleva vía UAC si hace falta.

```powershell
cd C:\ALNEXT-paquete-offline\installer

.\Install-ALNEXT.ps1 `
  -PgInstallerPath "C:\ALNEXT-paquete-offline\postgres-installer\<nombre-real-del-exe>" `
  -SuperPassword "<contraseña-super-postgres>" `
  -InstitucionNombre "<nombre-institución>" `
  -InstitucionCuit "<cuit>" `
  -InstitucionEmail "<email-institución>" `
  -AdminNombre "<nombre-admin>" `
  -AdminEmail "<email-admin>" `
  -AdminPassword "<password-admin>" `
  -AppDir "C:\ALNEXT-paquete-offline\app"
```

Parámetros mandatorios: `-PgInstallerPath`, `-SuperPassword`, `-InstitucionNombre`, `-InstitucionCuit`, `-InstitucionEmail`, `-AdminNombre`, `-AdminEmail`, `-AdminPassword`.

Parámetros opcionales relevantes: `-PgPort` (default 5433), `-Prefix` (default `C:\ALNEXT\pgsql`), `-AppPort` (default 3000), `-AppDir` (default `C:\ALNEXT\app` — pasar explícito si el paquete se extrajo en otra ruta).

El orquestador corre 4 pasos en secuencia:

1. **Preflight** — verifica elevación, puerto libre, instalaciones previas.
2. **Instalación de Postgres** — instala el motor en `-Prefix`.
3. **Base de datos y seed** — crea rol `alnext_app`, base de datos, corre migraciones de Prisma, genera `.env` y `config/institucion.json`, siembra institución + admin.
4. **Arranque persistente de la app** — corre `next build`, registra una Tarea Programada (`ALNEXT-App`, dispara al iniciar Windows, corre como SYSTEM), la inicia, y espera a que responda en `http://127.0.0.1:<AppPort>`.

Resultado esperado al final:
```json
{"preflightOk":true,"postgresOk":true,"databaseOk":true,"appServiceOk":true,"exitCode":0}
```

### A.9 Si hay que reintentar un paso fallido

Si el Paso 3 o 4 falla y hay que volver a correr `Install-ALNEXT.ps1`:

- Agregar `-AllowExistingInstallation` (permite reusar Postgres, el rol y la base si ya existen).
- Si el rol de la app ya fue creado en un intento anterior, agregar `-AppRolePassword "<la-misma-contraseña-que-se-generó-la-primera-vez>"` — el script no puede reconstruir el `DATABASE_URL` sin ella. Esa contraseña aparece en el JSON de salida del primer intento (`appRolePassword`), **guardarla apenas se genera**.

### A.10 Verificar visualmente

```
http://127.0.0.1:3000/public/login
```

La ruta raíz `/` sirve la página default de Next.js sin customizar — **no** es el login, no confundir con un error.

Iniciar sesión con el email/password de `-AdminEmail`/`-AdminPassword`. Si carga el Dashboard, la instalación de ALNEXT está confirmada. Con esto termina la Parte A.

---

## Parte B — Acceso remoto y control de licencia (Tailscale)

Esto es una herramienta interna tuya, no se distribuye a la institución. Te da la capacidad de suspender/reactivar el acceso de esa instalación de forma remota (por ejemplo, por falta de pago), sin que el cliente tenga que hacer nada de su lado.

Requiere que la máquina de la institución tenga **internet en este momento** (aunque la instalación de ALNEXT en sí haya sido offline).

### B.0 Prerrequisito de una sola vez, en tu propia PC

No repetir salvo que cambies de PC:

- Tailscale instalado y unido a tu tailnet.
- Cliente de PostgreSQL (`psql.exe`) instalado y en el PATH. Si no lo tenés: instalar PostgreSQL (si el instalador no deja destildar componentes individuales, no importa — dejar todo tildado) y agregar la carpeta `bin` al PATH **a nivel de usuario** (para que persista entre consolas):
  ```powershell
  [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\18\bin", "User")
  ```
  (cerrar y volver a abrir la consola para que tome efecto; ajustar el número de versión si corresponde)

### B.1 Generar un authkey de Tailscale para la institución

Desde tu propia PC, entrá a `https://login.tailscale.com/admin/settings/keys` y generá un authkey nuevo. Recomendado: marcarlo de un solo uso o con expiración corta, etiquetado con el nombre de la institución.

### B.2 Instalar y unir Tailscale en la máquina de la institución

```powershell
cd C:\ALNEXT-paquete-offline\installer
Set-ExecutionPolicy Bypass -Scope Process -Force

.\Install-Tailscale.ps1 `
  -TailscaleInstallerPath "C:\ALNEXT-paquete-offline\tailscale-installer\tailscale-setup-amd64.msi" `
  -AuthKey "tskey-auth-..." `
  -Hostname "alnext-<nombre-institucion-sin-espacios>"
```

Pide UAC (aceptar). Confirmar en el JSON de salida `"conectado":true`, y anotar `hostname` y `tailscaleIPs`. Si aparece una ventana de bienvenida de Tailscale, cerrarla sin problema.

### B.3 Abrir el acceso remoto en Postgres y crear el rol angosto

```powershell
.\Configure-AccesoRemoto.ps1 -SuperPassword "<la-misma-contraseña-de-superusuario-postgres-usada-en-A.8>"
```

Abre `listen_addresses`, agrega una regla en `pg_hba.conf` restringida a la subred de Tailscale (`100.64.0.0/10`), reinicia el servicio, y crea el rol `alnext_remote_admin` — con permisos acotados únicamente a leer y actualizar el flag de activo/suspendido, nada de superusuario ni acceso a otras tablas.

Al final muestra, **una sola vez**, la contraseña generada para ese rol. Copiarla inmediatamente y guardarla en el gestor de contraseñas junto con el hostname de Tailscale de esa institución — no se puede recuperar después (si se pierde, el script es idempotente y se puede volver a correr para regenerarla).

**Registro recomendado a mantener** (fuera del repo, en tu gestor de contraseñas o planilla privada):

| Institución | Hostname Tailscale | Fecha instalación | Password del rol remoto |
|---|---|---|---|

### B.4 Validar de punta a punta — no asumir que "ya debería andar"

Desde tu propia PC, con `Set-EstadoInstitucion.ps1` (herramienta interna, guardala en una carpeta tuya, ej. `C:\ALNEXT-admin`):

**Suspender:**
```powershell
.\Set-EstadoInstitucion.ps1 -TailscaleHost "alnext-<nombre-institucion>" -RemoteAdminPassword "<password-guardada>" -Activo:$false
```
Confirmar con `si`. Debe mostrar el estado antes y después del cambio, y terminar con "Listo: institucion SUSPENDIDA."

**Confirmar que la app realmente bloquea el acceso**: recargar el login de ALNEXT en la máquina de la institución. Tiene que aparecer: *"El servicio está suspendido para esta institución. Contactá al proveedor para regularizarlo."* Si no aparece ese mensaje exacto, **no dar la instalación por validada** — investigar antes de confiar en el control de licencia para esa institución.

**Reactivar:**
```powershell
.\Set-EstadoInstitucion.ps1 -TailscaleHost "alnext-<nombre-institucion>" -RemoteAdminPassword "<password-guardada>" -Activo:$true
```
Confirmar con `si`, y volver a verificar que el login funciona con normalidad.

---

## Checklist resumido — copiar/pegar en cada instalación nueva

**Parte A:**
- [ ] Hash del paquete verificado antes de descomprimir.
- [ ] `node/` movido a `C:\ALNEXT\node`, confirmado `node.exe` y `npx.cmd`.
- [ ] `Install-ALNEXT.ps1` corrió OK — `{"preflightOk":true,"postgresOk":true,"databaseOk":true,"appServiceOk":true,"exitCode":0}`.
- [ ] Login verificado en `http://127.0.0.1:3000/public/login` con las credenciales de `-AdminEmail`/`-AdminPassword`.

**Parte B:**
- [ ] Authkey de Tailscale generado para esta institución.
- [ ] `Install-Tailscale.ps1` corrido, `conectado: true` confirmado, hostname anotado.
- [ ] `Configure-AccesoRemoto.ps1` corrido, password del rol remoto guardada en el gestor de contraseñas.
- [ ] `Set-EstadoInstitucion.ps1 -Activo:$false` probado — la app mostró el mensaje de suspensión.
- [ ] `Set-EstadoInstitucion.ps1 -Activo:$true` probado — la app volvió a funcionar con normalidad.
- [ ] Datos de esta institución (hostname, password) registrados en el lugar seguro correspondiente.

Si falta cualquier ítem de la Parte B, esa instalación **no tiene control de licencia remoto operativo**, aunque la app funcione perfecto para el usuario final.

---

## Nota: transferencia del paquete por USB desde una VM de VirtualBox

Si el paquete se arma en una VM de VirtualBox y se transfiere a la máquina destino por pendrive, se detectó que `Copy-Item` y `robocopy` desde dentro del guest pueden producir copias corruptas (hash distinto al original) pese a reportar éxito total y el tamaño correcto — probablemente por la capa de emulación USB de VirtualBox, no por el pendrive en sí. La copia manual por el Explorador de Windows (arrastrar/soltar) funcionó de forma confiable. Verificar siempre con `Get-FileHash -Algorithm SHA256` en cada salto (origen, pendrive, destino) antes de confiar en una transferencia grande.