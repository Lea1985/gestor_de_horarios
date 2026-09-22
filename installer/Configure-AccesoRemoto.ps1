# Configure-AccesoRemoto.ps1
#
# Abre el acceso remoto a Postgres SOLO para la subred de Tailscale
# (100.64.0.0/10) y crea un rol angosto (alnext_remote_admin) que unicamente
# puede leer y actualizar Institucion.activo -- nada de superusuario, nada
# de acceso al resto de las tablas. Pensado para correr una vez por cada VM
# ya instalada (Postgres + Tailscale primero), para poder despues cambiar
# el estado de la institucion desde Set-EstadoInstitucion.ps1 sin que el
# cliente se entere (ver #204/#248).
#
# Requiere que Install-Postgres.ps1 y Install-Tailscale.ps1 ya hayan
# corrido en esta maquina.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File installer\Configure-AccesoRemoto.ps1 `
#       -SuperPassword "unaPasswordFuerte"
#
# (el resto de los parametros tienen default consistente con el resto del
# instalador: -Prefix "C:\ALNEXT\pgsql", -PgPort 5433, -AppDbName "alnext",
# -ServiceName "postgresql-alnext". -RemoteAdminPassword se genera random
# si no se pasa.)
#
# Exit codes:
#   0 = acceso remoto configurado OK.
#   1 = el usuario cancelo la elevacion (UAC) o esta fallo.
#   2 = no se encontraron postgresql.conf / pg_hba.conf en el DataDir.
#   3 = el servicio de Postgres no volvio a 'Running' tras el reinicio.
#   4 = fallo creando el rol alnext_remote_admin o sus permisos.
#   8 = fallo inesperado no controlado.

param(
    [string]$Prefix = "C:\ALNEXT\pgsql",
    [string]$DataDir = "",
    [int]$PgPort = 5433,
    [Parameter(Mandatory = $true)][string]$SuperPassword,
    [string]$AppDbName = "alnext",
    [string]$RemoteAdminPassword = "",
    [string]$ServiceName = "postgresql-alnext",
    [string]$PsqlPath = "",

    [switch]$Elevated,
    [string]$ResultFile = ""
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "Common.ps1")

if (-not $DataDir) { $DataDir = "$Prefix\data" }
if (-not $PsqlPath) { $PsqlPath = Join-Path $Prefix "bin\psql.exe" }

$resultado = [ordered]@{
    listenAddressesOk = $false
    pgHbaOk           = $false
    servicioOk        = $false
    rolOk             = $false
    remoteAdminPassword = ""
    exitCode          = -1
}

function Salir {
    param([int]$Code, [string]$MensajeError = "")
    if ($MensajeError) { Write-Error $MensajeError -ErrorAction Continue }
    $resultado.exitCode = $Code
    $json = $resultado | ConvertTo-Json -Compress
    $json
    if ($ResultFile) { $json | Out-File -FilePath $ResultFile -Encoding utf8 }
    exit $Code
}

function New-PasswordSegura {
    param([int]$Longitud = 24)
    $caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    -join (1..$Longitud | ForEach-Object { $caracteres[(Get-Random -Maximum $caracteres.Length)] })
}

function Invocar-Sql {
    param([string]$Sql, [string]$Usuario, [string]$Password, [string]$Db)
    $sqlPath = Join-Path $env:TEMP "alnext-accesoremoto-$([guid]::NewGuid().ToString('N')).sql"
    Set-Content -Path $sqlPath -Value $Sql -Encoding ASCII
    $env:PGPASSWORD = $Password
    $salida = (cmd /c "`"$PsqlPath`" -h localhost -p $PgPort -U $Usuario -d $Db -v ON_ERROR_STOP=1 -f `"$sqlPath`" 2>&1") | Out-String
    $codigo = $LASTEXITCODE
    $env:PGPASSWORD = $null
    Remove-Item $sqlPath -ErrorAction SilentlyContinue
    return [PSCustomObject]@{ Salida = $salida; Codigo = $codigo }
}

# --- 1. Elevacion -----------------------------------------------------------

if (-not (Test-Elevado)) {
    if ($Elevated) {
        Write-Error "No se pudo obtener elevacion de administrador tras el reintento." -ErrorAction Continue
        exit 1
    }
    Write-Host "Configure-AccesoRemoto necesita permisos de administrador (edita configuracion de Postgres y reinicia el servicio). Pidiendo elevacion (UAC)..."

    $resultFile2 = Join-Path $env:TEMP "alnext-accesoremoto-result-$([guid]::NewGuid().ToString('N')).json"
    $extraArgs = @(
        "-Prefix", "`"$Prefix`"",
        "-DataDir", "`"$DataDir`"",
        "-PgPort", $PgPort,
        "-SuperPassword", "`"$SuperPassword`"",
        "-AppDbName", "`"$AppDbName`"",
        "-RemoteAdminPassword", "`"$RemoteAdminPassword`"",
        "-ServiceName", "`"$ServiceName`"",
        "-PsqlPath", "`"$PsqlPath`"",
        "-Elevated",
        "-ResultFile", "`"$resultFile2`""
    )

    $relayResult = Invoke-Elevado -ScriptPath $PSCommandPath -ExtraArgs $extraArgs -ResultFile $resultFile2
    if ($relayResult.Cancelado) {
        Write-Error "El usuario cancelo la elevacion (UAC) o esta fallo: $($relayResult.Mensaje)" -ErrorAction Continue
        exit 1
    }
    if ($relayResult.Output) { $relayResult.Output }
    exit $relayResult.ExitCode
}

try {
    # --- 2. postgresql.conf: listen_addresses -------------------------------

    $postgresqlConf = Join-Path $DataDir "postgresql.conf"
    $pgHbaConf = Join-Path $DataDir "pg_hba.conf"

    if (-not (Test-Path $postgresqlConf)) {
        Salir -Code 2 -MensajeError "No se encontro postgresql.conf en $DataDir."
    }
    if (-not (Test-Path $pgHbaConf)) {
        Salir -Code 2 -MensajeError "No se encontro pg_hba.conf en $DataDir."
    }

    $contenidoConf = Get-Content $postgresqlConf -Raw
    if ($contenidoConf -match "(?m)^\s*#?\s*listen_addresses\s*=") {
        $contenidoConf = $contenidoConf -replace "(?m)^\s*#?\s*listen_addresses\s*=.*$", "listen_addresses = '*'"
    } else {
        $contenidoConf += "`r`nlisten_addresses = '*'`r`n"
    }
    Set-Content -Path $postgresqlConf -Value $contenidoConf -Encoding ASCII -NoNewline
    Write-Host "postgresql.conf: listen_addresses = '*' aplicado."
    $resultado.listenAddressesOk = $true

    # --- 3. pg_hba.conf: regla restringida a la subred Tailscale ------------

    $lineaHba = "host    $AppDbName    alnext_remote_admin    100.64.0.0/10    scram-sha-256"
    $contenidoHba = Get-Content $pgHbaConf -Raw
    if ($contenidoHba -notmatch [regex]::Escape($lineaHba)) {
        Add-Content -Path $pgHbaConf -Value "`r`n# ALNEXT -- acceso remoto restringido a la subred Tailscale (ver #204/#248)`r`n$lineaHba`r`n" -Encoding ASCII
        Write-Host "pg_hba.conf: regla de acceso remoto agregada."
    } else {
        Write-Host "pg_hba.conf: la regla ya existia, no se duplico."
    }
    $resultado.pgHbaOk = $true

    # --- 4. Reiniciar Postgres para aplicar los cambios ----------------------

    Write-Host "Reiniciando servicio $ServiceName..."
    Restart-Service -Name $ServiceName -Force
    $intentos = 0
    do {
        Start-Sleep -Seconds 2
        $intentos++
        $servicio = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    } while ($servicio.Status -ne 'Running' -and $intentos -lt 15)

    if (-not $servicio -or $servicio.Status -ne 'Running') {
        Salir -Code 3 -MensajeError "El servicio $ServiceName no volvio a 'Running' tras el reinicio."
    }
    Write-Host "Servicio $ServiceName reiniciado OK."
    $resultado.servicioOk = $true

    # --- 5. Rol angosto: solo lectura + UPDATE(activo) sobre Institucion ----

    if (-not $RemoteAdminPassword) { $RemoteAdminPassword = New-PasswordSegura }

    $sqlRol = @"
DO `$do`$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'alnext_remote_admin') THEN
      CREATE ROLE alnext_remote_admin LOGIN PASSWORD '$RemoteAdminPassword';
   ELSE
      ALTER ROLE alnext_remote_admin WITH PASSWORD '$RemoteAdminPassword';
   END IF;
END
`$do`$;
GRANT CONNECT ON DATABASE $AppDbName TO alnext_remote_admin;
"@
    $r1 = Invocar-Sql -Sql $sqlRol -Usuario "postgres" -Password $SuperPassword -Db "postgres"
    Write-Host $r1.Salida

    $sqlGrants = "GRANT USAGE ON SCHEMA public TO alnext_remote_admin;`r`nGRANT SELECT (id, nombre, cuit, activo), UPDATE (activo) ON `"Institucion`" TO alnext_remote_admin;"
    $r2 = [PSCustomObject]@{ Salida = ""; Codigo = 1 }
    if ($r1.Codigo -eq 0) {
        $r2 = Invocar-Sql -Sql $sqlGrants -Usuario "postgres" -Password $SuperPassword -Db $AppDbName
        Write-Host $r2.Salida
    }

    if ($r1.Codigo -ne 0 -or $r2.Codigo -ne 0) {
        Salir -Code 4 -MensajeError "Fallo creando el rol alnext_remote_admin o sus permisos. Ver detalle arriba."
    }
    $resultado.rolOk = $true
    $resultado.remoteAdminPassword = $RemoteAdminPassword

    Write-Host ""
    Write-Host "=== Acceso remoto configurado ==="
    Write-Host "IMPORTANTE: password de alnext_remote_admin -- guardala, no se vuelve a mostrar: $RemoteAdminPassword"
    Write-Host ""

    Salir -Code 0
} catch {
    Salir -Code 8 -MensajeError "Fallo inesperado no controlado en Configure-AccesoRemoto.ps1: $($_.Exception.Message)"
}
