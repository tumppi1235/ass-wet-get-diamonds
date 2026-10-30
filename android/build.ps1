$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$jdkBin = Join-Path $projectRoot '.tools\jdk\jdk-17.0.20.1+1\bin'
$buildTools = Join-Path $projectRoot '.tools\android-build\android-15'
$platformJar = Join-Path $projectRoot '.tools\android-platform\android-35\android.jar'
$buildDir = Join-Path $PSScriptRoot 'build'
$keysDir = Join-Path $projectRoot '.keys'
$distDir = Join-Path $projectRoot 'dist'
foreach ($folder in @($buildDir,(Join-Path $buildDir 'classes'),(Join-Path $buildDir 'dex'),$keysDir,$distDir)) { New-Item -ItemType Directory -Force $folder | Out-Null }
function Run-Tool($program, $arguments) { & $program @arguments; if ($LASTEXITCODE -ne 0) { throw "Build step failed: $program" } }
Copy-Item -LiteralPath (Join-Path $projectRoot 'public\engine.js') -Destination (Join-Path $PSScriptRoot 'assets\engine.js') -Force
Run-Tool (Join-Path $jdkBin 'javac.exe') @('-encoding','UTF-8','-source','8','-target','8','-classpath',$platformJar,'-d',(Join-Path $buildDir 'classes'),(Join-Path $PSScriptRoot 'src\fi\trailrelics\app\MainActivity.java'))
Run-Tool (Join-Path $jdkBin 'jar.exe') @("-J-Djava.io.tmpdir=$buildDir",'cf',(Join-Path $buildDir 'classes.jar'),'-C',(Join-Path $buildDir 'classes'),'.')
Run-Tool (Join-Path $jdkBin 'java.exe') @('-cp',(Join-Path $buildTools 'lib\d8.jar'),'com.android.tools.r8.D8','--lib',$platformJar,'--min-api','26','--output',(Join-Path $buildDir 'dex'),(Join-Path $buildDir 'classes.jar'))
Run-Tool (Join-Path $buildTools 'aapt2.exe') @('link','-o',(Join-Path $buildDir 'unsigned.apk'),'--manifest',(Join-Path $PSScriptRoot 'AndroidManifest.xml'),'-I',$platformJar,'-A',(Join-Path $PSScriptRoot 'assets'))
Add-Type -AssemblyName System.IO.Compression.FileSystem
$apk = [System.IO.Compression.ZipFile]::Open((Join-Path $buildDir 'unsigned.apk'),[System.IO.Compression.ZipArchiveMode]::Update)
try { [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($apk,(Join-Path $buildDir 'dex\classes.dex'),'classes.dex') | Out-Null } finally { $apk.Dispose() }
Run-Tool (Join-Path $buildTools 'zipalign.exe') @('-f','-p','4',(Join-Path $buildDir 'unsigned.apk'),(Join-Path $buildDir 'aligned.apk'))
$keyFile = Join-Path $keysDir 'android-alpha.keystore'
if (-not (Test-Path $keyFile)) {
    Run-Tool (Join-Path $jdkBin 'keytool.exe') @('-genkeypair','-keystore',$keyFile,'-alias','trailrelics','-keyalg','RSA','-keysize','2048','-validity','10000','-storepass','androidalpha','-keypass','androidalpha','-dname','CN=Trail Relics Local Alpha')
}
$outputApk = Join-Path $distDir 'TrailRelics-android-v0.2.0.apk'
Run-Tool (Join-Path $jdkBin 'java.exe') @('-jar',(Join-Path $buildTools 'lib\apksigner.jar'),'sign','--ks',$keyFile,'--ks-key-alias','trailrelics','--ks-pass','pass:androidalpha','--key-pass','pass:androidalpha','--out',$outputApk,(Join-Path $buildDir 'aligned.apk'))
Run-Tool (Join-Path $jdkBin 'java.exe') @('-jar',(Join-Path $buildTools 'lib\apksigner.jar'),'verify','--verbose',$outputApk)
Run-Tool (Join-Path $buildTools 'aapt2.exe') @('dump','badging',$outputApk)
Write-Host "Built $outputApk"
