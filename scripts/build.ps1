param([string]$OutputDirectory = '')
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $projectDirectory 'dist'
}
& python (Join-Path $PSScriptRoot 'build-pseudo.py')
if ($LASTEXITCODE -ne 0) { throw 'Pseudo effect build failed.' }
$sourceNames = @('core.jsxinc', 'live-math.jsxinc', 'pseudo-legacy.jsxinc', 'pseudo.jsxinc', 'live-host.jsxinc', 'live-ui.jsxinc')
$parts = @(
    '#target aftereffects',
    '/* AE Arrow 0.6.0 — generated from src/*.jsxinc; edit sources, then rebuild. */',
    '(function (thisObj) {',
    '    var Arrow = { version: "0.6.0" };'
)
foreach ($sourceName in $sourceNames) {
    $sourcePath = Join-Path (Join-Path $projectDirectory 'src') $sourceName
    $parts += [System.IO.File]::ReadAllText($sourcePath, [System.Text.Encoding]::UTF8)
}
$parts += '    Arrow.LiveUI.open(thisObj);'
$parts += '}(this));'
[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$outputPath = Join-Path $OutputDirectory 'AE Arrow.jsx'
$utf8WithBom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($outputPath, ($parts -join "`r`n"), $utf8WithBom)
Write-Output "Built: $outputPath"
