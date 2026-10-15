param([switch]$ThreeDOnly)
$ErrorActionPreference = 'Stop'
$rootDirectory = Split-Path -Parent $PSScriptRoot
$parts = @('#target aftereffects', '(function () {', ('var Arrow = { version: "0.6.0", test3DOnly: '+$ThreeDOnly.IsPresent.ToString().ToLower()+' };'))
foreach ($name in @('core.jsxinc','live-math.jsxinc','pseudo-legacy.jsxinc','pseudo.jsxinc','live-host.jsxinc','live-ui.jsxinc')) {
    $parts += [System.IO.File]::ReadAllText((Join-Path $rootDirectory "src\$name"))
}
$parts += [System.IO.File]::ReadAllText((Join-Path $rootDirectory 'tests\ae-live.jsxinc'))
$parts += '}());'
[System.IO.File]::WriteAllText((Join-Path $rootDirectory 'test-results\ae-live-tests.jsx'), ($parts -join "`r`n"), (New-Object System.Text.UTF8Encoding($true)))
Write-Output 'Built live test harness.'
