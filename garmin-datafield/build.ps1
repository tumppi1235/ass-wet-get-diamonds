param([switch]$Tests,[switch]$SourceOnly)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$java=Join-Path $repo '.tools/jdk/jdk-17.0.20.1+1/bin/java.exe'
$compiler=Join-Path $repo '.tools/garmin-sdk/bin/monkeybrains.jar'
$key=Join-Path $repo '.keys/garmin-developer.der'
if(!(Test-Path -LiteralPath $key)){throw 'Existing developer key is missing. Run the original authorized Garmin build setup first.'}
$out=Join-Path $repo '.tools/dev-releases'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$filename=if($SourceOnly -and $Tests){'TrailRelics-field-GENERIC-tests-NOT-INSTALLABLE.prg'}elseif($SourceOnly){'TrailRelics-field-GENERIC-NOT-INSTALLABLE.prg'}elseif($Tests){'TrailRelics-Enduro3-field-dev-tests.prg'}else{'TrailRelics-Enduro3-field-dev.prg'}
$argsList=@('-Xms1g','-Dfile.encoding=UTF-8','-cp',$compiler,'com.garmin.monkeybrains.Monkeybrains','-f',(Join-Path $PSScriptRoot 'monkey.jungle'),'-o',(Join-Path $out $filename),'-y',$key,'-w','-l','1')
if(!$SourceOnly){$argsList+=@('-d','enduro3')}
if($Tests){$argsList+='-t'}else{$argsList+='-r'}
& $java @argsList
if($LASTEXITCODE -ne 0){throw 'Data-field build failed. An installable Enduro 3 file also requires its official device profile.'}
if($SourceOnly){Write-Host 'Generic source compile only. This file is NOT suitable for watch installation or a claim of executed device tests.'}else{Write-Host "Built $out/$filename. Physical Enduro 3 validation remains pending."}
