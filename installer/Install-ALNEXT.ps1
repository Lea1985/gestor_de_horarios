# Install-ALNEXT.ps1
#
# Punto de entrada unico del instalador de ALNEXT. Orquesta los 4 pasos que
# hasta ahora se corrian a mano por separado: Preflight.ps1,
# Install-Postgres.ps1, Install-Database.ps1 e Install-AppService.ps1.
#
# Se auto-eleva UNA sola vez al principio (mismo patron de Common.ps1 que ya
# usan Preflight.ps1/Install-Postgres.ps1: Test-Elevado/Invoke-Elevado, con
# -Elevated/-ResultFile para el relay de UAC). Una vez elevado el
# orquestador, los sub-pasos heredan esa elevacion como procesos hijo y no
# vuelven a pedir UAC -- un solo prompt para todo el instalador.
#
# Cada paso se invoca como un proceso hijo separado (powershell.exe -File),
# nunca por dot-source ni "&" directo -- cada uno de esos scripts termina
# con "exit $Code", y eso mataria al proceso del orquestador si se
# invocaran en el mismo proceso. Se captura $LASTEXITCODE y la ultima linea
# de stdout (el JSON que cada script ya emite) de cada sub-paso.
#
# Si cualquier paso falla, el orquestador corta ahi mismo -- no sigue con
# el siguiente paso sobre una base rota.
#
# Supuestos (documentados, no resueltos aca -- ver backlog #248): el
# instalador de Postgres (-PgInstallerPath) y el codigo de la app en
# -AppDir ya estan disponibles en la maquina. Empaquetar todo eso en un
# unico artefacto distribuible es trabajo aparte.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File installer\Install-ALNEXT.ps1 `
#       -PgInstallerPath "C:\ruta\al\instalador-postgres.exe" `
#       -SuperPassword "unaPasswordFuerte" `
#       -InstitucionNombre "Escuela Primaria N°12" -InstitucionCuit "30-12345678-9" `
#       -InstitucionEmail "info@escuela12.edu.ar" `
#       -AdminNombre "Secretaria" -AdminEmail "secretaria@escuela12.edu.ar" -AdminPassword "cambiar-esta-clave"
#
# Salida:
#   - Resumen legible por consola de cada paso (se reimprime lo que cada
#     sub-script ya imprime).
#   - Un objeto JSON final por el pipeline, mismo patron que el resto del
#     instalador.
#   - Exit code:
#       0  = instalacion completa: Postgres, base de datos, seed y app
#            corriendo persistente.
#       1  = el usuario cancelo la elevacion (UAC) o esta fallo.
#       10 = Preflight fallo.
#       11 = Install-Postgres fallo.
#       12 = Install-Database fallo.
#       13 = Install-AppService fallo.
#       8  = fallo inesperado no controlado.

param(
    # Preflight / Install-Postgres
    [Parameter(Mandatory = $true)][string]$PgInstallerPath,
    [Parameter(Mandatory = $true)][string]$SuperPassword,
    [string]$ServicePassword = "",
    [string]$PgVersion = "18",
    [int]$PgPort = 5433,
    [string]$ServiceName = "postgresql-alnext",
    [string]$Prefix = "C:\ALNEXT\pgsql",
    [string]$DataDir = "",
    [switch]$AllowExistingInstallation,
    [int]$TimeoutMinutes = 15,

    # Install-Database
    [string]$AppRole = "alnext_app",
    [string]$AppRolePassword = "",
    [string]$AppDbName = "alnext",
    [string]$AppDir = "C:\ALNEXT\app",
    [Parameter(Mandatory = $true)][string]$InstitucionNombre,
    [Parameter(Mandatory = $true)][string]$InstitucionCuit,
    [Parameter(Mandatory = $true)][string]$InstitucionEmail,
    [string]$InstitucionDominio = "",
    [string]$InstitucionDomicilio = "",
    [string]$InstitucionTelefono = "",
    [int]$ModulosDuracionMinutos = 40,
    [Parameter(Mandatory = $true)][string]$AdminNombre,
    [Parameter(Mandatory = $true)][string]$AdminEmail,
    [Parameter(Mandatory = $true)][string]$AdminPassword,

    # Install-AppService
    [int]$AppPort = 3000,
    [string]$AppTaskName = "ALNEXT-App",

    # Elevacion (mismo contrato que Preflight.ps1/Install-Postgres.ps1)
    [switch]$Elevated,
    [string]$ResultFile = ""
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "Common.ps1")

if (-not $DataDir) { $DataDir = "$Prefix\data" }

$resultado = [ordered]@{
    preflightOk  = $false
    postgresOk   = $false
    databaseOk   = $false
    appServiceOk = $false
    exitCode     = -1
}

function Salir {
    param([int]$Code, [string]$MensajeError = "")

    if ($MensajeError) {
        Write-Error $MensajeError -ErrorAction Continue
    }

    $resultado.exitCode = $Code
    $json = $resultado | ConvertTo-Json -Compress
    $json

    if ($ResultFile) {
        $json | Out-File -FilePath $ResultFile -Encoding utf8
    }

    exit $Code
}

# --- 1. Elevacion (Test-Elevado / Invoke-Elevado en Common.ps1) ------------

if (-not (Test-Elevado)) {
    if ($Elevated) {
        Write-Error "No se pudo obtener elevacion de administrador tras el reintento." -ErrorAction Continue
        exit 1
    }

    Write-Host "ALNEXT necesita permisos de administrador para instalar. Pidiendo elevacion (UAC)..."

    $resultFile = Join-Path $env:TEMP "alnext-install-$([guid]::NewGuid().ToString('N')).json"

    $extraArgs = @(
        "-PgInstallerPath", "`"$PgInstallerPath`"",
        "-SuperPassword", "`"$SuperPassword`"",
        "-ServicePassword", "`"$ServicePassword`"",
        "-PgVersion", $PgVersion,
        "-PgPort", $PgPort,
        "-ServiceName", "`"$ServiceName`"",
        "-Prefix", "`"$Prefix`"",
        "-DataDir", "`"$DataDir`"",
        "-TimeoutMinutes", $TimeoutMinutes,
        "-AppRole", "`"$AppRole`"",
        "-AppRolePassword", "`"$AppRolePassword`"",
        "-AppDbName", "`"$AppDbName`"",
        "-AppDir", "`"$AppDir`"",
        "-InstitucionNombre", "`"$InstitucionNombre`"",
        "-InstitucionCuit", "`"$InstitucionCuit`"",
        "-InstitucionEmail", "`"$InstitucionEmail`"",
        "-InstitucionDominio", "`"$InstitucionDominio`"",
        "-InstitucionDomicilio", "`"$InstitucionDomicilio`"",
        "-InstitucionTelefono", "`"$InstitucionTelefono`"",
        "-ModulosDuracionMinutos", $ModulosDuracionMinutos,
        "-AdminNombre", "`"$AdminNombre`"",
        "-AdminEmail", "`"$AdminEmail`"",
        "-AdminPassword", "`"$AdminPassword`"",
        "-AppPort", $AppPort,
        "-AppTaskName", "`"$AppTaskName`"",
        "-Elevated",
        "-ResultFile", "`"$resultFile`""
    )
    if ($AllowExistingInstallation) { $extraArgs += "-AllowExistingInstallation" }

    $relayResult = Invoke-Elevado -ScriptPath $PSCommandPath -ExtraArgs $extraArgs -ResultFile $resultFile
    if ($relayResult.Cancelado) {
        Write-Error "El usuario cancelo la elevacion (UAC) o esta fallo: $($relayResult.Mensaje)" -ErrorAction Continue
        exit 1
    }
    if ($relayResult.Output) { $relayResult.Output }
    exit $relayResult.ExitCode
}

# A partir de aca el proceso corre elevado. Los sub-pasos, al ser procesos
# hijo de este, heredan la elevacion -- no vuelven a pedir UAC.

function Invocar-Paso {
    param(
        [string]$Nombre,
        [string]$ScriptPath,
        [string[]]$Args
    )

    Write-Host ""
    Write-Host ">>> $Nombre <<<"
    $salida = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Args
    $codigo = $LASTEXITCODE
    $salida | ForEach-Object { Write-Host $_ }

    $jsonLine = $salida | Select-Object -Last 1
    $obj = $null
    try { $obj = $jsonLine | ConvertFrom-Json } catch { }

    return [PSCustomObject]@{ ExitCode = $codigo; Resultado = $obj }
}

try {
    $installerDir = $PSScriptRoot

    # --- Paso 1/4: Preflight ------------------------------------------------

    $preflightArgs = @(
        "-PgVersion", $PgVersion,
        "-PgPort", $PgPort,
        "-ServiceName", "`"$ServiceName`""
    )
    if ($AllowExistingInstallation) { $preflightArgs += "-AllowExistingInstallation" }

    $r1 = Invocar-Paso -Nombre "Paso 1/4: Preflight" -ScriptPath (Join-Path $installerDir "Preflight.ps1") -Args $preflightArgs
    if ($r1.ExitCode -ne 0) {
        Salir -Code 10 -MensajeError "Preflight fallo (exit $($r1.ExitCode)). Ver detalle arriba."
    }
    $resultado.preflightOk = $true

    # --- Paso 2/4: Instalacion de Postgres -----------------------------------

    $pgArgs = @(
        "-PgInstallerPath", "`"$PgInstallerPath`"",
        "-SuperPassword", "`"$SuperPassword`"",
        "-ServicePassword", "`"$ServicePassword`"",
        "-PgVersion", $PgVersion,
        "-PgPort", $PgPort,
        "-ServiceName", "`"$ServiceName`"",
        "-Prefix", "`"$Prefix`"",
        "-DataDir", "`"$DataDir`"",
        "-TimeoutMinutes", $TimeoutMinutes
    )
    if ($AllowExistingInstallation) { $pgArgs += "-AllowExistingInstallation" }

    $r2 = Invocar-Paso -Nombre "Paso 2/4: Instalacion de Postgres" -ScriptPath (Join-Path $installerDir "Install-Postgres.ps1") -Args $pgArgs
    if ($r2.ExitCode -ne 0) {
        Salir -Code 11 -MensajeError "Install-Postgres fallo (exit $($r2.ExitCode)). Ver detalle arriba."
    }
    $resultado.postgresOk = $true

    # --- Paso 3/4: Base de datos y seed --------------------------------------
    # psql.exe: se resuelve acá a partir de -Prefix en vez de depender del
    # fallback hardcodeado (y hoy incorrecto, ver backlog #249) que trae
    # Install-Database.ps1 por su cuenta.

    $psqlPath = Join-Path $Prefix "bin\psql.exe"

    $dbArgs = @(
        "-PgPort", $PgPort,
        "-SuperPassword", "`"$SuperPassword`"",
        "-AppRole", "`"$AppRole`"",
        "-AppDbName", "`"$AppDbName`"",
        "-AppDir", "`"$AppDir`"",
        "-PsqlPath", "`"$psqlPath`"",
        "-InstitucionNombre", "`"$InstitucionNombre`"",
        "-InstitucionCuit", "`"$InstitucionCuit`"",
        "-InstitucionEmail", "`"$InstitucionEmail`"",
        "-InstitucionDominio", "`"$InstitucionDominio`"",
        "-InstitucionDomicilio", "`"$InstitucionDomicilio`"",
        "-InstitucionTelefono", "`"$InstitucionTelefono`"",
        "-ModulosDuracionMinutos", $ModulosDuracionMinutos,
        "-AdminNombre", "`"$AdminNombre`"",
        "-AdminEmail", "`"$AdminEmail`"",
        "-AdminPassword", "`"$AdminPassword`""
    )
    if ($AppRolePassword) { $dbArgs += @("-AppRolePassword", "`"$AppRolePassword`"") }

    $r3 = Invocar-Paso -Nombre "Paso 3/4: Base de datos y seed" -ScriptPath (Join-Path $installerDir "Install-Database.ps1") -Args $dbArgs
    if ($r3.ExitCode -ne 0) {
        Salir -Code 12 -MensajeError "Install-Database fallo (exit $($r3.ExitCode)). Ver detalle arriba."
    }
    $resultado.databaseOk = $true
    if ($r3.Resultado -and $r3.Resultado.appRolePasswordGenerada) {
        Write-Host ""
        Write-Host "IMPORTANTE: password del rol de base de datos generada automaticamente -- guardala, no se vuelve a mostrar: $($r3.Resultado.appRolePassword)"
        Write-Host ""
    }

    # --- Paso 4/4: Arranque persistente de la app ----------------------------

    $appArgs = @(
        "-AppDir", "`"$AppDir`"",
        "-Port", $AppPort,
        "-TaskName", "`"$AppTaskName`""
    )

    $r4 = Invocar-Paso -Nombre "Paso 4/4: Arranque persistente de la app" -ScriptPath (Join-Path $installerDir "Install-AppService.ps1") -Args $appArgs
    if ($r4.ExitCode -ne 0) {
        Salir -Code 13 -MensajeError "Install-AppService fallo (exit $($r4.ExitCode)). Ver detalle arriba."
    }
    $resultado.appServiceOk = $true

    Write-Host ""
    Write-Host "=== ALNEXT instalado correctamente ==="
    Write-Host "Institucion: $InstitucionNombre"
    Write-Host "Admin: $AdminEmail"
    Write-Host "App disponible en: http://127.0.0.1:$AppPort"
    Write-Host ""

    Salir -Code 0
} catch {
    Salir -Code 8 -MensajeError "Fallo inesperado no controlado en Install-ALNEXT.ps1: $($_.Exception.Message)"
}
