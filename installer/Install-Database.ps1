# Install-Database.ps1
#
# Paso 5 del instalador único de ALNEXT: a partir de un Postgres ya corriendo
# (paso 4, Install-Postgres.ps1 -- servicio 'postgresql-alnext', superusuario
# 'postgres'), deja la aplicación lista para loguearse:
#
#   1. Rol de Postgres propio de la app (no el superusuario) + base de datos
#      con ese rol como owner -- separación de privilegios básica.
#   2. .env de la app (C:\ALNEXT\app\.env) con el DATABASE_URL real.
#   3. Migraciones de producción (`prisma migrate deploy`), validadas
#      después con `prisma migrate status` -- no se confía solo en el exit
#      code de migrate deploy, mismo criterio que ya usa
#      tests/checkMigraciones.test.ts (sin "pending" ni "drift").
#   4. Seed mínimo (una institución real + un usuario ADMIN), reutilizando
#      scripts/seed-instalacion.ts tal cual existe hoy -- no lo reemplaza ni
#      lo modifica. Explícitamente NO carga los datos reales de Colegio
#      Ceferino (eso es un ítem de backlog aparte, #11).
#
# No requiere elevación de Windows: crear un rol/base es una operación de
# Postgres (TCP a localhost), no del sistema operativo, y ejecutar Node no
# requiere privilegios especiales.
#
# Supuestos temporales de esta iteración (documentados, no resueltos acá):
#   - El código de la app ya está deployado en -AppDir (default
#     C:\ALNEXT\app) -- el empaquetado/copiado real es trabajo de otra sesión.
#   - Node/npm/npx están disponibles en el PATH del sistema -- el Node
#     portable embebido tampoco está resuelto todavía.
#
# Idempotencia: cada verificación consulta el estado real en Postgres
# (pg_roles/pg_database), nunca infiere existencia a partir de un código de
# error de CREATE ROLE/CREATE DATABASE. Si el rol ya existe y no se pasa
# -AppRolePassword, el script NO adivina ni resetea la password -- falla
# explícitamente pidiendo que se pase la misma password original, porque
# sin ella no se puede reconstruir un DATABASE_URL que funcione.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File installer\Install-Database.ps1 `
#       -SuperPassword "laDeInstall-Postgres" `
#       -InstitucionNombre "Escuela Primaria N°12" -InstitucionCuit "30-12345678-9" `
#       -InstitucionEmail "info@escuela12.edu.ar" `
#       -AdminNombre "Secretaría" -AdminEmail "secretaria@escuela12.edu.ar" -AdminPassword "cambiar-esta-clave"
#
# Salida:
#   - Resumen legible por consola (Write-Host).
#   - Un objeto JSON por el pipeline (última línea de salida "real"), mismo
#     patrón que Preflight.ps1 / Install-Postgres.ps1. Si -AppRolePassword no
#     se pasó y el rol se creó en esta corrida, el JSON incluye la password
#     generada (además de mostrarla en el resumen) -- es el único lugar
#     donde queda registrada, no se vuelve a mostrar en corridas futuras.
#   - Exit code:
#       0 = todo aplicado y validado correctamente.
#       1 = parámetros de entrada inválidos (identificador de rol/base no
#           seguro, -AppDir inexistente, prisma/schema.prisma no encontrado
#           dentro de -AppDir, o -AdminPassword de menos de 8 caracteres).
#       2 = no se encontró psql.exe (ni en PATH, ni en el registro de Windows,
#           ni en la convención de instalación de ALNEXT).
#       3 = Postgres no responde en el puerto indicado, o falló la
#           creación/verificación del rol o la base de datos (incluye el
#           caso "el rol ya existe y no se pasó -AppRolePassword").
#       4 = falló la escritura del .env de la app.
#       5 = `prisma migrate deploy` terminó con error.
#       6 = `prisma migrate status` reportó pending/drift after el deploy,
#           o no se pudo interpretar su salida -- no se asume éxito solo
#           por el exit code de migrate deploy.
#       7 = falló la generación de config/institucion.json o la ejecución
#           de scripts/seed-instalacion.ts.
#       8 = fallo inesperado no controlado.

param(
    [int]$PgPort = 5433,
    [Parameter(Mandatory = $true)][string]$SuperPassword,

    [string]$AppRole = "alnext_app",
    [string]$AppRolePassword = "",
    [string]$AppDbName = "alnext",

    [string]$AppDir = "C:\ALNEXT\app",
    [string]$PsqlPath = "",
    [string]$PgVersion = "18",

    [Parameter(Mandatory = $true)][string]$InstitucionNombre,
    [Parameter(Mandatory = $true)][string]$InstitucionCuit,
    [Parameter(Mandatory = $true)][string]$InstitucionEmail,
    [string]$InstitucionDominio = "",
    [string]$InstitucionDomicilio = "",
    [string]$InstitucionTelefono = "",
    [bool]$UsaMaterias = $true,
    [bool]$UsaCursos = $true,
    [int]$ModulosDuracionMinutos = 40,

    [Parameter(Mandatory = $true)][string]$AdminNombre,
    [Parameter(Mandatory = $true)][string]$AdminEmail,
    [Parameter(Mandatory = $true)][string]$AdminPassword
)

$ErrorActionPreference = "Stop"

# --- Helpers ---------------------------------------------------------------

function Test-IdentificadorSeguro([string]$Nombre) {
    # Nombre de rol/base de Postgres: se interpola directo en SQL más abajo
    # (CREATE ROLE/DATABASE, y en los SELECT de verificación) -- se restringe
    # a un identificador simple para no depender de escaping de identificador
    # SQL. No es una defensa genérica, es la validación mínima necesaria
    # porque estos valores vienen de parámetros de línea de comandos, no de
    # datos de usuario final de la app.
    return $Nombre -match '^[A-Za-z_][A-Za-z0-9_]{0,62}$'
}

function Escape-SqlLiteral([string]$Valor) {
    return $Valor -replace "'", "''"
}

function New-PasswordFuerte {
    # Solo alfanumérico -- va directo dentro de un DATABASE_URL (postgresql://user:pass@...)
    # sin URL-encodear, así que se evita deliberadamente cualquier carácter
    # reservado de URL (@ : / ? # etc). Si en cambio se pasa -AppRolePassword
    # a mano, esa restricción corre por cuenta de quien la elige.
    #
    # RNGCryptoServiceProvider en vez de RandomNumberGenerator.Fill(): este
    # último es estático y no existe en .NET Framework 4.x (Windows
    # PowerShell 5.1, el runtime real de este instalador) -- solo desde
    # .NET Core 3.0. RNGCryptoServiceProvider funciona en ambos.
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $bytes = New-Object byte[] 32
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

function Test-PuertoAbierto([string]$HostName, [int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect($HostName, $Port)
        $conectado = $client.Connected
        $client.Close()
        return $conectado
    } catch {
        return $false
    }
}

function Invoke-PsqlSuperuser {
    # Conexión como 'postgres' vía PGPASSWORD (no vía DATABASE_URL) -- evita
    # tener que URL-encodear $SuperPassword si contiene caracteres
    # reservados de URL, que sí importarían si se armara una connection
    # string en vez de parámetros sueltos.
    param([string]$Sql, [switch]$Query)

    $env:PGPASSWORD = $SuperPassword
    try {
        if ($Query) {
            $out = & $PsqlPath -h localhost -p $PgPort -U postgres -d postgres -tAc $Sql 2>&1
        } else {
            $out = & $PsqlPath -h localhost -p $PgPort -U postgres -d postgres -c $Sql 2>&1
        }
        if ($LASTEXITCODE -ne 0) {
            throw "psql falló (exit $LASTEXITCODE) ejecutando: $Sql`n$out"
        }
        if ($Query) {
            return @($out | Where-Object { $_.Trim() -ne "" } | Select-Object -Last 1)
        }
        return $null
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Salir {
    param([int]$Code, [string]$MensajeError = "")

    if ($MensajeError) {
        Write-Error $MensajeError -ErrorAction Continue
    }

    $resultado.exitCode = $Code
    $json = $resultado | ConvertTo-Json -Compress
    $json
    exit $Code
}

# --- Estado acumulado para la salida JSON -----------------------------------

$resultado = [ordered]@{
    appRole                = $AppRole
    appDbName              = $AppDbName
    puertoPostgres          = $PgPort
    rolCreadoEnEstaCorrida  = $false
    dbCreadaEnEstaCorrida   = $false
    appRolePasswordGenerada = $false
    appRolePassword         = $null
    envGenerado             = $false
    migrateDeployOk         = $false
    migrateStatusLimpio     = $false
    institucion             = $InstitucionNombre
    adminEmail              = $AdminEmail
    seedOk                  = $false
    exitCode                = -1
}

try {
    Write-Host ""
    Write-Host "=== Configuración de base de datos y seed inicial de ALNEXT ==="

    # --- 1. Validaciones de entrada -----------------------------------------

    if (-not (Test-IdentificadorSeguro $AppRole)) {
        Salir -Code 1 -MensajeError "AppRole '$AppRole' no es un identificador seguro (solo letras/números/guión bajo, empezando por letra o '_')."
    }
    if (-not (Test-IdentificadorSeguro $AppDbName)) {
        Salir -Code 1 -MensajeError "AppDbName '$AppDbName' no es un identificador seguro (solo letras/números/guión bajo, empezando por letra o '_')."
    }
    if ($AdminPassword.Length -lt 8) {
        Salir -Code 1 -MensajeError "AdminPassword debe tener al menos 8 caracteres (misma validación que exige scripts/seed-instalacion.ts)."
    }
    if (-not (Test-Path $AppDir)) {
        Salir -Code 1 -MensajeError "No existe -AppDir: $AppDir (se asume que el código de la app ya está deployado ahí -- ver supuestos documentados en el encabezado de este script)."
    }
    $schemaPath = Join-Path $AppDir "prisma\schema.prisma"
    if (-not (Test-Path $schemaPath)) {
        Salir -Code 1 -MensajeError "No se encontró $schemaPath -- ¿-AppDir apunta al código de ALNEXT?"
    }

    # --- 2. Resolver psql.exe (explicito > PATH > registro de Windows >
    #        convencion ALNEXT) ----------------------------------------------
    # El fallback anterior asumia la ruta default del instalador oficial de
    # EDB (C:\Program Files\PostgreSQL\<version>\bin\psql.exe) -- pero
    # Install-Postgres.ps1 instala con -Prefix propio (default
    # C:\ALNEXT\pgsql), asi que ese fallback apuntaba a una ruta que nunca
    # existe en una instalacion real de ALNEXT. Cuando el orquestador
    # (Install-ALNEXT.ps1) invoca este script, ya pasa -PsqlPath resuelto a
    # partir de su propio -Prefix -- esto solo importa para invocaciones
    # sueltas de Install-Database.ps1 sin -PsqlPath.

    if (-not $PsqlPath) {
        $cmd = Get-Command psql -ErrorAction SilentlyContinue
        if ($cmd) {
            $PsqlPath = $cmd.Source
        } else {
            $registryPath = "HKLM:\SOFTWARE\PostgreSQL\Installations\postgresql-x64-$PgVersion"
            $baseDirRegistro = $null
            if (Test-Path $registryPath) {
                $baseDirRegistro = (Get-ItemProperty -Path $registryPath -ErrorAction SilentlyContinue).'Base Directory'
            }
            if ($baseDirRegistro) {
                $PsqlPath = Join-Path $baseDirRegistro "bin\psql.exe"
            } else {
                $PsqlPath = "C:\ALNEXT\pgsql\bin\psql.exe"
            }
        }
    }
    if (-not (Test-Path $PsqlPath)) {
        Salir -Code 2 -MensajeError "No se encontró psql en: $PsqlPath (ni en PATH, ni en el registro de Windows para Postgres $PgVersion, ni en la convención de instalación de ALNEXT). Pasá -PsqlPath explícitamente."
    }
    Write-Host "psql: $PsqlPath"

    # --- 3. Verificar que Postgres responde ---------------------------------

    if (-not (Test-PuertoAbierto -HostName "localhost" -Port $PgPort)) {
        Salir -Code 3 -MensajeError "Postgres no responde en localhost:$PgPort -- ¿corriste Install-Postgres.ps1 antes?"
    }

    # --- 4. Rol propio de la app (idempotente) ------------------------------

    $rolExiste = [bool](Invoke-PsqlSuperuser -Query -Sql "SELECT 1 FROM pg_roles WHERE rolname='$AppRole';")

    if (-not $rolExiste) {
        if (-not $AppRolePassword) {
            $AppRolePassword = New-PasswordFuerte
            $resultado.appRolePasswordGenerada = $true
            $resultado.appRolePassword = $AppRolePassword
        }
        $passwordEscapada = Escape-SqlLiteral $AppRolePassword
        Invoke-PsqlSuperuser -Sql "CREATE ROLE `"$AppRole`" LOGIN PASSWORD '$passwordEscapada';"
        $resultado.rolCreadoEnEstaCorrida = $true
        Write-Host "Rol '$AppRole' creado."
    } else {
        if (-not $AppRolePassword) {
            Salir -Code 3 -MensajeError "El rol '$AppRole' ya existe y no se pasó -AppRolePassword -- no se puede reconstruir el DATABASE_URL sin la password original. Volvé a correr el script pasando la misma password usada al crearlo."
        }
        Write-Host "Rol '$AppRole' ya existe -- no se modifica (la password no se resetea en un re-run)."
    }

    # --- 5. Base de datos propia (idempotente) ------------------------------

    $dbExiste = [bool](Invoke-PsqlSuperuser -Query -Sql "SELECT 1 FROM pg_database WHERE datname='$AppDbName';")

    if (-not $dbExiste) {
        Invoke-PsqlSuperuser -Sql "CREATE DATABASE `"$AppDbName`" OWNER `"$AppRole`";"
        $resultado.dbCreadaEnEstaCorrida = $true
        Write-Host "Base '$AppDbName' creada (owner '$AppRole')."
    } else {
        Write-Host "Base '$AppDbName' ya existe -- no se modifica."
    }

    # --- 6. Generar .env de la app -------------------------------------------
    # Único valor que la app necesita realmente en runtime (verificado en
    # esta sesión: grep sobre lib/ y next.config.ts, solo DATABASE_URL se
    # lee fuera de fallbacks de desarrollo/build opcionales).

    $databaseUrl = "postgresql://${AppRole}:${AppRolePassword}@localhost:${PgPort}/${AppDbName}?schema=public"
    $envPath = Join-Path $AppDir ".env"
    try {
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($envPath, "DATABASE_URL=`"$databaseUrl`"", $utf8NoBom)
        $resultado.envGenerado = $true
        Write-Host ".env generado en: $envPath"
    } catch {
        Salir -Code 4 -MensajeError "Falló al escribir $envPath -- $($_.Exception.Message)"
    }

    # --- 7. Migraciones de producción ----------------------------------------

    Push-Location $AppDir
    try {
        Write-Host "Ejecutando prisma migrate deploy..."
        & npx prisma migrate deploy
        if ($LASTEXITCODE -ne 0) {
            Salir -Code 5 -MensajeError "prisma migrate deploy terminó con exit code $LASTEXITCODE."
        }
        $resultado.migrateDeployOk = $true

        # No confiar solo en el exit code de migrate deploy -- mismo criterio
        # que tests/checkMigraciones.test.ts: confirmar contra `migrate status`.
        Write-Host "Verificando prisma migrate status (sin pending/drift)..."
        # 2>&1 convierte cada línea de stderr de un comando nativo en un
        # ErrorRecord de PowerShell. Con $ErrorActionPreference="Stop"
        # global, cualquier salida benigna a stderr (ej. aviso de "nueva
        # versión disponible" de npx/prisma) se vuelve una excepción
        # terminante y corta el script ACÁ, antes de poder evaluar
        # $sinPendientes/$estadoOk -- confirmado en VM (exitCode:8 en vez
        # del Code 6 que hubiese sido el resultado correcto si de verdad
        # hubiera pending/drift). Se baja el EAP a "Continue" solo para
        # esta línea y se restaura después, mismo patrón que
        # $env:PGPASSWORD/$env:DATABASE_URL en el resto del script.
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $statusOutput = (& npx prisma migrate status 2>&1 | Out-String).ToLower()
        } finally {
            $ErrorActionPreference = $prevEap
        }
        Write-Host $statusOutput

        $sinPendientes = ($statusOutput -notmatch "pending") -and ($statusOutput -notmatch "drift")
        $estadoOk = ($statusOutput -match "up to date") -or ($statusOutput -match "no pending migrations")

        if (-not ($sinPendientes -and $estadoOk)) {
            Salir -Code 6 -MensajeError "prisma migrate status no confirma un estado limpio (pending/drift detectado, o salida no interpretable). Revisar el detalle impreso arriba."
        }
        $resultado.migrateStatusLimpio = $true
        Write-Host "Migraciones aplicadas y validadas sin pending/drift."

        # --- 8. Seed mínimo (institución + admin) -----------------------------
        # Reutiliza scripts/seed-instalacion.ts tal cual existe -- no
        # prisma/seed.ts (ese es fixture de desarrollo con datos reales de
        # Colegio Ceferino, explícitamente fuera de alcance, ver backlog #11).

        $configDir = Join-Path $AppDir "config"
        if (-not (Test-Path $configDir)) {
            New-Item -ItemType Directory -Path $configDir | Out-Null
        }
        $configPath = Join-Path $configDir "institucion.json"

        $configInstalacion = [ordered]@{
            institucion = [ordered]@{
                nombre    = $InstitucionNombre
                dominio   = $InstitucionDominio
                cuit      = $InstitucionCuit
                domicilio = $InstitucionDomicilio
                telefono  = $InstitucionTelefono
                email     = $InstitucionEmail
                configuracion = [ordered]@{
                    usaMaterias            = $UsaMaterias
                    usaCursos              = $UsaCursos
                    modulosDuracionMinutos = $ModulosDuracionMinutos
                }
            }
            adminInicial = [ordered]@{
                nombre           = $AdminNombre
                email            = $AdminEmail
                passwordTemporal = $AdminPassword
            }
        }

        try {
            $jsonInstalacion = $configInstalacion | ConvertTo-Json -Depth 5
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($configPath, $jsonInstalacion, $utf8NoBom)
            Write-Host "config/institucion.json generado en: $configPath"
        } catch {
            Salir -Code 7 -MensajeError "Falló al escribir $configPath -- $($_.Exception.Message)"
        }

        Write-Host "Ejecutando seed de instalación..."
        # scripts/seed-instalacion.ts corre como script de Node suelto, no
        # como comando de la CLI de Prisma -- a diferencia de "migrate
        # deploy"/"migrate status" (que cargan .env automáticamente), este
        # proceso no tiene DATABASE_URL en su entorno salvo que se la
        # pasemos explícitamente. Mismo patrón que Invoke-PsqlSuperuser con
        # $env:PGPASSWORD.
        $env:DATABASE_URL = $databaseUrl
        try {
            & node --loader ts-node/esm scripts/seed-instalacion.ts $configPath
            if ($LASTEXITCODE -ne 0) {
                Salir -Code 7 -MensajeError "scripts/seed-instalacion.ts terminó con exit code $LASTEXITCODE."
            }
        } finally {
            Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
        }
        $resultado.seedOk = $true
        Write-Host "Seed de instalación completado."
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "=== Resultado ==="
    Write-Host "Rol de app: $AppRole $(if ($resultado.rolCreadoEnEstaCorrida) { '(creado ahora)' } else { '(ya existía)' })"
    Write-Host "Base de datos: $AppDbName $(if ($resultado.dbCreadaEnEstaCorrida) { '(creada ahora)' } else { '(ya existía)' })"
    if ($resultado.appRolePasswordGenerada) {
        Write-Host "Password del rol de app (generada, guardala -- no se vuelve a mostrar): $AppRolePassword"
    }
    Write-Host "Institución: $InstitucionNombre / Admin: $AdminEmail"
    Write-Host ""

    Salir -Code 0
} catch {
    Salir -Code 8 -MensajeError "Fallo inesperado no controlado en Install-Database.ps1: $($_.Exception.Message)"
}