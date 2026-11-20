$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$appVersion = (Get-Content -LiteralPath (Join-Path $project 'package.json') -Raw | ConvertFrom-Json).version
if ($env:TSEKH_RELEASE_VERSION) { $appVersion = $env:TSEKH_RELEASE_VERSION }
if ($appVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Use an X.Y.Z release version.' }
$env:TSEKH_DESKTOP_BUILD = '1'
$apiBase = $env:NUXT_PUBLIC_LICENSE_API_BASE
if (-not $apiBase) { $apiBase = 'https://obshaya-programma-api.burhon-2001-tjk.workers.dev' }
$apiBase = $apiBase.TrimEnd('/')
if ($apiBase -notmatch '^(https://[a-zA-Z0-9.-]+(:\d+)?|http://127\.0\.0\.1:\d+)$') { throw 'Invalid desktop API URL.' }
& npm.cmd exec -- nuxt generate
if ($LASTEXITCODE -ne 0) { throw 'Nuxt generation failed.' }
$public = Join-Path $project '.output/public'
if (-not (Test-Path (Join-Path $public 'index.html'))) { throw 'Run Nuxt generate before packaging.' }

$version = '1.0.4129.50'
$package = Join-Path $env:TEMP "tsekh-webview2.$version.nupkg"
$url = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$version/microsoft.web.webview2.$version.nupkg"
$sqliteVersion = '1.0.119'
$sqliteCorePackage = Join-Path $env:TEMP "tsekh-sqlite-core.$sqliteVersion.nupkg"
$sqliteProviderPackage = Join-Path $env:TEMP "tsekh-sqlite-provider.$sqliteVersion.nupkg"
if (-not (Test-Path $sqliteCorePackage)) {
    Invoke-WebRequest -Uri "https://api.nuget.org/v3-flatcontainer/system.data.sqlite.core/$sqliteVersion/system.data.sqlite.core.$sqliteVersion.nupkg" -OutFile $sqliteCorePackage
}
if (-not (Test-Path $sqliteProviderPackage)) {
    Invoke-WebRequest -Uri "https://api.nuget.org/v3-flatcontainer/stub.system.data.sqlite.core.netframework/$sqliteVersion/stub.system.data.sqlite.core.netframework.$sqliteVersion.nupkg" -OutFile $sqliteProviderPackage
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
try { $sdk = [IO.Compression.ZipFile]::OpenRead($package) } catch {
    Invoke-WebRequest -Uri $url -OutFile $package
    $sdk = [IO.Compression.ZipFile]::OpenRead($package)
}
$sqliteCore = [IO.Compression.ZipFile]::OpenRead($sqliteCorePackage)
$sqliteProvider = [IO.Compression.ZipFile]::OpenRead($sqliteProviderPackage)
$tempRoot = [IO.Path]::GetFullPath($env:TEMP)
$stage = Join-Path $tempRoot ('tsekh-4-build-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
try {
    $core = Join-Path $stage 'Microsoft.Web.WebView2.Core.dll'
    $forms = Join-Path $stage 'Microsoft.Web.WebView2.WinForms.dll'
    $loader = Join-Path $stage 'WebView2Loader.dll'
    $license = Join-Path $stage 'WebView2-License.txt'
    $sqliteAssembly = Join-Path $stage 'System.Data.SQLite.dll'
    $sqliteNative = Join-Path $stage 'SQLite.Interop.dll'
    [IO.Compression.ZipFileExtensions]::ExtractToFile($sdk.GetEntry('lib/net462/Microsoft.Web.WebView2.Core.dll'), $core)
    [IO.Compression.ZipFileExtensions]::ExtractToFile($sdk.GetEntry('lib/net462/Microsoft.Web.WebView2.WinForms.dll'), $forms)
    [IO.Compression.ZipFileExtensions]::ExtractToFile($sdk.GetEntry('runtimes/win-x64/native/WebView2Loader.dll'), $loader)
    [IO.Compression.ZipFileExtensions]::ExtractToFile($sdk.GetEntry('LICENSE.txt'), $license)
    [IO.Compression.ZipFileExtensions]::ExtractToFile($sqliteProvider.GetEntry('lib/net40/System.Data.SQLite.dll'), $sqliteAssembly)
    [IO.Compression.ZipFileExtensions]::ExtractToFile($sqliteProvider.GetEntry('build/net40/x64/SQLite.Interop.dll'), $sqliteNative)
    $archive = Join-Path $stage 'renderer.zip'
    [IO.Compression.ZipFile]::CreateFromDirectory($public, $archive)

    $release = Join-Path $project 'release'
    if ($env:TSEKH_RELEASE_DIR) { $release = $env:TSEKH_RELEASE_DIR }
    New-Item -ItemType Directory -Path $release -Force | Out-Null
    $artifact = Join-Path $release "Tsekh-$appVersion-Windows-x64.exe"
    $framework = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
    $sources = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.cs' | Select-Object -ExpandProperty FullName
    $versionSource = Join-Path $stage 'Version.cs'
    @"
using System.Reflection;
[assembly: AssemblyFileVersion("$appVersion.0")]
[assembly: AssemblyVersion("$appVersion.0")]
internal static class DesktopConfig { internal const string ApiBase = "$apiBase"; }
"@ | Set-Content -LiteralPath $versionSource -Encoding UTF8
    $sources += $versionSource
    $salesSql = Join-Path $PSScriptRoot '../server/database/sales/queries.json'
    $bridge = Join-Path $PSScriptRoot 'bridge.js'
    & (Join-Path $framework 'csc.exe') /nologo /target:winexe /platform:x64 /optimize+ /codepage:65001 `
        /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:System.Data.dll /reference:System.IO.Compression.dll `
        "/reference:$core" "/reference:$forms" "/reference:$sqliteAssembly" "/resource:$core,Microsoft.Web.WebView2.Core.dll" "/resource:$forms,Microsoft.Web.WebView2.WinForms.dll" `
        "/resource:$sqliteAssembly,System.Data.SQLite.dll" "/resource:$sqliteNative,SQLite.Interop.dll" "/resource:$loader,WebView2Loader.dll" `
        "/resource:$salesSql,sales.json" "/resource:$archive,renderer.zip" "/resource:$bridge,bridge.js" "/resource:$license,WebView2-License.txt" "/out:$artifact" @sources
    if ($LASTEXITCODE -ne 0) { throw 'Windows application compilation failed.' }
    Get-Item -LiteralPath $artifact | Select-Object FullName, Length
} finally {
    $sdk.Dispose()
    $sqliteCore.Dispose()
    $sqliteProvider.Dispose()
    $resolved = (Resolve-Path -LiteralPath $stage).Path
    if ($resolved.StartsWith($tempRoot.TrimEnd('\') + '\tsekh-4-build-', [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
