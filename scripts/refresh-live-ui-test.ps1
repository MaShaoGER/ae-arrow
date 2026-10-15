$ErrorActionPreference='Stop'
$rootDirectory=Split-Path -Parent $PSScriptRoot
$parts=@('#target aftereffects','(function(){','var Arrow={version:"0.4.0"};')
foreach($name in @('core','live-math','pseudo-legacy','pseudo','live-host','live-ui')){$parts += [System.IO.File]::ReadAllText((Join-Path $rootDirectory "src\$name.jsxinc"))}
$parts += @'
var q=$.global.AEArrowLiveQA;
if(!q||q.Arrow.version!=="0.4.0"){throw new Error("Open the 0.4 UI fixture first.");}
q.comp.openInViewer();q.ui.close();q.Arrow=Arrow;Arrow.LiveHost.syncPoints(q.target);
q.ui=Arrow.LiveUI.open(null,{show:false});
function find(w,text){if(w.type==='button'&&w.text===text){return w;}if(w.children){for(var i=0;i<w.children.length;i++){var r=find(w.children[i],text);if(r){return r;}}}return null;}
Arrow.LiveHost.selectArrow(q.target);find(q.ui,'读取箭头').onClick();q.ui.location=[2100,200];q.ui.show();
}());
'@
[System.IO.File]::WriteAllText((Join-Path $rootDirectory 'test-results\refresh-ui-040.jsx'),($parts -join "`r`n"),(New-Object System.Text.UTF8Encoding($true)))
