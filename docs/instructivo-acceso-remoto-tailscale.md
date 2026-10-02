# Instructivo: habilitar y validar acceso remoto (Tailscale + control de licencia) en cada instalación nueva de ALNEXT

Este documento es para Leandro — es el checklist a seguir **cada vez** que se instala ALNEXT en una institución nueva, después de que la instalación base (`Install-ALNEXT.ps1`) ya terminó OK y el login funciona. No es parte del instalador que se entrega a la institución: esto lo corrés vos, para quedar con la capacidad de suspender/reactivar esa instalación remotamente (control de licencia, ver tarea #204).

Validado de punta a punta el 02/10/2026 sobre una instalación de prueba.

## 0. Prerrequisito de una sola vez en tu propia PC (ya hecho, no repetir salvo que cambies de PC)

- Tailscale instalado y unido a tu tailnet.
- Cliente de PostgreSQL (`psql.exe`) instalado y en el PATH. Si no lo tenés: instalar PostgreSQL completo (el instalador no deja destildar componentes individuales a veces — no importa, con que quede el "Command Line Tools" alcanza, aunque instale también un servidor que no vas a usar) y agregar la carpeta `bin` al PATH:
  ```powershell
  [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\18\bin", "User")
  ```
  (cerrar y volver a abrir la consola para que tome efecto; ajustar el número de versión si corresponde).

## 1. Por cada institución nueva — en la PC/VM donde se instaló ALNEXT

Requiere que esa máquina tenga internet en este momento (aunque la instalación de ALNEXT en sí haya sido offline).

### 1.1 Generar un authkey de Tailscale para esa máquina

Desde tu propia PC, entrá a `https://login.tailscale.com/admin/settings/keys` y generá un authkey nuevo. Recomendado: marcarlo de un solo uso o con expiración corta, y etiquetarlo con el nombre de la institución para identificarlo después.

### 1.2 Instalar y unir Tailscale en la máquina del cliente

En la máquina recién instalada, en una consola de PowerShell:

```powershell
cd C:\ALNEXT-paquete-offline\installer   # o la ruta donde haya quedado el paquete
Set-ExecutionPolicy Bypass -Scope Process -Force

.\Install-Tailscale.ps1 `
  -TailscaleInstallerPath "C:\ALNEXT-paquete-offline\tailscale-installer\tailscale-setup-amd64.msi" `
  -AuthKey "tskey-auth-..." `
  -Hostname "alnext-<nombre-institucion-sin-espacios>"
```

Va a pedir UAC (aceptar) y al final mostrar un JSON. Confirmar `"conectado":true` y anotar el `hostname` y las `tailscaleIPs`.

**Si aparece una ventana de bienvenida de Tailscale** (la primera vez que se instala en esa máquina), cerrarla sin problema — no afecta el resultado.

### 1.3 Abrir el acceso remoto en Postgres y crear el rol angosto

En la misma máquina:

```powershell
.\Configure-AccesoRemoto.ps1 -SuperPassword "<la-misma-contraseña-de-superusuario-postgres-usada-en-la-instalación>"
```

Al final te va a mostrar, **una sola vez**, la contraseña generada para el rol `alnext_remote_admin`. Copiarla inmediatamente y guardarla en un lugar seguro (gestor de contraseñas), junto con el hostname de Tailscale de esa institución. No se puede volver a recuperar — si se pierde, hay que volver a correr el script (es idempotente, genera/resetea el rol).

**Registro recomendado a mantener** (fuera de este repo, en tu gestor de contraseñas o planilla privada):

| Institución | Hostname Tailscale | Fecha instalación | Password alnext_remote_admin |
|---|---|---|---|

## 2. Validar de punta a punta (hacer esto siempre, no asumir que "ya debería andar")

Desde tu propia PC:

### 2.1 Probar suspensión

```powershell
cd C:\ALNEXT-admin   # o donde tengas guardado Set-EstadoInstitucion.ps1
.\Set-EstadoInstitucion.ps1 -TailscaleHost "alnext-<nombre-institucion>" -RemoteAdminPassword "<password-guardada>" -Activo:$false
```

Confirmar con `si`. Tiene que mostrar el estado antes (`activo: t`) y después (`activo: f`) del cambio, y terminar con "Listo: institucion SUSPENDIDA."

### 2.2 Confirmar que la app realmente bloquea el acceso

En la máquina de la institución (o remotamente si hay forma de ver la pantalla), recargar la pantalla de login de ALNEXT. Tiene que aparecer: *"El servicio está suspendido para esta institución. Contactá al proveedor para regularizarlo."* Si no aparece ese mensaje, **no dar la instalación por validada** — algo falló en el enforcement y hay que investigar antes de confiar en el control de licencia para esa instalación.

### 2.3 Reactivar

```powershell
.\Set-EstadoInstitucion.ps1 -TailscaleHost "alnext-<nombre-institucion>" -RemoteAdminPassword "<password-guardada>" -Activo:$true
```

Confirmar con `si`, y volver a verificar que el login funciona normalmente de nuevo.

## 3. Checklist resumido para copiar/pegar en cada instalación

- [ ] `Install-ALNEXT.ps1` corrió OK (4/4 pasos) y el login funciona.
- [ ] Authkey de Tailscale generado para esta institución.
- [ ] `Install-Tailscale.ps1` corrido, `conectado: true` confirmado, hostname anotado.
- [ ] `Configure-AccesoRemoto.ps1` corrido, password de `alnext_remote_admin` guardada en el gestor de contraseñas.
- [ ] `Set-EstadoInstitucion.ps1 -Activo:$false` probado — la app mostró el mensaje de suspensión.
- [ ] `Set-EstadoInstitucion.ps1 -Activo:$true` probado — la app volvió a funcionar normalmente.
- [ ] Datos de esta institución (hostname, password) registrados en el lugar seguro correspondiente.

Si falta cualquiera de estos pasos, la instalación de esa institución **no tiene control de licencia remoto operativo**, aunque la app funcione perfecto para el usuario final.