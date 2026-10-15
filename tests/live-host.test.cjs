'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),scope=vm.createContext({});
vm.runInContext('var Arrow={};',scope);
for(const name of ['core','live-math','live-host'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.jsxinc'),'utf8'),scope);
const A=scope.Arrow,report={environment:'Node mocked AE host and expression evaluation',passed:0,failed:0,cases:[]};
function test(name,fn){try{fn();report.passed++;report.cases.push({name,status:'pass'});console.log('PASS '+name);}catch(e){report.failed++;report.cases.push({name,status:'fail',error:e.stack});console.error(e);}}
function near(a,b){assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);}
const plain=x=>JSON.parse(JSON.stringify(x));
const descriptor={path:'L.content("Outer").content("Inner").content("Path").path',groups:['L.content("Outer").content("Inner").transform','L.content("Outer").transform'],pointCount:3};
const shape={points:()=>[[-20,10],[100,90],[240,-50]],inTangents:()=>[[0,0],[-20,30],[-40,10]],outTangents:()=>[[30,-10],[40,20],[0,0]]};
const inner={anchorPoint:[10,15],position:[-50,80],rotation:32,scale:[125,65]},outer={anchorPoint:[5,-9],position:[130,60],rotation:-21,scale:[-80,140]};
const src={content:name=>name==='Outer'?{transform:outer,content:()=>({transform:inner,content:()=>({path:shape})})}:null,toComp:p=>[p[0]+350,p[1]-120]};
let points=[];
const owner={index:10,effect:name=>()=>name==='AA Source'?src:points[Number(name.slice(9))-1],fromComp:p=>[p[0]-18,p[1]+25]};
function evaluate(baseOnly){scope.owner=owner;for(const C of points){if(C&&!C.effect)C.effect=()=>()=>owner;}return vm.runInContext(A.LiveHost.sourceHeader(descriptor,'owner',baseOnly)+'\n({v:v,it:it,ot:ot,path:path});',scope);}
test('Point frames read the source without depending on point controllers',()=>{const r=evaluate(true);assert.equal(r.v.length,3);assert.ok(r.path.total>0);});
test('Zero offsets preserve nested transforms and noncentral coordinates',()=>{const baseline=plain(evaluate(true));points=baseline.v.map(p=>({anchorPoint:[50,50],toComp:()=>[p[0]+18,p[1]-25]}));const r=plain(evaluate(false));assert.deepEqual(r.v,baseline.v);assert.deepEqual(r.it,baseline.it);assert.deepEqual(r.ot,baseline.ot);});
test('Moving multiple point nulls replaces vertices and preserves all tangent vectors',()=>{const baseline=plain(evaluate(true));points=baseline.v.map((p,i)=>({anchorPoint:[50,50],toComp:()=>[p[0]+18+i*12,p[1]-25-i*9]}));const r=plain(evaluate(false));for(let i=0;i<3;i++){near(r.v[i][0],baseline.v[i][0]+i*12);near(r.v[i][1],baseline.v[i][1]-i*9);}assert.deepEqual(r.it,baseline.it);assert.deepEqual(r.ot,baseline.ot);});
test('Deleted controller falls back to source without breaking the arrow expression',()=>{const baseline=plain(evaluate(true));points=[undefined,undefined,undefined];assert.deepEqual(plain(evaluate(false)).v,baseline.v);});
test('Stale point binding to another layer falls back to source instead of its anchor',()=>{const baseline=plain(evaluate(true));points=[{anchorPoint:[0,0],toComp:()=>[0,0],effect:()=>()=>({index:99})}];assert.deepEqual(plain(evaluate(false)).v,baseline.v);points=[];});
test('Changed source vertex count is bounded by available point controls',()=>{const old=shape.points;shape.points=()=>[[-20,10],[100,90]];points=[];try{assert.equal(evaluate(false).v.length,2);}finally{shape.points=old;}});
test('Single null expression combines transformed source and editable offsets',()=>{scope.value=[12,-9];const baseline=plain(evaluate(true));const moved=plain(vm.runInContext(A.LiveHost.pointExpression(descriptor,1).replace("effect('AA Owner')(1)",'owner'),scope));near(moved[0],baseline.v[1][0]+12);near(moved[1],baseline.v[1][1]-9);});
test('Three dimensional source and point transforms use world space, independent of camera projection',()=>{
  const d={...descriptor,space:'world'};
  const turn=p=>[p[0]*.6-(p[2]||0)*.8+350,p[1]-120,p[0]*.8+(p[2]||0)*.6+400];
  const inverse=p=>[(p[0]-350)*.6+(p[2]-400)*.8,p[1]+120,-(p[0]-350)*.8+(p[2]-400)*.6];
  const L={...src,toWorld:turn,toComp:()=>assert.fail('Camera projection must not be used')};
  let controls=[];
  scope.spatialOwner={index:10,effect:name=>()=>name==='AA Source'?L:controls[Number(name.slice(9))-1],fromWorld:inverse,fromComp:()=>assert.fail('Camera projection must not be used')};
  const run=base=>plain(vm.runInContext(A.LiveHost.sourceHeader(d,'spatialOwner',base)+'\n({v:v,it:it,ot:ot});',scope));
  const baseline=run(true);
  controls=baseline.v.map((p,i)=>({anchorPoint:[50,50,0],effect:()=>()=>scope.spatialOwner,toWorld:()=>turn([p[0]+i*12,p[1]-i*9,0])}));
  const moved=run(false);
  for(let i=0;i<3;i++){near(moved.v[i][0],baseline.v[i][0]+i*12);near(moved.v[i][1],baseline.v[i][1]-i*9);}
  for(let i=0;i<3;i++)for(let j=0;j<2;j++){near(moved.it[i][j],baseline.it[i][j]);near(moved.ot[i][j],baseline.ot[i][j]);}
  scope.value=[12,-9,80];
  const pos=plain(vm.runInContext(A.LiveHost.pointExpression(d,1).replace("effect('AA Owner')(1)",'spatialOwner'),scope));
  near(pos[0],baseline.v[1][0]+12);near(pos[1],baseline.v[1][1]-9);assert.equal(pos[2],0);
});
test('Generated parameters preserve integer types and independent neck dimensions',()=>{const values={width:8,startType:1,endType:2,startLength:55,startWidth:90,endLength:49,endWidth:60,startDepth:36,endDepth:24,notch:35};scope.R={effect:name=>()=>values[name.slice(3).replace(/ ([a-z])/gi,(_,c)=>c).replace(/^./,c=>c.toLowerCase())]};const p=plain(vm.runInContext(A.LiveHost.parameters()+'\np;',scope));assert.equal(p.startType,1);assert.equal(p.endType,2);assert.equal(p.endLength,49);near(p.notch,.35);});

// Mock only the native command boundary; verify selection state and protection without opening a modal dialog.
class CompItem{constructor(){this.id=10;this.items=[];this.selectedProperties=[];}get numLayers(){return this.items.length;}layer(i){return this.items[i-1];}get selectedLayers(){return this.items.filter(l=>l.selected);}}
scope.CompItem=CompItem;
const comp=new CompItem(),color={value:[.2,.65,1,1],numKeys:0,expression:'',selected:false};
const arrow={id:30,selected:false,locked:false,containingComp:comp,comment:'[[AE_ARROW_LIVE_V2:'+encodeURIComponent(JSON.stringify({controls:'sliders'}))+']]',property:()=>({property:()=>({property:()=>color})})};
const selectedProp={selected:true},other={id:31,selected:true};comp.items=[arrow,other];comp.selectedProperties=[selectedProp];
let commands=[];
scope.app={project:{activeItem:comp},executeCommand:id=>{commands.push(id);assert.equal(arrow.selected,true);assert.equal(color.selected,true);assert.equal(other.selected,false);assert.equal(selectedProp.selected,false);color.value=[1,.25,.1,1];}};
const target={compId:10,layerId:30};
test('Native picker selects the Color Control, dispatches Edit Value and restores selection',()=>{assert.deepEqual(plain(A.LiveHost.pickColor(target)),[1,.25,.1,1]);assert.deepEqual(commands,[2240]);assert.equal(other.selected,true);assert.equal(arrow.selected,false);assert.equal(selectedProp.selected,true);assert.equal(color.selected,false);assert.equal(comp.numLayers,2);});
test('Native picker cancellation preserves color and selection',()=>{commands=[];const before=[...color.value];scope.app.executeCommand=id=>commands.push(id);assert.deepEqual(plain(A.LiveHost.pickColor(target)),before);assert.deepEqual(commands,[2240]);assert.equal(other.selected,true);assert.equal(selectedProp.selected,true);});
test('Native picker command errors still restore original selection',()=>{scope.app.executeCommand=()=>{throw Error('Native command failed');};assert.throws(()=>A.LiveHost.pickColor(target),/Native command failed/);assert.equal(arrow.selected,false);assert.equal(other.selected,true);assert.equal(selectedProp.selected,true);assert.equal(color.selected,false);});
test('Animated or expression-driven colors are protected before dispatch',()=>{scope.app.executeCommand=()=>assert.fail('Picker should not open');color.numKeys=1;assert.throws(()=>A.LiveHost.pickColor(target),/动画/);color.numKeys=0;color.expression='value';assert.throws(()=>A.LiveHost.pickColor(target),/表达式/);color.expression='';});
test('Locked arrow rejects native picker without changing selection',()=>{arrow.locked=true;assert.throws(()=>A.LiveHost.pickColor(target),/锁定/);arrow.locked=false;assert.equal(other.selected,true);});
fs.writeFileSync(path.join(root,'test-results','live-host-tests.json'),JSON.stringify(report,null,2));
if(report.failed)process.exitCode=1;
