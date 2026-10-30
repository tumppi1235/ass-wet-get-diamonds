param([switch]$Tests)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$compiler = Join-Path $projectRoot '.tools\garmin-sdk\bin\monkeyc.bat'
$keysDir = Join-Path $projectRoot '.keys'
New-Item -ItemType Directory -Force $keysDir | Out-Null
New-Item -ItemType Directory -Force (Join-Path $projectRoot 'dist') | Out-Null
$keyFile = Join-Path $keysDir 'garmin-developer.der'
if (-not (Test-Path $keyFile)) { $rsa=[System.Security.Cryptography.RSA]::Create(4096);try{[System.IO.File]::WriteAllBytes($keyFile,$rsa.ExportPkcs8PrivateKey())}finally{$rsa.Dispose()} }
$output = Join-Path $projectRoot ('dist\' + $(if ($Tests) {'TrailRelics-enduro3-tests.prg'} else {'TrailRelics-enduro3-v0.1.0.prg'}))
$arguments=@('-f',(Join-Path $PSScriptRoot 'monkey.jungle'),'-d','enduro3','-o',$output,'-y',$keyFile,'-w','-l','0')
if($Tests){$arguments+='-t'}else{$arguments+='-r'}
& $compiler @arguments
if ($LASTEXITCODE -ne 0) { throw 'Garmin build failed. Install the Enduro 3 device profile in Garmin SDK Manager and retry.' }
Write-Host "Built $output"
