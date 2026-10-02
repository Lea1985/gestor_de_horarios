# Punto de partida — cierre de sesión 02/10/2026

## 1. Resumen del día

Objetivo: probar el único punto que había quedado sin validar después de la instalación offline exitosa del 25/09 — el control remoto de licencia (`institucion.activo`) vía Tailscale.

**Resultado: éxito, validado de punta a punta.**

### 1.1 Retomando la VM del 25/09

Se le dio internet a la VM donde habíamos instalado ALNEXT (seguía con todo intacto). Al revisar que la app seguía funcionando, la primera carga en `http://127.0.0.1:3000/public/login` demoró (normal, arranque en frío tras días apagada) pero cargó bien y el login con las credenciales de prueba (`admin@alnext.test` / `AdminTest2026!`) siguió funcionando.

### 1.2 Tres scripts involucrados (ubicados en el repo, `installer/` y `tools/`)

- **`Install-Tailscale.ps1`**: instala Tailscale (msiexec silencioso) y une la máquina a la tailnet vía authkey.
- **`Configure-AccesoRemoto.ps1`**: abre `postgresql.conf` (`listen_addresses = '*'`) y agrega una regla en `pg_hba.conf` restringida a la subred de Tailscale (`100.64.0.0/10`), reinicia el servicio, y crea un rol angosto `alnext_remote_admin` con permisos acotados a `SELECT`/`UPDATE(activo)` sobre `Institucion` únicamente — nada de superusuario ni acceso a otras tablas.
- **`Set-EstadoInstitucion.ps1`** (herramienta interna, NO se distribuye con el instalador): corre desde la PC de Leandro, se conecta por `psql` al hostname Tailscale de la institución, y activa/suspende el flag.

### 1.3 Prerrequisitos de la PC host que no estaban cubiertos

- **`psql.exe`** no estaba instalado en la PC host. Se instaló PostgreSQL 18 completo (el instalador de EDB no dejó destildar componentes individuales esa vez — se seccionó "no importa", dejó todo tildado) y se agregó `C:\Program Files\PostgreSQL\18\bin` al PATH. **Importante**: el `$env:Path` seteado en una sesión de PowerShell no persiste a consolas nuevas — hubo que fijarlo a nivel de usuario con `[Environment]::SetEnvironmentVariable(..., "User")` para no repetirlo cada vez.
- El archivo `Set-EstadoInstitucion.ps1` creado a mano con el Bloc de notas en la PC host quedó en **0 bytes** la primera vez (no se guardó el contenido pegado) — hay que verificar el tamaño del archivo después de guardarlo cuando se crea así.

### 1.4 Ejecución y validación

1. `Install-Tailscale.ps1` en la VM → `{"conectado":true,"hostname":"alnext-prueba-remota","tailscaleIPs":["100.79.84.123",...],"exitCode":0}`.
2. `Configure-AccesoRemoto.ps1 -SuperPassword "TestPg2026!"` en la VM → `{"listenAddressesOk":true,"pgHbaOk":true,"servicioOk":true,"rolOk":true,"remoteAdminPassword":"BSFAY5dahcs2uKkH7tK5GE4z","exitCode":0}`.
3. Desde la PC host: `Set-EstadoInstitucion.ps1 -TailscaleHost "alnext-prueba-remota" -RemoteAdminPassword "BSFAY5dahcs2uKkH7tK5GE4z" -Activo:$false` → conectó remotamente, mostró el estado antes (`activo: t`) y después (`activo: f`) del `UPDATE 1`.
4. **Verificación en la app**: recargando el login en la VM apareció correctamente: *"El servicio está suspendido para esta institución. Contactá al proveedor para regularizarlo."* — confirma que el enforcement de `proxy.ts` (diseñado en la tarea #204) funciona real, no solo a nivel de base de datos.
5. Reactivación (`-Activo:$true`) → `activo: t` de nuevo, login y Dashboard funcionando con normalidad.

### 1.5 Instructivo permanente

Se redactó `instructivo-acceso-remoto-tailscale.md` — el checklist a seguir de acá en adelante **en cada instalación nueva de ALNEXT en una institución**, para no tener que reconstruir el procedimiento de memoria cada vez y para no dar una instalación por "con control de licencia operativo" sin haber probado explícitamente la suspensión y la reactivación. Incluye el prerrequisito de una sola vez en la PC de Leandro (Tailscale + psql), los pasos por institución nueva, y un checklist resumido para copiar/pegar.

## 2. Estado de tareas cerradas hoy

- #267 — Script remoto: cambiar `institucion.activo` vía Tailscale sin que el cliente lo note → **confirmada funcionando end-to-end** (ya figuraba completada de una sesión anterior; hoy se validó contra una instalación real hecha con el instalador offline, que era lo que faltaba).

## 3. Pendientes para la próxima sesión

- Cargar datos reales de la escuela piloto (Colegio Ceferino) a través del mecanismo de configuración del instalador (tarea #11) — con esto, la instalación de prueba completa (offline + Tailscale + control de licencia) está lista para repetirse en un caso real.
- Al hacer la primera instalación real, seguir `instructivo-acceso-remoto-tailscale.md` y registrar el hostname de Tailscale + la contraseña del rol remoto en el gestor de contraseñas.
- Deuda técnica ya identificada y sin tocar: auditoría de 45 tests desactualizados (#167-173), ítems P0 de seguridad en administración de usuarios (#205, #206, #207, #217), CUIT editable (#247).