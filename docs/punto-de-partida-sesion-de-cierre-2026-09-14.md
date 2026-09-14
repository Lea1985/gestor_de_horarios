# Punto de partida — cierre de sesión 14/09/2026

## Contexto

Continuación de la sesión del 13/09/2026, que había dejado preparado el entorno de prueba: VM `ALNEXT-test` en VirtualBox (Windows 11, EFI/TPM2/Secure Boot), con snapshot limpio "Instantánea 1". El objetivo de hoy era el pendiente explícito de esa sesión: simular en la VM un "conflicto de puerto" con Postgres y correr el smoke test real del instalador silencioso oficial de PostgreSQL, para empezar a resolver los `[NO DETERMINADO]` más importantes de `docs/auditoria-instalador-alnext.md`.

## Resuelto al inicio de la sesión

- **`git push` pendiente desde el 13/09** (fallaba con HTTP 408 por contención de ancho de banda con la descarga simultánea del ISO de Windows): se resolvió solo, sin cambios adicionales, una vez liberado el ancho de banda. `origin/develop` quedó en `120a7d9`.

## Trabajo de hoy en la VM

### 1. Recuperación de la VM (dos problemas menores, resueltos)

- Un reinicio accidental hizo que la VM booteara desde el ISO de instalación en vez del disco — se evitó dañar el sistema no aceptando ninguna opción del diálogo de "actualización/instalación limpia" y removiendo el ISO de la unidad óptica.
- Al remover el ISO y reiniciar apareció una falla de UEFI Boot Manager (probablemente por el apagado forzado previo). Se resolvió restaurando la snapshot "Instantánea 1" (que resultó ser un estado "Guardado", no apagado en frío — reanudar desde ahí no vuelve a pasar por el firmware UEFI, así que fue seguro).

### 2. Postgres 17 instalado para simular "otra versión ya instalada"

Se descargó e instaló PostgreSQL 17.11 con opciones por defecto (puerto 5432, servicio `postgresql-x64-17`). Confirmado con `Get-NetTCPConnection -LocalPort 5432`. Se tomó la snapshot **"Conflicto puerto 5432 - Postgres17"**.

### 3. Smoke test #1 — instalación silenciosa de Postgres 18 conviviendo con Postgres 17 ✅ ÉXITO

Comando usado (modo desatendido, con parámetros propios de ALNEXT):

```
.\postgresql-18.6-3-windows-x64.exe --mode unattended --unattendedmodeui none --superpassword "admin123" --servicename "postgresql-alnext" --serverport 5433 --prefix "C:\ALNEXT\pgsql" --datadir "C:\ALNEXT\pgsql\data"
```

**Resultado confirmado con evidencia real:**
- El instalador se relanza a sí mismo (posible UAC) y corre en segundo plano — el prompt de PowerShell vuelve antes de que termine. Cualquier script instalador de ALNEXT necesita esperar activamente (`Wait-Process` o equivalente), no asumir que terminó cuando el comando "vuelve".
- Servicio `postgresql-alnext` creado y corriendo en paralelo con `postgresql-x64-17`, sin conflicto.
- Puerto 5433 escuchando (`Get-NetTCPConnection`).
- Conexión real confirmada: `psql -p 5433` devolvió `PostgreSQL 18.6 on x86_64-windows`.
- Log del instalador terminó limpio: `Instalación completada` / `Exiting with code 0`.

**Esto responde el `[NO DETERMINADO]` más importante de la auditoría**: el instalador oficial de PostgreSQL, en modo silencioso con `--serverport`/`--prefix`/`--datadir`/`--servicename` propios, puede convivir de forma aislada con otra versión de Postgres ya instalada en la misma máquina, sin tocarla.

Snapshot tomada: **"Smoke test OK - Postgres18 coexiste con Postgres17 (5433 vs 5432)"**.

### 4. Intento de smoke test #2 — "puerto ocupado" ⚠️ CONTAMINADO, pero con hallazgo real

Se intentó simular "el puerto 5433 ya está ocupado" instalando una segunda vez Postgres 18 (mismo binario) con otro `--servicename`/`--prefix` (`postgresql-alnext-3` / `C:\ALNEXT3\pgsql`) apuntando al mismo puerto 5433 ya usado por la instalación anterior.

**Resultado inesperado y metodológicamente importante:** el instalador de EDB registra las instalaciones por **versión mayor** en el registro de Windows (`HKLM\SOFTWARE\PostgreSQL\Installations\postgresql-x64-18`), no por nombre de servicio ni por prefix. Al detectar que ya había una instalación de la versión 18 registrada, el instalador **ignoró nuestros parámetros nuevos y reutilizó/reparó la instalación existente** en `C:\ALNEXT\pgsql` en vez de crear una instancia aislada en `C:\ALNEXT3\pgsql`. Nunca se creó el servicio `postgresql-alnext-3` ni el directorio `C:\ALNEXT3`.

Se repitió el mismo intento dos veces:
- Con `--debugtrace`: el instalador **crasheó**, dejando un volcado de error nativo (`<errorDump>`, sin traza legible) en vez de un log normal.
- Sin `--debugtrace` (mismo escenario): esta vez **completó "silenciosamente"** reutilizando la instalación existente, sin avisar que había ignorado los parámetros pedidos.

**Conclusión:** esto no fue el test que buscábamos ("puerto ocupado por cualquier otra cosa"), sino uno distinto y también valioso: **qué pasa si el instalador de Postgres 18 se corre dos veces en la misma máquina** (reinstalación accidental / reintento tras una instalación fallida). Respuesta parcial: no es seguro ni predecible — a veces reutiliza en silencio ignorando parámetros, a veces crashea. Esto es relevante para la sección "Actualizaciones" de la auditoría, y sugiere que el instalador de ALNEXT debería **verificar si ya existe una instalación de Postgres 18 antes de invocar el instalador**, en vez de asumir que siempre es una instalación nueva.

## Pendiente para la próxima sesión

**Crítico — repetir el test de "puerto ocupado" de forma limpia:**
1. Restaurar la snapshot **"Conflicto puerto 5432 - Postgres17"** (estado sin Postgres 18 instalado, para evitar el problema de reutilización de instalación descrito arriba).
2. Ocupar el puerto 5433 con un proceso cualquiera que **no** sea Postgres (ej. un `TcpListener` de PowerShell en background).
3. Recién ahí correr la instalación real de Postgres 18 (primera vez, `C:\ALNEXT\pgsql`, puerto 5433) y ver si el instalador falla de forma clara, silenciosa, o crashea cuando el puerto está tomado por algo ajeno a Postgres.

**Opcional, menor prioridad:** probar la instalación silenciosa desde una cuenta de Windows **sin** permisos de administrador (la documentación de ALNEXT asume admin solo para el paso inicial, pero nunca se confirmó qué pasa si falta ese permiso).

**No urgente / en paralelo, no depende de la VM:** Plan Paso 1 (fijar versión exacta de Node — `engines`/`.nvmrc`) y Paso 2 (arreglar el puerto 5433 hardcodeado en `package.json`'s `test:run`) del §G de la auditoría — ambos de bajo esfuerzo y riesgo.

## Nota técnica: estado de la VM

- VM: `ALNEXT-test`, VirtualBox 7.2.16, Windows 11 25H2 x64 es-ES, 4096MB RAM, 2 CPU, 80GB VDI, EFI/TPM2/Secure Boot activos.
- Snapshots disponibles (de más antigua a más nueva):
  1. **Instantánea 1** — Windows 11 recién instalado, limpio.
  2. **Conflicto puerto 5432 - Postgres17** — Postgres 17.11 instalado con defaults (puerto 5432), sin Postgres 18. Punto de partida recomendado para el próximo test.
  3. **Smoke test OK - Postgres18 coexiste con Postgres17 (5433 vs 5432)** — ambos Postgres corriendo, validado end-to-end. Estado actual de la VM al cierre de hoy (con los intentos fallidos de "reinstalación" encima, sin snapshotear).
- Instaladores ya descargados dentro de la VM (`C:\Users\vboxuser\Downloads`): `postgresql-17.11-3-windows-x64.exe`, `postgresql-18.6-3-windows-x64.exe` — reusables sin volver a descargar.