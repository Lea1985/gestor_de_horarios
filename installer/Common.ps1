# Common.ps1
#
# Funciones compartidas por los scripts de installer/ (Preflight.ps1,
# Install-Postgres.ps1). Extraído desde Preflight.ps1 para no duplicar la
# lógica de elevación de administrador -- ese bloque ya pasó por tres rondas
# de bugs reales (Stop() prematuro sobre un TcpListener no iniciado,
# Write-Error convertido en excepción terminante por $ErrorActionPreference
# = "Stop", y la pérdida del JSON de salida al relanzarse elevado con
# -Verb RunAs) y no tiene sentido volver a escribirlo desde cero en cada
# script nuevo.
#
# Uso (dot-source al principio del script que lo necesite):
#   . (Join-Path $PSScriptRoot "Common.ps1")

function Test-Elevado {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-Elevado {
    # Relanza $ScriptPath elevado (un solo prompt de UAC), pasándole
    # $ExtraArgs tal cual -- el caller es quien conoce sus propios
    # parámetros y ya debe incluir en $ExtraArgs tanto "-Elevated" como
    # "-ResultFile `"<ruta>`"" (mismo valor que $ResultFile) para que el
    # hijo sepa que no debe volver a relanzarse y sepa dónde escribir su
    # resultado.
    #
    # -Verb RunAs abre una ventana elevada nueva: su stdout/JSON no vuelve
    # solo al proceso que invocó este script (Start-Process no permite
    # combinar -Verb con -RedirectStandardOutput). Por eso el contrato es:
    # el proceso hijo escribe su resultado en $ResultFile, y esta función
    # lo relee después de que el hijo termina.
    #
    # No llama a "exit" por sí misma -- devuelve un objeto con ExitCode,
    # Output (contenido de $ResultFile, o $null si el hijo no llegó a
    # escribirlo) y Cancelado (si el usuario rechazó el UAC o este falló).
    # El caller decide qué hacer con cada uno.
    param(
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [Parameter(Mandatory = $true)][string[]]$ExtraArgs,
        [Parameter(Mandatory = $true)][string]$ResultFile
    )

    $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$ScriptPath`"") + $ExtraArgs

    try {
        $proc = Start-Process powershell -ArgumentList $argList -Verb RunAs -Wait -PassThru
        $output = $null
        if (Test-Path $ResultFile) {
            $output = Get-Content $ResultFile -Raw
            Remove-Item $ResultFile -Force -ErrorAction SilentlyContinue
        }
        return [PSCustomObject]@{
            ExitCode  = $proc.ExitCode
            Output    = $output
            Cancelado = $false
            Mensaje   = $null
        }
    } catch {
        return [PSCustomObject]@{
            ExitCode  = 1
            Output    = $null
            Cancelado = $true
            Mensaje   = $_.Exception.Message
        }
    }
}

function Add-NodePortableAlPath {
    # Si existe una copia portable de Node.js en C:\ALNEXT\node (el .zip
    # oficial de nodejs.org descomprimido, sin instalar formalmente --
    # parte del paquete offline de ALNEXT, ver backlog #248), la antepone
    # a $env:PATH del proceso actual para que "node"/"npm"/"npx" invocados
    # por nombre (sin ruta completa) la encuentren -- Install-Database.ps1
    # en particular los invoca asi. Si ya hay una instalacion de Node en
    # el PATH del sistema (caso VM de pruebas / desarrollo), no la toca ni
    # la duplica.
    #
    # IMPORTANTE para quien llame a esto desde un script que se auto-eleva
    # (Install-ALNEXT.ps1, Install-AppService.ps1): tiene que llamarse
    # DESPUES del bloque de elevacion (Test-Elevado/Invoke-Elevado), nunca
    # antes -- un $env:PATH modificado en el proceso original se pierde al
    # relanzarse elevado via -Verb RunAs, porque ese es un proceso nuevo
    # que arranca leyendo el PATH del sistema/usuario desde cero, no
    # hereda el $env:PATH en memoria del proceso que lo lanzo.
    #
    # El cambio de $env:PATH que hace esta funcion solo dura mientras vive
    # este proceso de PowerShell y se hereda a los procesos hijo que
    # lance (los pasos del orquestador, prisma, next, etc.) -- no
    # persiste en el sistema ni afecta a otras consolas.
    param([string]$NodePortableDir = "C:\ALNEXT\node")

    $nodeExe = Join-Path $NodePortableDir "node.exe"
    if (-not (Test-Path $nodeExe)) {
        return
    }
    if ($env:PATH -split ";" -contains $NodePortableDir) {
        return
    }
    $env:PATH = "$NodePortableDir;$env:PATH"
    Write-Host "Node.js portable detectado en $NodePortableDir -- agregado al PATH de este proceso."
}
