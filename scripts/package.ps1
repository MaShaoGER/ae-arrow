$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$entryPath = Join-Path $projectDirectory 'dist\AE Arrow.jsx'
$installPath = Join-Path $projectDirectory 'docs\INSTALL.md'
if (-not (Test-Path -LiteralPath $entryPath)) { throw 'Build the standalone JSX first.' }
$entryText = [System.IO.File]::ReadAllText($entryPath)
$versionMatch = [regex]::Match($entryText, 'version: "([^"]+)"')
if (-not $versionMatch.Success) { throw 'Cannot find the built version.' }
$zipPath = Join-Path $projectDirectory ('dist\AE Arrow ' + $versionMatch.Groups[1].Value + '.zip')
Compress-Archive -LiteralPath @($entryPath, $installPath) -DestinationPath $zipPath -Force
Write-Output "Packaged: $zipPath"
