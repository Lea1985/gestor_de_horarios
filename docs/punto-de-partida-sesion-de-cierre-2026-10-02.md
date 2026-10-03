# Punto de partida — cierre de sesión 02/10/2026

## 1. Resumen del día

Objetivo inicial: probar el único punto que había quedado sin validar después de la instalación offline exitosa del 25/09 — el control remoto de licencia (`institucion.activo`) vía Tailscale.

**Resultado: éxito, validado de punta a punta.**

Sobre el final de la sesión surgió un segundo objetivo no planeado: preparar un entorno limpio para grabar un video de demostración funcional de ALNEXT (para landing page / uso interno como prueba de punta a punta), lo que llevó a armar una base de datos de demo separada y a descubrir/corregir un par de detalles del entorno de desarrollo en el camino.

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

### 1.6 Diagnóstico de lentitud en la VM — recursos, no la app

Surgió la idea de grabar un video de demostración funcional usando la VM, pero se notó lentitud. Diagnóstico antes de asumir nada:

- La VM `ALNEXT-test` tiene asignados **4096 MB RAM / 2 CPUs** — configuración modesta para correr Windows + Postgres + Node simultáneamente.
- En la PC de desarrollo (WSL, nativo), el mismo build de producción (`npm run build && npm start`) compiló en 6.7-8.4s y quedó listo (`Ready`) en ~1.5s.
- **Conclusión**: la lentitud era de recursos de la VM, no un problema inherente de ALNEXT. Se decidió grabar el video desde la PC de desarrollo en su lugar.

### 1.7 Base de datos de demo separada, sin tocar el entorno de desarrollo

Para grabar sin exponer los datos de prueba acumulados en `gestor_horarios` (la base de desarrollo, usada en todas las auditorías UX de sesiones anteriores), se armó una base nueva y aislada en el mismo Postgres local:

```bash
psql "postgresql://admin:admin123@localhost:5433/postgres" -c "CREATE DATABASE alnext_demo OWNER admin;"
DATABASE_URL="postgresql://admin:admin123@localhost:5433/alnext_demo?schema=public" npx prisma migrate deploy
# + config/institucion-demo.json con institución "Escuela Ejemplo" y admin admin@alnext.com
DATABASE_URL="postgresql://admin:admin123@localhost:5433/alnext_demo?schema=public" node --loader ts-node/esm scripts/seed-instalacion.ts ./config/institucion-demo.json
```

`gestor_horarios` no se tocó en ningún momento — las bases de Postgres están completamente aisladas entre sí.

**Hallazgo importante — `DEV_TENANT_DOMAIN`**: el `.env` de desarrollo tiene `DEV_TENANT_DOMAIN="escuela12.edu.ar"`, una variable que fuerza qué institución usar como tenant en desarrollo (necesaria porque `gestor_horarios` tiene 3 instituciones mezcladas para pruebas de aislamiento multi-tenant). Al arrancar la app apuntando a `alnext_demo` sin pisar esa variable, el login fallaba con "Tenant no encontrado" porque buscaba un dominio que no existe en la base nueva. Solución: vaciar el campo `dominio` de la institución demo y arrancar con `DEV_TENANT_DOMAIN=""` (cadena vacía), activando el mismo fallback de "única institución" que usa una instalación real de una sola escuela (fix de la tarea #254).

```bash
psql "postgresql://admin:admin123@localhost:5433/alnext_demo" -c "UPDATE \"Institucion\" SET dominio = '' WHERE id = 1;"
DATABASE_URL="postgresql://admin:admin123@localhost:5433/alnext_demo?schema=public" DEV_TENANT_DOMAIN="" npm start
```

Nota al margen: `psql` no acepta el parámetro `?schema=public` en la URI (es específico de Prisma) — para comandos `psql` sueltos hay que sacarlo de la cadena de conexión.

Con esto, login con `admin@alnext.com` / `DemoAlnext2026!` funcionando sobre una base 100% limpia.

### 1.8 Hallazgo de UI: mapa de calor semanal oculto sin datos

Durante la revisión del Dashboard limpio se notó que no aparecía el "mapa de calor" al lado de "Tendencia de cobertura". Investigado en el código (`features/dashboard/components/MapaCalorSemanal.tsx`, línea 211: `if (timelineInstitucional.length === 0) return null`) — **comportamiento esperado, no un bug**: el componente se oculta completo cuando no hay clases programadas en el rango visible. Aparece automáticamente en cuanto hay un período operativo activo con clases generadas.

### 1.9 Guión de video — versión larga (prueba funcional) vs. versión corta (landing)

Se armaron dos guiones:

- **Versión larga (9 escenas)**, pensada como prueba funcional de punta a punta y como demo 1 a 1 con un cliente interesado: login → Dashboard vacío → estructura base (turno, curso+materia, comisión, agente) → asignación + distribución → período operativo (activar, genera clases) → codigario + ítem → agente reemplazante + incidencia → Dashboard con datos → reporte de horas realmente trabajadas (módulos computables).
- **Versión corta (30-50s)**, recomendada para el landing page en lugar de la larga: evaluación fue que la versión de 9 escenas es demasiado detallada para un video de marketing (la gente no mira 2-3 minutos de carga de datos de configuración en un landing). La versión corta salta directo al "momento wow" (registrar una ausencia → reemplazo asignado en segundos → Dashboard se recalcula solo) y cierra con el reporte de horas reales y un CTA.

Se decidió, para esta sesión, cargar manualmente toda la estructura base sin grabar, y reservar la grabación solo para el tramo final: carga de la incidencia + revisión del reporte — sirviendo así como prueba funcional de punta a punta además de contenido para edición posterior.

Al cierre de la sesión, la estructura previa (turno, curso, comisión, agente, asignación, distribución) ya estaba cargada y el período operativo activado — mensaje confirmado en pantalla: *"Período activado. Se generaron 10 clases para 2 distribuciónes vigentes."* Quedó pendiente, dentro de la misma sesión de grabación: cargar el codigario, el agente reemplazante, generar la incidencia, y revisar el reporte de horas — grabando desde ese punto en adelante.

## 2. Estado de tareas cerradas hoy

- #267 — Script remoto: cambiar `institucion.activo` vía Tailscale sin que el cliente lo note → **confirmada funcionando end-to-end** (ya figuraba completada de una sesión anterior; hoy se validó contra una instalación real hecha con el instalador offline, que era lo que faltaba).

## 3. Pendientes para la próxima sesión

- Terminar de cargar el codigario + ítem, el agente reemplazante, generar la incidencia, y revisar el reporte de módulos computables en `alnext_demo` — grabando esa parte para el video.
- Decidir y editar la versión final del video para el landing (corta) a partir de lo grabado, o regrabar directo la versión corta una vez validado el flujo completo.
- Recordar: al terminar de usar `alnext_demo`, volver a levantar la app sin las variables de entorno extra (`DATABASE_URL`/`DEV_TENANT_DOMAIN` por defecto) para volver al entorno de desarrollo normal contra `gestor_horarios`.
- Cargar datos reales de la escuela piloto (Colegio Ceferino) a través del mecanismo de configuración del instalador (tarea #11) — con esto, la instalación de prueba completa (offline + Tailscale + control de licencia) está lista para repetirse en un caso real.
- Al hacer la primera instalación real, seguir `instructivo-acceso-remoto-tailscale.md` y registrar el hostname de Tailscale + la contraseña del rol remoto en el gestor de contraseñas.
- Deuda técnica ya identificada y sin tocar: auditoría de 45 tests desactualizados (#167-173), ítems P0 de seguridad en administración de usuarios (#205, #206, #207, #217), CUIT editable (#247).