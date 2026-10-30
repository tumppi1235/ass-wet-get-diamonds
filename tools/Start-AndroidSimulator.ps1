param([switch]$Build)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$sdkRoot=Join-Path $projectRoot '.tools\android-sdk'
$env:ANDROID_HOME=$sdkRoot
$env:ANDROID_SDK_ROOT=$sdkRoot
$env:ANDROID_AVD_HOME=Join-Path $projectRoot '.tools\android-avd'
$adb=Join-Path $sdkRoot 'platform-tools\adb.exe'
$emulator=Join-Path $sdkRoot 'emulator\emulator.exe'
if(!(Test-Path $emulator)){throw 'Android emulator is not installed. See docs/SIMULATORS.md.'}
if($Build){& (Join-Path $projectRoot 'android\build.ps1')}
$apk=Join-Path $projectRoot 'dist\TrailRelics-android-v0.2.0.apk'
$device='emulator-5554'
$running=& $adb devices
if(-not ($running -match 'emulator-5554\s+device')){
    Start-Process -FilePath $emulator -ArgumentList @('-avd','TrailRelics_API35','-port','5554','-no-snapshot-load','-no-boot-anim','-gpu','swiftshader','-memory','2048') -WindowStyle Normal -RedirectStandardOutput (Join-Path $projectRoot '.tools\android-emulator.log') -RedirectStandardError (Join-Path $projectRoot '.tools\android-emulator-error.log') | Out-Null
}
Write-Host 'Waiting for the Android virtual phone to finish booting...'
$deadline=(Get-Date).AddMinutes(4)
do {
    $boot=& $adb -s $device shell getprop sys.boot_completed 2>$null
    if($boot -match '1'){break}
    Start-Sleep -Seconds 2
}while((Get-Date) -lt $deadline)
if($boot -notmatch '1'){throw 'The emulator did not finish booting. Check .tools/android-emulator-error.log.'}
& $adb -s $device install -r $apk
if($LASTEXITCODE -ne 0){throw 'APK installation failed'}
& $adb -s $device shell am start -n fi.trailrelics.app/.MainActivity
Write-Host 'Trail Relics is open. Tap Start GPS and allow precise location. Use the emulator Location controls to test walking.'
