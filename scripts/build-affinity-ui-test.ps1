$ErrorActionPreference='Stop'
$rootDirectory=Split-Path -Parent $PSScriptRoot
$parts=@('#target aftereffects','(function(){','var Arrow={version:"0.5.0"};')
foreach($name in @('core','live-math','pseudo-legacy','pseudo','live-host','live-ui')){$parts += [System.IO.File]::ReadAllText((Join-Path $rootDirectory "src\$name.jsxinc"))}
$parts += [System.IO.File]::ReadAllText((Join-Path $rootDirectory 'tests\affinity-ui-setup.jsxinc'))
$parts += '}());'
[System.IO.File]::WriteAllText((Join-Path $rootDirectory 'test-results\affinity-ui-setup.jsx'),($parts -join "`r`n"),(New-Object System.Text.UTF8Encoding($true)))
