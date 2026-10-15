$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$parts = @('#target aftereffects', '(function () {', 'var Arrow = { version: "0.1.0" };')
foreach ($sourceName in @('core.jsxinc','host.jsxinc','ui.jsxinc')) {
    $parts += [System.IO.File]::ReadAllText((Join-Path (Join-Path $projectDirectory 'src') $sourceName), [System.Text.Encoding]::UTF8)
}
$parts += [System.IO.File]::ReadAllText((Join-Path $projectDirectory 'tests\ae-native.jsxinc'), [System.Text.Encoding]::UTF8)
$parts += '}());'
$outputDirectory = Join-Path $projectDirectory 'test-results'
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$utf8WithBom = New-Object System.Text.UTF8Encoding($true)
$outputPath = Join-Path $outputDirectory 'ae-native-tests.jsx'
[System.IO.File]::WriteAllText($outputPath, ($parts -join "`r`n"), $utf8WithBom)
Write-Output "Built native test harness: $outputPath"
