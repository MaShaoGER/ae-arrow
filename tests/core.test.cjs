'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const scope = vm.createContext({});
vm.runInContext('var Arrow = { version: "0.1.0" };', scope);
const sourceNames = ['core', 'host', 'ui'];
for (const name of sourceNames) {
  const source = fs.readFileSync(path.join(root, 'src', name + '.jsxinc'), 'utf8');
  new vm.Script(source, { filename: name + '.jsxinc' });
  if (name === 'core') vm.runInContext(source, scope);
}
const A = scope.Arrow;
const local = value => vm.runInContext('(' + JSON.stringify(value) + ')', scope);
const plain = value => JSON.parse(JSON.stringify(value));
const report = { environment: { node: process.version, platform: process.platform }, passed: 0, failed: 0, cases: [] };
function test(name, run) {
  try { run(); report.passed++; report.cases.push({ name, status: 'pass' }); console.log('PASS ' + name); }
  catch (error) { report.failed++; report.cases.push({ name, status: 'fail', error: error.stack }); console.error('FAIL ' + name + '\n' + error.stack); }
}
function near(a, b, tolerance = 1e-6) { assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b} by more than ${tolerance}`); }
function finiteShape(shape) {
  assert.ok(shape.vertices.length >= 2);
  assert.equal(shape.vertices.length, shape.inTangents.length);
  assert.equal(shape.vertices.length, shape.outTangents.length);
  for (const list of [shape.vertices, shape.inTangents, shape.outTangents]) {
    for (const point of list) { assert.equal(point.length, 2); for (const coordinate of point) assert.ok(Number.isFinite(coordinate)); }
  }
}
test('All sources and distribution parse as JavaScript', () => {
  const dist = fs.readFileSync(path.join(root, 'dist', 'AE Arrow.jsx'), 'utf8').replace(/^\uFEFF/, '').replace(/^#target[^\r\n]*/, '');
  new vm.Script(dist, { filename: 'AE Arrow.jsx' });
});
test('JSON roundtrip matches native JSON for escaped text, nested data and parameters', () => {
  const cases = [null, true, false, 0, -4.25, '箭头 " \\ \t\r\n\u0000', [1, 'a', null], { a: 1, text: '曲线', list: [true, { b: 2 }] }, plain(A.Model.defaults())];
  for (const item of cases) {
    const encoded = A.Codec.stringify(local(item));
    assert.deepEqual(JSON.parse(encoded), item);
    assert.deepEqual(plain(A.Codec.parse(encoded)), item);
  }
});
test('JSON rejects malformed input, duplicate/prototype keys and oversized input', () => {
  const bad = ['{"x":1,"x":2}', '{"__proto__":{}}', '{"hasOwnProperty":1}', '[1,]', '{"a":}', '01', '1e9999', '"bad\ntext"', 'true garbage', '"\\x00"', ' '.repeat(262145), '['.repeat(40) + '0' + ']'.repeat(40)];
  for (const text of bad) assert.throws(() => A.Codec.parse(text));
});
test('Every built-in preset validates and yields finite geometry', () => {
  assert.equal(A.Model.presets.length, 12);
  for (let i = 0; i < A.Model.presets.length; i++) {
    const p = A.Model.preset(i), result = A.Geometry.generate(p);
    assert.equal(result.params.schemaVersion, 1);
    [result.body, result.start, result.end].forEach(part => finiteShape(part.shape));
  }
});
test('All 64 end combinations on straight and curved paths remain finite', () => {
  let total = 0;
  for (const start of A.Model.markers) for (const end of A.Model.markers) for (const type of ['straight', 'curve']) {
    const p = A.Model.defaults(); p.start.type = start; p.end.type = end; p.pathType = type; p.bend = -550;
    const result = A.Geometry.generate(p);
    [result.body, result.start, result.end].forEach(part => finiteShape(part.shape));
    assert.equal(result.start.visible, start !== 'none'); assert.equal(result.end.visible, end !== 'none'); total++;
  }
  assert.equal(total, 128);
});
test('Straight triangle tips, independent dimensions and line trim use local coordinates', () => {
  const p = A.Model.defaults(); p.cap = 'butt'; p.start.type = 'triangle'; p.start.length = 24; p.start.width = 18;
  p.end.length = 40; p.end.width = 60; p.startGap = 15; p.endGap = 25;
  const r = A.Geometry.generate(p);
  near(r.start.shape.vertices[0][0], -185); near(r.end.shape.vertices[0][0], 175);
  near(r.body.shape.vertices[0][0], -161); near(r.body.shape.vertices[1][0], 135);
  near(Math.abs(r.start.shape.vertices[1][1] - r.start.shape.vertices[2][1]), 18);
  near(Math.abs(r.end.shape.vertices[1][1] - r.end.shape.vertices[2][1]), 60);
});
test('Curve endpoint trim follows arc distance against an independent dense numerical reference', () => {
  for (const bend of [-700, -50, 80, 650]) {
    const p = A.Model.defaults(); p.pathType = 'curve'; p.bend = bend; p.start.type = 'none'; p.end.type = 'none'; p.cap = 'butt'; p.startGap = 30; p.endGap = 45;
    const r = A.Geometry.generate(p);
    const at = t => [-p.length / 2 + p.length * t, -3 * bend * t * (1 - t)];
    const points = [], distances = [0]; let last = at(0), sum = 0; points.push(last);
    for (let i = 1; i <= 20000; i++) { const point = at(i / 20000); sum += Math.hypot(point[0] - last[0], point[1] - last[1]); distances.push(sum); points.push(point); last = point; }
    const expected = d => { let i = 0; while (distances[i] < d) i++; return points[i]; };
    const a = expected(30), b = expected(sum - 45);
    near(r.body.shape.vertices[0][0], a[0], 0.1); near(r.body.shape.vertices[0][1], a[1], 0.1);
    near(r.body.shape.vertices[1][0], b[0], 0.1); near(r.body.shape.vertices[1][1], b[1], 0.1);
  }
});
test('Color and dash changes reuse geometry without altering existing plans', () => {
  const p = A.Model.defaults(); p.pathType = 'curve'; const first = A.Geometry.generate(p);
  p.color[0] = 0.9; p.dashed = true; p.dash = 30; const second = A.Geometry.generate(p);
  assert.equal(second.body, first.body); assert.equal(second.end, first.end);
  assert.equal(first.params.color[0], 0.2); assert.equal(second.params.color[0], 0.9);
});
test('Short paths shrink markers, overlapping gaps reject cleanly', () => {
  const p = A.Model.defaults(); p.length = 10; p.start.type = 'triangle'; p.start.length = 1000; p.end.length = 1000;
  const r = A.Geometry.generate(p); assert.ok(r.headScale > 0 && r.headScale < 1); assert.ok(r.warning.length > 0);
  [r.body, r.start, r.end].forEach(part => finiteShape(part.shape)); assert.equal(p.end.length, 1000);
  p.startGap = 6; p.endGap = 6; assert.throws(() => A.Geometry.generate(p), /留空/);
});
test('Boundary and invalid parameters reject invalid states', () => {
  for (const [key, value] of [['length', NaN], ['length', Infinity], ['strokeWidth', 0], ['bend', 3001], ['pathType', 'unknown'], ['schemaVersion', 2], ['dashed', 'true']]) {
    const p = A.Model.defaults(); p[key] = value; assert.throws(() => A.Model.validate(p));
  }
  const p = A.Model.defaults(); p.start.type = 'unknown'; assert.throws(() => A.Model.validate(p));
});
test('Deterministic 2000-case boundary sweep never emits invalid coordinates', () => {
  let seed = 12345678;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 2000; i++) {
    const p = A.Model.defaults(); p.pathType = i % 2 ? 'curve' : 'straight'; p.length = 10 + random() * 9990; p.bend = -3000 + random() * 6000;
    p.start.type = A.Model.markers[Math.floor(random() * 8)]; p.end.type = A.Model.markers[Math.floor(random() * 8)];
    for (const m of [p.start, p.end]) { m.length = 1 + random() * 999; m.width = 1 + random() * 999; m.notch = random() * 0.85; }
    p.strokeWidth = 0.5 + random() * 299.5; p.startGap = random() * p.length * 0.2; p.endGap = random() * p.length * 0.2;
    const r = A.Geometry.generate(p); [r.body, r.start, r.end].forEach(part => finiteShape(part.shape));
  }
});
test('Core generation benchmark (not UI or AE timing)', () => {
  const times = [];
  for (let i = 0; i < 1000; i++) {
    const p = A.Model.defaults(); p.pathType = 'curve'; p.length += i; p.bend = i % 500;
    const start = performance.now(); A.Geometry.generate(p); times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  report.coreTimingMs = { median: times[500], p95: times[950], samples: 1000, includes: 'validation + uncached geometry, Node.js only' };
});
fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
fs.writeFileSync(path.join(root, 'test-results', 'core-tests.json'), JSON.stringify(report, null, 2));
console.log(`${report.passed} passed; ${report.failed} failed.`);
process.exitCode = report.failed ? 1 : 0;
