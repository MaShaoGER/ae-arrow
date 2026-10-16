'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+'\n'+e.message);}}
function load(){const s=vm.createContext({});vm.runInContext('var Arrow={};',s);for(const n of ['core','live-math','live-host'])vm.runInContext(fs.readFileSync(path.join(root,'src',n+'.jsxinc'),'utf8'),s);return s;}
const plain=v=>JSON.parse(JSON.stringify(v));
function near(a,b,tolerance=1e-6){assert.ok(Math.abs(a-b)<=tolerance,a+' != '+b);}
const legacy={width:8,startType:1,endType:1,startLength:55,endLength:55,startWidth:90,endWidth:90,startDepth:36,endDepth:36,notch:.35};
const affinity={affinity:true,width:8,startType:0,endType:1,startWidth:72,endWidth:72,startLength:50,endLength:50,startProportional:true,endProportional:true,startInset:0,endInset:0,startThickness:10,endThickness:10,startVLength:50,endVLength:50,startSquareIndent:25,endSquareIndent:25,startTailIndent:0,endTailIndent:0};

// Reintroducing uniform samples for a zero-handle line must fail the cost bound.
test('A 256-vertex zero-handle polyline needs one arc entry per segment',()=>{
  const M=load().Arrow.LiveMath,v=Array.from({length:256},(_,i)=>[i*10,i%2?20:0]),z=v.map(()=>[0,0]),p=M.build(v,z,z);
  assert.equal(p.table.length,256);
  near(p.total,255*Math.sqrt(500));
});
test('Straight trimming inverts the original nonuniform cubic parameter',()=>{
  const M=load().Arrow.LiveMath,p=M.build([[0,0],[700,0]],[[0,0],[0,0]],[[0,0],[0,0]]);
  for(const f of [.001,.01,.1,.25,.5,.9,.999])near(M.frame(p,f).point[0],700*f);
  const b=M.trim(p,54,646);near(b.vertices[0][0],54);near(b.vertices[1][0],646);
});
test('Mixed straight and curved segments preserve joins and exact straight distances',()=>{
  const M=load().Arrow.LiveMath,p=M.build([[0,0],[100,0],[200,100],[300,100]],[[0,0],[0,0],[-30,0],[0,0]],[[0,0],[30,0],[0,0],[0,0]]);
  near(M.frame(p,50/p.total).point[0],50);
  near(M.frame(p,(p.total-50)/p.total).point[0],250);
  near(M.frame(p,100/p.total).point[0],100);
  const b=M.trim(p,30,p.total-30);near(b.vertices[0][0],30);near(b.vertices.at(-1)[0],270);
});
test('Endpoint-only generation returns the hand-checked legacy head',()=>{
  const M=load().Arrow.LiveMath,p=M.build([[0,0],[700,0]],[[0,0],[0,0]],[[0,0],[0,0]]);
  assert.deepEqual(plain(M.generate(p,legacy,'end')).vertices,[[700,0],[664,45],[645,4],[645,-4],[664,-45]]);
  assert.deepEqual(plain(M.generate(p,legacy,'start')).vertices,[[0,0],[36,-45],[55,-4],[55,4],[36,45]]);
  const body=M.generate(p,legacy,'body');near(body.vertices[0][0],54);near(body.vertices.at(-1)[0],646);
});
test('An Affinity endpoint does not visit interior curves to build an unused shaft',()=>{
  const M=load().Arrow.LiveMath,v=Array.from({length:20},(_,i)=>[i*100,0]),z=v.map(()=>[0,0]),p=M.build(v,z,z);
  let interiorReads=0;
  for(let i=1;i<p.curves.length-1;i++){const c=p.curves[i];Object.defineProperty(p.curves,i,{get(){interiorReads++;return c;}});}
  const end=M.generate(p,affinity,'end');
  assert.deepEqual(plain(end).vertices,[[1900,0],[1864,36],[1864,4],[1864,-4],[1864,-36]]);
  assert.equal(interiorReads,0);
});

function expressionFixture(space){
  const s=load(),d={path:'L.path',groups:[],pointCount:2,pointMode:'single',space},effects={};
  const source={path:{points:()=>[[0,0],[700,0]],inTangents:()=>[[0,0],[0,0]],outTangents:()=>[[0,0],[0,0]]},toComp:p=>p,toWorld:p=>p};
  const owner={index:10,effect:n=>()=>n==='AA Source'?source:effects[n],fromComp:p=>p,fromWorld:p=>p};
  effects['AA Point 1']={hasParent:true,parent:owner,transform:{position:[9,11,0]},effect:()=>()=>owner};
  effects['AA Point 2']={hasParent:true,parent:owner,transform:{position:[715,-4,0]},effect:()=>()=>owner};
  s.owner=owner;s.thisLayer=owner;s.effect=owner.effect;s.createPath=(v,it,ot,closed)=>({vertices:v,inTangents:it,outTangents:ot,closed});
  return {s,d,source,owner,effects};
}
test('Single-null coordinates use parent-local Position without a world round trip',()=>{
  for(const space of [undefined,'world']){
    const {s,d}=expressionFixture(space);
    const r=vm.runInContext(s.Arrow.LiveHost.sourceHeader(d,'owner')+'\n({v:v,it:it,ot:ot});',s);
    assert.deepEqual(plain(r).v,[[9,11],[715,-4]]);
    assert.deepEqual(plain(r).it,[[0,0],[0,0]]);
  }
});
test('Reparented controls still use their full coordinate conversion',()=>{
  const {s,d,effects}=expressionFixture();
  effects['AA Point 1']={hasParent:true,parent:{index:99},anchorPoint:[50,50],effect:()=>()=>s.owner,toComp:()=>[25,40]};
  const r=vm.runInContext(s.Arrow.LiveHost.sourceHeader(d,'owner')+'\nv;',s);
  assert.deepEqual(plain(r)[0],[25,40]);
});
test('Nested group transforms are read once per expression while preserving coordinates',()=>{
  const s=load();let reads=0;
  function group(a,p,scale,rotation){return {anchorPoint:a,position:p,scale,get rotation(){reads++;return rotation;}};}
  const inner=group([10,0],[5,8],[200,50],90),outer=group([0,0],[-20,30],[-100,200],0);
  const shape={points:()=>[[10,0],[20,40]],inTangents:()=>[[0,0],[0,0]],outTangents:()=>[[0,0],[0,0]]};
  const source={path:shape,inner,outer,toComp:p=>[p[0]+100,p[1]+200]};
  s.owner={effect:()=>()=>source,fromComp:p=>[p[0]-30,p[1]-50]};
  const r=plain(vm.runInContext(s.Arrow.LiveHost.sourceHeader({path:'L.path',groups:['L.inner','L.outer']},'owner',true)+'\nv;',s));
  near(r[0][0],45);near(r[0][1],196);near(r[1][0],65);near(r[1][1],236);
  assert.equal(reads,2);
});
test('An absent head follows its endpoint without reading tangents or integrating the path',()=>{
  const {s,d,source,effects}=expressionFixture();
  assert.equal(typeof s.Arrow.LiveHost.pathExpression,'function');
  source.path.inTangents=()=>{throw Error('An absent head must not read tangents');};
  source.path.outTangents=source.path.inTangents;
  effects['AA End Type']=0;
  const text=s.Arrow.LiveHost.pathExpression(null,d,'End');
  const end=plain(vm.runInContext(text,s));
  assert.deepEqual(end,{vertices:[[715,-4],[715,-4]],inTangents:[[0,0],[0,0]],outTangents:[[0,0],[0,0]],closed:false});
});
test('A generated expression continues to follow animated source and point values',()=>{
  const {s,d,source,effects}=expressionFixture('world');
  assert.equal(typeof s.Arrow.LiveHost.pathExpression,'function');
  effects['AA End Type']=0;
  const text=s.Arrow.LiveHost.pathExpression(null,d,'End');
  for(const time of [0,.5,1,2]){
    source.path.points=()=>[[0,0],[700+time*100,time*20]];
    effects['AA Point 2'].transform.position=[715+time*100,-4+time*20,0];
    const r=plain(vm.runInContext(text,s));near(r.vertices[0][0],715+time*100);near(r.vertices[0][1],-4+time*20);
  }
});
test('An active Affinity path expression uses the real pseudo-effect indices',()=>{
  const {s,d,owner,effects}=expressionFixture();
  for(const name of ['pseudo-legacy','pseudo'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.jsxinc'),'utf8'),s);
  const A=s.Arrow,encoded={};
  for(const key in A.Pseudo.indices)encoded[A.Pseudo.indices[key]]=A.Pseudo.encodedValue(key,affinity[key]);
  const original=owner.effect;
  owner.effect=n=>n===A.Pseudo.title?i=>encoded[i]:original(n);s.effect=owner.effect;
  effects['AA Point 1'].transform.position=[0,0,0];effects['AA Point 2'].transform.position=[700,0,0];
  const layer={property:()=>({numProperties:1,property:()=>({matchName:A.Pseudo.matchName})})};
  const end=plain(vm.runInContext(A.LiveHost.pathExpression(layer,d,'End'),s));
  assert.deepEqual(end.vertices,[[700,0],[664,36],[664,4],[664,-4],[664,-36]]);
  const body=plain(vm.runInContext(A.LiveHost.pathExpression(layer,d,'Body'),s));
  near(body.vertices[0][0],0);near(body.vertices.at(-1)[0],664.4);
  const start=plain(vm.runInContext(A.LiveHost.pathExpression(layer,d,'Start'),s));
  assert.deepEqual(start.vertices,[[0,0],[0,0]]);
});
test('Collapsed segments keep exact arc positions on adjacent straight segments',()=>{
  const M=load().Arrow.LiveMath,p=M.build([[0,0],[0,0],[100,0],[100,0],[200,0]],Array(5).fill([0,0]),Array(5).fill([0,0]));
  for(const distance of [0,.001,50,100,100.001,150,200])near(M.frame(p,distance/200).point[0],distance);
});

function legacyPoint(d,index){
  return "var R=effect('AA Owner')(1);\nvar L=R.effect('AA Source')(1);\nvar P="+d.path+";\nfunction xy(p){var x=p[0],y=p[1],T,a,s,r,c,z,v;\nvar v=R.fromComp(L.toComp([x,y]));return [v[0],v[1]];}\nvar vs=P.points(),p=xy(vs[Math.min("+index+",vs.length-1)]);[p[0]+value[0],p[1]+value[1]];";
}
function hostFixture(){
  const s=load(),d={kind:'mask',label:'Source',path:'L.mask("Source").maskPath',groups:[],pointCount:2,pointMode:'single'};
  const paths={},positions=[],values={};let writes=0,begins=0,ends=0,failOnce=false;
  function prop(text){let value=text;return {name:'Path / Position',parentProperty:{name:'Arrow'},numKeys:0,expressionEnabled:true,expressionError:'',get expression(){return value;},set expression(v){writes++;value=v;this.expressionEnabled=!!v;if(failOnce&&writes===2){failOnce=false;throw Error('injected expression install failure');}},setValue(){throw Error('Do not write keyframe values');}};}
  for(const name of ['Body','Start','End'])paths[name]=prop('previous '+name);
  const keys={width:'AA Width',startType:'AA Start Type',endType:'AA End Type',startLength:'AA Start Length',startWidth:'AA Start Width',startAngle:'AA Start Angle',endLength:'AA End Length',endWidth:'AA End Width',endAngle:'AA End Angle',startDepth:'AA Start Depth',endDepth:'AA End Depth',notch:'AA Notch',color:'AA Color',dashed:'AA Dashed',dash:'AA Dash',gap:'AA Gap'};
  const params={...s.Arrow.LiveHost.defaults()};
  for(const key in keys)values[keys[key]]={property:()=>({value:params[key]})};
  const owner={id:100,index:1,name:'Arrow',locked:false,comment:'[[AE_ARROW_LIVE_V2:'+encodeURIComponent(JSON.stringify({controls:'sliders',descriptor:d}))+']]'};
  const source={id:103,index:4,property:()=>({property:()=>({property:()=>({value:{vertices:[[0,0],[700,0]]}})})})};
  const handles=[0,1].map((i)=>{
    const position=prop(legacyPoint(d,i));position.numKeys=2;position.keyValue=n=>n===1?[10,20]:[30,40];positions.push(position);
    return {id:101+i,index:2+i,parent:owner,locked:false,property:n=>n==='ADBE Transform Group'?{property:()=>position}:{property:()=>({property:()=>({value:1})})}};
  });
  values['AA Source']={property:()=>({value:4})};
  handles.forEach((h,i)=>values['AA Point '+(i+1)]={property:()=>({value:h.index})});
  const partGroups={};
  for(const name of ['Body','Start','End'])partGroups[name]={property:()=>({property:()=>paths[name]})};
  const rootGroup={property:()=>({property:name=>({property:()=>partGroups[name]})})};
  owner.property=n=>n==='ADBE Root Vectors Group'?{property:()=>rootGroup}:{property:n=>values[n]||null};
  class CompItem{constructor(){this.id=5;this.items=[owner,...handles,source];}get numLayers(){return this.items.length;}layer(i){return this.items[i-1];}}
  const comp=new CompItem();for(const layer of comp.items)layer.containingComp=comp;
  s.CompItem=CompItem;s.app={project:{activeItem:comp},beginUndoGroup(){begins++;},endUndoGroup(){ends++;}};
  return {s,d,owner,paths,positions,handles,comp,target:{compId:5,layerId:100},stats:()=>({writes,begins,ends}),injectFailure(){failOnce=true;}};
}
test('Updating an existing arrow preserves Position keys, styles and the layer count',()=>{
  const f=hostFixture(),A=f.s.Arrow;
  assert.equal(typeof A.LiveHost.optimize,'function');
  const before=f.positions.map(p=>[p.keyValue(1),p.keyValue(2)]),result=A.LiveHost.optimize(f.target);
  assert.equal(result.pointCount,2);assert.equal(f.comp.numLayers,4);
  assert.deepEqual(f.positions.map(p=>[p.keyValue(1),p.keyValue(2)]),before);
  assert.equal(f.stats().begins,1);assert.equal(f.stats().ends,1);
  assert.ok(f.positions.every(p=>p.expression!==legacyPoint(f.d,f.positions.indexOf(p))));
});
test('Updating twice does not rewrite unchanged expressions',()=>{
  const f=hostFixture();assert.equal(typeof f.s.Arrow.LiveHost.optimize,'function');
  f.s.Arrow.LiveHost.optimize(f.target);const first=f.stats().writes;
  f.s.Arrow.LiveHost.optimize(f.target);assert.equal(f.stats().writes,first);
});
test('Updating preserves a custom control-point expression',()=>{
  const f=hostFixture();assert.equal(typeof f.s.Arrow.LiveHost.optimize,'function');
  f.positions[0].expression='value + [42, 17]';
  f.s.Arrow.LiveHost.optimize(f.target);assert.equal(f.positions[0].expression,'value + [42, 17]');
});
test('A failed update restores all previous expressions and closes its undo group',()=>{
  const f=hostFixture();assert.equal(typeof f.s.Arrow.LiveHost.optimize,'function');
  const before=[...Object.values(f.paths),...f.positions].map(p=>p.expression),comment=f.owner.comment;
  f.injectFailure();assert.throws(()=>f.s.Arrow.LiveHost.optimize(f.target),/injected/);
  assert.deepEqual([...Object.values(f.paths),...f.positions].map(p=>p.expression),before);
  assert.equal(f.owner.comment,comment);assert.equal(f.stats().ends,1);
});
test('Updating preserves a disabled generated follower expression',()=>{
  const f=hostFixture();f.positions[0].expressionEnabled=false;
  f.s.Arrow.LiveHost.optimize(f.target);assert.equal(f.positions[0].expressionEnabled,false);
});
test('A locked arrow is rejected before changing expressions or starting undo',()=>{
  const f=hostFixture();f.owner.locked=true;
  assert.throws(()=>f.s.Arrow.LiveHost.optimize(f.target),/锁定/);
  assert.deepEqual(f.stats(),{writes:0,begins:0,ends:0});
});
console.log(passed+' passed; '+failed+' failed. Node only; no AE timing or scrubbing validation.');
if(failed)process.exitCode=1;
