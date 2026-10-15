'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),scope=vm.createContext({});
vm.runInContext('var Arrow={};',scope);
for(const name of ['core','live-math','live-host','live-ui']){
 const source=fs.readFileSync(path.join(root,'src',name+'.jsxinc'),'utf8');new vm.Script(source);
 if(name==='core'||name==='live-math')vm.runInContext(source,scope);
}
const M=scope.Arrow.LiveMath,report={passed:0,failed:0,cases:[]};
function test(name,fn){try{fn();report.passed++;report.cases.push({name,status:'pass'});console.log('PASS '+name);}catch(e){report.failed++;report.cases.push({name,status:'fail',error:e.stack});console.error(e);}}
const line=M.build([[0,0],[700,0]],[[0,0],[0,0]],[[0,0],[0,0]]);
const defaults={width:8,startType:1,endType:1,startLength:55,endLength:55,startWidth:90,endWidth:90,startDepth:36,endDepth:36,notch:.35};
function near(a,b){assert.ok(Math.abs(a-b)<.03,`${a} != ${b}`);}
function finite(g){for(const name of ['body','start','end'])for(const key of ['vertices','inTangents','outTangents'])for(const p of g[name][key])assert.ok(p.every(Number.isFinite));}
test('Straight path length and source endpoints',()=>{near(line.total,700);near(M.frame(line,1).point[0],700);});
test('Independent connection/angle vertices',()=>{const g=M.generate(line,defaults);near(g.end.vertices[1][0],664);near(g.end.vertices[2][0],645);assert.equal(g.end.vertices.length,5);});
test('Body overlaps both necks',()=>{const g=M.generate(line,defaults);assert.ok(g.body.vertices[0][0]<55);assert.ok(g.body.vertices.at(-1)[0]>645);});
test('Tip angle edits leave connection fixed',()=>{const a=M.generate(line,defaults),b=M.generate(line,{...defaults,endDepth:80});near(a.end.vertices[2][0],b.end.vertices[2][0]);assert.notEqual(a.end.vertices[1][0],b.end.vertices[1][0]);});
test('Full source cubic retains both original control tangents',()=>{const p=M.build([[0,0],[300,0]],[[0,0],[-50,100]],[[50,-100],[0,0]]),g=M.generate(p,{...defaults,startType:0,endType:0});near(g.body.outTangents[0][0],50);near(g.body.outTangents[0][1],-100);near(g.body.inTangents[1][1],100);});
test('Multi segment cubics remain native curves',()=>{const p=M.build([[0,0],[100,100],[300,0]],[[0,0],[-20,0],[-50,0]],[[20,0],[50,0],[0,0]]),s=M.trim(p,0,p.total);assert.equal(s.vertices.length,3);near(s.outTangents[1][0],50);});
test('Curved bridge reaches head tangent neck',()=>{const p=M.build([[0,0],[700,0]],[[0,0],[-150,200]],[[150,-200],[0,0]]),g=M.generate(p,defaults),s=M.frame(p,0),e=M.frame(p,1);near(Math.hypot(g.body.vertices[0][0],g.body.vertices[0][1]),54);near(Math.hypot(g.body.vertices.at(-1)[0]-700,g.body.vertices.at(-1)[1]),54);finite(g);});
test('All 64 endpoint combinations remain finite',()=>{for(let i=0;i<8;i++)for(let j=0;j<8;j++)finite(M.generate(line,{...defaults,startType:i,endType:j}));});
test('Non triangle markers use occupied head depth for overlap',()=>{const g=M.generate(line,{...defaults,startType:0,endType:7,endDepth:100,endLength:10});near(g.body.vertices.at(-1)[0],601);});
test('Short and zero length paths stay finite',()=>{for(const length of [0,.0001,1,5,20]){const p=M.build([[0,0],[length,0]],[[0,0],[0,0]],[[0,0],[0,0]]);for(let i=0;i<8;i++)finite(M.generate(p,{...defaults,startType:i,endType:i}));}});
test('256 vertex source path cost is bounded and finite',()=>{const v=Array.from({length:256},(_,i)=>[i*10,Math.sin(i)*20]),z=v.map(()=>[0,0]),p=M.build(v,z,z);assert.ok(p.table.length<=255*128+1);finite(M.generate(p,defaults));});
const affinity={affinity:true,width:8,startType:0,endType:1,startWidth:100,endWidth:100,startLength:50,endLength:50,startProportional:true,endProportional:true,startInset:0,endInset:0,startThickness:10,endThickness:10,startVLength:50,endVLength:50,startSquareIndent:25,endSquareIndent:25,startTailIndent:0,endTailIndent:0};
test('Affinity: all 121 combinations on straight, curved and degenerate paths',()=>{for(const p of [line,M.build([[0,0],[300,180],[700,0]],[[0,0],[-90,-30],[-100,140]],[[100,-140],[90,30],[0,0]]),M.build([[0,0],[0,0]],[[0,0],[0,0]],[[0,0],[0,0]])])for(let i=0;i<11;i++)for(let j=0;j<11;j++)finite(M.generate(p,{...affinity,startType:i,endType:j}));});
test('Affinity: proportional length uses endpoint height; free length uses source arc length',()=>{const a=M.generate(line,affinity),b=M.generate(line,{...affinity,endProportional:false,endLength:10});near(a.end.vertices[1][0],650);near(b.end.vertices[1][0],630);});
test('Affinity: inset moves only the arrow neck',()=>{const a=M.generate(line,affinity),b=M.generate(line,{...affinity,endInset:50});assert.deepEqual(a.end.vertices[1],b.end.vertices[1]);near(b.end.vertices[2][0],675);assert.ok(b.body.vertices.at(-1)[0]>a.body.vertices.at(-1)[0]);});
test('Affinity: barbed thickness and V length edit distinct geometry',()=>{const a=M.generate(line,{...affinity,endType:2,endThickness:10}),b=M.generate(line,{...affinity,endType:2,endThickness:30});assert.notEqual(a.end.vertices[2][1],b.end.vertices[2][1]);const v=M.generate(line,{...affinity,endType:3,endVLength:25});near(v.end.vertices[3][0],675);near(v.end.vertices[2][0],625);});
test('Affinity: tail markers point inward, semicircle curvature is on opposite sides',()=>{const t=M.generate(line,{...affinity,endType:8});near(t.end.vertices[0][0],650);near(t.end.vertices[1][0],700);const inner=M.generate(line,{...affinity,endType:9,endTailIndent:0}),outer=M.generate(line,{...affinity,endType:10});near(inner.end.vertices[1][0],650);near(outer.end.vertices[1][0],700);assert.ok(inner.end.outTangents[0][0]<0);assert.ok(outer.end.outTangents[0][0]>0);});
test('Affinity: zero and extreme style parameters remain finite on short curves',()=>{const p=M.build([[0,0],[1,1]],[[0,0],[-2,3]],[[2,-3],[0,0]]);for(let type=0;type<11;type++)for(const x of [0,.001,100,10000])finite(M.generate(p,{...affinity,startType:type,endType:type,startWidth:x,endWidth:x,startLength:x,endLength:x,startInset:x,endInset:x,startThickness:x,endThickness:x,startVLength:x,endVLength:x,startTailIndent:x,endTailIndent:x}));});
fs.writeFileSync(path.join(root,'test-results','live-core-tests.json'),JSON.stringify(report,null,2));
if(report.failed)process.exitCode=1;
