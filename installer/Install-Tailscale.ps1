# Install-Tailscale.ps1
#
# Paso del instalador de ALNEXT que instala Tailscale (VPN mesh) y une la
# maquina del cliente a la tailnet del proveedor -- decidido en la sesion
# del 12/09/2026 junto con el diseno del control de licencia (#204): el
# enforcement de institucion.activo vive en proxy.ts, y se opera a mano
# (sin logica automatica de vencimientos, decision explicita para no
# arriesgar la confiabilidad durante el piloto). Tailscale es el canal
# para poder tocar ese flag remotamente sin depender de que el cliente
# coopere.
#
# Por que un paso propio y no parte de otro script: instalar el servicio
# de Windows "Tailscale" requiere elevacion, igual que
# Install-Postgres.ps1/Install-AppService.ps1, y es conceptualmente
# independiente de Postgres/la app -- se beneficia de poder reintentarse
# solo sin tocar el resto de la instalacion.
#
# Requiere:
#   -TailscaleInstallerPath: ruta al .msi oficial de Tailscale para
#     Windows (parte del paquete offline, ver backlog #248 -- mismo
#     criterio que -PgInstallerPath en Install-Postgres.ps1, nunca se
#     descarga en el momento de la instalacion real).
#   -AuthKey: authkey de Tailscale generado desde el admin console de la
#     tailnet del proveedor (login.tailscale.com/admin/settings/keys).
#     Nunca hardcodeado ni compartido en este repositorio -- lo genera y
#     pasa el operador en el momento, mismo criterio que
#     -AdminPassword/-SuperPassword en los otros pasos. Aparece en texto
#     plano en la linea de comandos (igual que esas otras passwords) --
#     usar un authkey de vida corta o revocarlo despues si eso preocupa.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File installer\Install-Tailscale.ps1 `
#       -TailscaleInstallerPath "C:\ALNEXT\tailscale-installer\tailscale-setup-amd64.msi" `
#       -AuthKey "tskey-auth-..." `
#       -Hostname "alnext-escuela-primaria-n12"
#
# Salida:
#   - Resumen legible por consola (Write-Host).
#   - Un objeto JSON por el pipeline (ultima linea de salida "real"),
#     mismo patron que el resto del instalador.
#   - Exit code:
#       0 = Tailscale instalado (o ya estaba) y la maquina esta unida a
#           la tailnet, confirmada online.
#       1 = parametros invalidos (-TailscaleInstallerPath inexistente, o
#           -AuthKey vacio).
#       2 = no se pudo obtener elevacion de administrador (UAC cancelado
#           o fallido).
#       3 = la instalacion silenciosa de Tailscale (msiexec) termino con
#           error.
#       4 = no se encontro tailscale.exe tras la instalacion.
#       5 = "tailscale up" (union a la tailnet) termino con error.
#       6 = la maquina no aparece online tras "tailscale up" (verificado
#           con "tailscale status --json").
#       8 = fallo inesperado no controlado.

param(
    [Parameter(Mandatory = $true)][string]$TailscaleInstallerPath,
    [Parameter(Mandatory = $true)][string]$AuthKey,
    [string]$Hostname = "",
    [switch]$Elevated,
    [string]$ResultFile = ""
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "Common.ps1")

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

$resultado = [ordered]@{
    tailscaleInstalado = $false
    yaEstabaInstalado   = $false
    conectado           = $false
    hostname            = $null
    tailscaleIPs        = $null
    exitCode            = -1
}

# --- 1. Elevacion (Test-Elevado / Invoke-Elevado en Common.ps1) ------------

if (-not (Test-Elevado)) {
    if ($Elevated) {
        Salir -Code 2 -MensajeError "No se pudo obtener elevacion de administrador tras el reintento."
    }

    Write-Host "Instalar Tailscale requiere permisos de administrador. Pidiendo elevacion (UAC)..."

    $resultFileRelay = Join-Path $env:TEMP "alnext-tailscale-$([guid]::NewGuid().ToString('N')).json"

    $extraArgs = @(
        "-TailscaleInstallerPath", "`"$TailscaleInstallerPath`"",
        "-AuthKey", "`"$AuthKey`"",
        "-Hostname", "`"$Hostname`"",
        "-Elevated",
        "-ResultFile", "`"$resultFileRelay`""
    )

    $relayResult = Invoke-Elevado -ScriptPath $PSCommandPath -ExtraArgs $extraArgs -ResultFile $resultFileRelay
    if ($relayResult.Cancelado) {
        Salir -Code 2 -MensajeError "El usuario cancelo la elevacion (UAC) o esta fallo: $($relayResult.Mensaje)"
    }
    if ($relayResult.Output) { $relayResult.Output }
    exit $relayResult.ExitCode
}

# A partir de aca el proceso corre elevado.

try {
    Write-Host ""
    Write-Host "=== Instalacion de Tailscale para ALNEXT ==="

    # --- 2. Validaciones de entrada -----------------------------------------

    if (-not (Test-Path $TailscaleInstallerPath)) {
        Salir -Code 1 -MensajeError "No existe -TailscaleInstallerPath: $TailscaleInstallerPath"
    }
    if (-not $AuthKey) {
        Salir -Code 1 -MensajeError "-AuthKey no puede estar vacio."
    }

    $tailscaleExe = "C:\Program Files\Tailscale\tailscale.exe"

    # --- 3. Instalar (idempotente: si ya esta, no reinstala) ---------------

    if (Test-Path $tailscaleExe) {
        Write-Host "Tailscale ya esta instalado en $tailscaleExe -- no se reinstala."
        $resultado.yaEstabaInstalado = $true
    } else {
        Write-Host "Instalando Tailscale (silencioso, via msiexec)..."
        $proceso = Start-Process -FilePath "msiexec.exe" -ArgumentList @("/i", "`"$TailscaleInstallerPath`"", "/quiet", "/norestart") -Wait -PassThru
        if ($proceso.ExitCode -ne 0) {
            Salir -Code 3 -MensajeError "msiexec termino con exit code $($proceso.ExitCode)."
        }
        Start-Sleep -Seconds 3
        if (-not (Test-Path $tailscaleExe)) {
            Salir -Code 4 -MensajeError "No se encontro tailscale.exe en $tailscaleExe tras la instalacion."
        }
        $resultado.tailscaleInstalado = $true
        Write-Host "Tailscale instalado OK."
    }

    # --- 4. Unir la maquina a la tailnet ------------------------------------

    Write-Host "Uniendo la maquina a la tailnet..."
    $upArgs = @("up", "--authkey=$AuthKey", "--accept-routes")
    if ($Hostname) { $upArgs += "--hostname=$Hostname" }
    & $tailscaleExe @upArgs
    if ($LASTEXITCODE -ne 0) {
        Salir -Code 5 -MensajeError "'tailscale up' termino con exit code $LASTEXITCODE."
    }

    # --- 5. Confirmar que quedo online --------------------------------------

    Start-Sleep -Seconds 2
    $statusJson = & $tailscaleExe status --json
    $status = $statusJson | ConvertFrom-Json
    if (-not $status.Self.Online) {
        Salir -Code 6 -MensajeError "La maquina no aparece online tras 'tailscale up' -- revisar 'tailscale status' manualmente."
    }
    $resultado.conectado = $true
    $resultado.hostname = $status.Self.HostName
    $resultado.tailscaleIPs = $status.Self.TailscaleIPs

    Write-Host ""
    Write-Host "=== Resultado ==="
    Write-Host "Tailscale conectado como: $($status.Self.HostName)"
    Write-Host "IP Tailscale: $($status.Self.TailscaleIPs -join ', ')"
    Write-Host ""

    Salir -Code 0
} catch {
    Salir -Code 8 -MensajeError "Fallo inesperado no controlado en Install-Tailscale.ps1: $($_.Exception.Message)"
}
