#target aftereffects
/* AE Arrow 0.1.0 — generated from src/*.jsxinc; edit sources, then rebuild. */
(function (thisObj) {
    var Arrow = { version: "0.1.0" };
/* ES3-compatible model, JSON codec and geometry. No AE property access here. */
(function (A) {
    var MARKERS = ["none", "triangle", "hollow", "chevron", "stealth", "circle", "square", "diamond"];
    function fail(message) { throw new Error(message); }
    function clamp(n, low, high) { return Math.max(low, Math.min(high, n)); }
    function number(v, low, high, name) {
        if (typeof v !== "number" || !isFinite(v) || v < low || v > high) {
            fail(name + " 必须在 " + low + "–" + high + " 之间。");
        }
        return v;
    }
    function contains(items, value) {
        var i;
        for (i = 0; i < items.length; i++) { if (items[i] === value) { return true; } }
        return false;
    }

    /* Do not depend on JSON being provided by the host; never eval imported data. */
    var Codec = {};
    Codec.stringify = function (value) {
        var i, parts, key, type = typeof value;
        if (value === null) { return "null"; }
        if (type === "string") {
            return '"' + value.replace(/[\\"\u0000-\u001f]/g, function (c) {
                var hex;
                if (c === '"') { return '\\"'; }
                if (c === "\\") { return "\\\\"; }
                hex = c.charCodeAt(0).toString(16);
                return "\\u" + ("0000" + hex).slice(-4);
            }) + '"';
        }
        if (type === "number") { if (!isFinite(value)) { fail("不能保存无效数字。"); } return String(value); }
        if (type === "boolean") { return value ? "true" : "false"; }
        if (value instanceof Array) {
            parts = [];
            for (i = 0; i < value.length; i++) { parts.push(Codec.stringify(value[i])); }
            return "[" + parts.join(",") + "]";
        }
        if (type === "object") {
            parts = [];
            for (key in value) {
                if (value.hasOwnProperty(key)) { parts.push(Codec.stringify(key) + ":" + Codec.stringify(value[key])); }
            }
            return "{" + parts.join(",") + "}";
        }
        fail("不支持的保存数据类型。");
    };
    Codec.parse = function (source) {
        var at = 0, depth = 0, length = source.length;
        function error() { fail("JSON 数据格式错误（字符 " + at + "）。"); }
        function space() { while (at < length && /\s/.test(source.charAt(at))) { at++; } }
        function string() {
            var result = "", c, escape, hex, escapes = { '"': '"', "\\": "\\", "/": "/", "b": "\b", "f": "\f", "n": "\n", "r": "\r", "t": "\t" };
            at++;
            while (at < length) {
                c = source.charAt(at++);
                if (c === '"') { return result; }
                if (c === "\\") {
                    escape = source.charAt(at++);
                    if (escape === "u") {
                        hex = source.substr(at, 4);
                        if (!/^[0-9a-fA-F]{4}$/.test(hex)) { error(); }
                        result += String.fromCharCode(parseInt(hex, 16)); at += 4;
                    } else if (escapes.hasOwnProperty(escape)) { result += escapes[escape]; }
                    else { error(); }
                } else { if (c.charCodeAt(0) < 32) { error(); } result += c; }
            }
            error();
        }
        function value() {
            var c, out, key, m;
            space(); c = source.charAt(at);
            if (++depth > 32) { error(); }
            if (c === '"') { out = string(); }
            else if (c === "{" || c === "[") {
                at++; out = c === "{" ? {} : []; space();
                if (source.charAt(at) === (c === "{" ? "}" : "]")) { at++; }
                else {
                    while (true) {
                        if (c === "{") {
                            space(); if (source.charAt(at) !== '"') { error(); }
                            key = string();
                            if (key === "__proto__" || key === "constructor" || key === "prototype" || key === "hasOwnProperty" || out.hasOwnProperty(key)) { error(); }
                            space(); if (source.charAt(at++) !== ":") { error(); }
                            out[key] = value();
                        } else { out.push(value()); }
                        space();
                        if (source.charAt(at) === (c === "{" ? "}" : "]")) { at++; break; }
                        if (source.charAt(at++) !== ",") { error(); }
                    }
                }
            } else if (source.substr(at, 4) === "true") { at += 4; out = true; }
            else if (source.substr(at, 5) === "false") { at += 5; out = false; }
            else if (source.substr(at, 4) === "null") { at += 4; out = null; }
            else {
                m = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(source.substring(at));
                if (!m) { error(); }
                at += m[0].length; out = Number(m[0]); if (!isFinite(out)) { error(); }
            }
            depth--; return out;
        }
        if (length > 262144) { fail("数据文件过大（最多 256 KB）。"); }
        var result = value(); space(); if (at !== length) { error(); } return result;
    };
    function clone(value) { return Codec.parse(Codec.stringify(value)); }

    function defaults() {
        return {
            schemaVersion: 1, pathType: "straight", length: 400, bend: 100,
            strokeWidth: 8, color: [0.20, 0.65, 1.0], cap: "round",
            dashed: false, dash: 24, gap: 14, startGap: 0, endGap: 0,
            start: { type: "none", length: 36, width: 30, notch: 0.35 },
            end: { type: "triangle", length: 36, width: 30, notch: 0.35 }
        };
    }
    function validateMarker(m, name) {
        if (!m || !contains(MARKERS, m.type)) { fail(name + "类型无效。"); }
        return {
            type: m.type, length: number(m.length, 1, 1000, name + "长度"),
            width: number(m.width, 1, 1000, name + "宽度"), notch: number(m.notch, 0, 0.85, name + "凹陷")
        };
    }
    function validate(p) {
        if (!p || p.schemaVersion !== 1) { fail("不支持此参数版本。"); }
        if (!contains(["straight", "curve"], p.pathType)) { fail("线身类型无效。"); }
        if (!contains(["butt", "round", "square"], p.cap)) { fail("端帽类型无效。"); }
        if (typeof p.dashed !== "boolean" || !(p.color instanceof Array) || p.color.length !== 3) { fail("颜色或虚线参数无效。"); }
        return {
            schemaVersion: 1, pathType: p.pathType, length: number(p.length, 10, 10000, "总长度"),
            bend: number(p.bend, -3000, 3000, "弯曲量"), strokeWidth: number(p.strokeWidth, 0.5, 300, "线宽"),
            color: [number(p.color[0], 0, 1, "红色"), number(p.color[1], 0, 1, "绿色"), number(p.color[2], 0, 1, "蓝色")],
            cap: p.cap, dashed: p.dashed, dash: number(p.dash, 0.5, 1000, "虚线长度"), gap: number(p.gap, 0.5, 1000, "虚线间隔"),
            startGap: number(p.startGap, 0, 2000, "起点留空"), endGap: number(p.endGap, 0, 2000, "终点留空"),
            start: validateMarker(p.start, "起点"), end: validateMarker(p.end, "终点")
        };
    }

    function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function mul(a, s) { return [a[0] * s, a[1] * s]; }
    function distance(a, b) { var d = sub(a, b); return Math.sqrt(d[0] * d[0] + d[1] * d[1]); }
    function lerp(a, b, t) { return add(mul(a, 1 - t), mul(b, t)); }
    function bezier(c, t) {
        var a = lerp(c[0], c[1], t), b = lerp(c[1], c[2], t), d = lerp(c[2], c[3], t);
        return lerp(lerp(a, b, t), lerp(b, d, t), t);
    }
    function tangent(c, t) {
        var d = add(add(mul(sub(c[1], c[0]), 3 * (1 - t) * (1 - t)), mul(sub(c[2], c[1]), 6 * (1 - t) * t)), mul(sub(c[3], c[2]), 3 * t * t));
        var n = distance(d, [0, 0]);
        if (n < 0.000001) { d = sub(c[3], c[0]); n = distance(d, [0, 0]); }
        return n < 0.000001 ? [1, 0] : mul(d, 1 / n);
    }
    function split(c, t) {
        var a = lerp(c[0], c[1], t), b = lerp(c[1], c[2], t), d = lerp(c[2], c[3], t);
        var e = lerp(a, b, t), f = lerp(b, d, t), tip = lerp(e, f, t);
        return [[c[0], a, e, tip], [tip, f, d, c[3]]];
    }
    function section(c, t0, t1) {
        if (t0 < 0.000001) { return split(c, t1)[0]; }
        return split(split(c, t0)[1], clamp((t1 - t0) / (1 - t0), 0, 1))[0];
    }
    function arcTable(c) {
        var entries = [{ t: 0, d: 0 }], last = c[0], point, total = 0, i;
        for (i = 1; i <= 192; i++) {
            point = bezier(c, i / 192); total += distance(last, point);
            entries.push({ t: i / 192, d: total }); last = point;
        }
        return { entries: entries, total: total };
    }
    function atDistance(table, d) {
        var entries = table.entries, low = 0, high = entries.length - 1, mid, a, b;
        d = clamp(d, 0, table.total);
        while (high - low > 1) { mid = Math.floor((low + high) / 2); if (entries[mid].d < d) { low = mid; } else { high = mid; } }
        a = entries[low]; b = entries[high];
        return b.d - a.d < 0.000001 ? a.t : a.t + (b.t - a.t) * (d - a.d) / (b.d - a.d);
    }
    function path(vertices, closed, incoming, outgoing) {
        var i, ins = [], outs = [];
        for (i = 0; i < vertices.length; i++) { ins.push(incoming ? incoming[i] : [0, 0]); outs.push(outgoing ? outgoing[i] : [0, 0]); }
        return { vertices: vertices, inTangents: ins, outTangents: outs, closed: closed };
    }
    function marker(m, tip, dir, scale) {
        var len = m.length * scale, width = m.width * scale, normal = [-dir[1], dir[0]], points, result, k = 0.5522847498;
        function local(x, y) { return add(tip, add(mul(dir, x), mul(normal, y))); }
        if (m.type === "none") { return { shape: path([[0, 0], [0, 0]], false), fill: false, stroke: false, visible: false }; }
        if (m.type === "circle") {
            points = [local(0, 0), local(-len / 2, width / 2), local(-len, 0), local(-len / 2, -width / 2)];
            result = path(points, true,
                [mul(normal, -width * k / 2), mul(dir, len * k / 2), mul(normal, width * k / 2), mul(dir, -len * k / 2)],
                [mul(normal, width * k / 2), mul(dir, -len * k / 2), mul(normal, -width * k / 2), mul(dir, len * k / 2)]);
        } else if (m.type === "square") {
            result = path([local(0, -width / 2), local(0, width / 2), local(-len, width / 2), local(-len, -width / 2)], true);
        } else if (m.type === "diamond") {
            result = path([local(0, 0), local(-len / 2, width / 2), local(-len, 0), local(-len / 2, -width / 2)], true);
        } else if (m.type === "chevron") {
            result = path([local(-len, -width / 2), local(0, 0), local(-len, width / 2)], false);
        } else if (m.type === "stealth") {
            result = path([local(0, 0), local(-len, width / 2), local(-len * (1 - m.notch), 0), local(-len, -width / 2)], true);
        } else { result = path([local(0, 0), local(-len, width / 2), local(-len, -width / 2)], true); }
        return { shape: result, fill: m.type !== "hollow" && m.type !== "chevron", stroke: m.type === "hollow" || m.type === "chevron", visible: true };
    }
    function occupied(m, scale) {
        if (m.type === "none" || m.type === "chevron") { return 0; }
        if (m.type === "stealth") { return m.length * scale * (1 - m.notch); }
        return m.length * scale;
    }
    var geometryCache = null;
    function generate(input) {
        var p = validate(input), key = Codec.stringify({ pathType: p.pathType, length: p.length, bend: p.bend,
            strokeWidth: p.strokeWidth, cap: p.cap, startGap: p.startGap, endGap: p.endGap, start: p.start, end: p.end });
        if (geometryCache && geometryCache.key === key) {
            return { params: p, body: geometryCache.body, start: geometryCache.start, end: geometryCache.end,
                headScale: geometryCache.headScale, warning: geometryCache.warning };
        }
        var half = p.length / 2, bend = p.pathType === "curve" ? -p.bend : 0;
        var c = [[-half, 0], [-half / 3, bend], [half / 3, bend], [half, 0]], table = arcTable(c);
        var available = table.total - p.startGap - p.endGap, headSum = (p.start.type === "none" ? 0 : p.start.length) + (p.end.type === "none" ? 0 : p.end.length);
        if (available < 1) { fail("端点留空超过线身长度，请减少留空。"); }
        var scale = headSum > available * 0.8 ? available * 0.8 / headSum : 1;
        var startT = atDistance(table, p.startGap), endT = atDistance(table, table.total - p.endGap);
        var start = marker(p.start, bezier(c, startT), mul(tangent(c, startT), -1), scale);
        var end = marker(p.end, bezier(c, endT), tangent(c, endT), scale);
        /* Butt caps stop the body from poking through marker edges. */
        var capExtra = p.cap === "butt" ? 0 : p.strokeWidth / 2;
        var startTrim = occupied(p.start, scale) + (p.start.type === "hollow" ? p.strokeWidth / 2 : 0);
        var endTrim = occupied(p.end, scale) + (p.end.type === "hollow" ? p.strokeWidth / 2 : 0);
        var d0 = p.startGap + startTrim + (start.visible ? capExtra : 0);
        var d1 = table.total - p.endGap - endTrim - (end.visible ? capExtra : 0);
        var body;
        if (d1 <= d0 + 0.01) { body = { shape: path([[0, 0], [0, 0]], false), visible: false, fill: false, stroke: false }; }
        else {
            var trimmed = section(c, atDistance(table, d0), atDistance(table, d1));
            body = { shape: path([trimmed[0], trimmed[3]], false, [[0, 0], sub(trimmed[2], trimmed[3])], [sub(trimmed[1], trimmed[0]), [0, 0]]), visible: true, fill: false, stroke: true };
        }
        geometryCache = { key: key, body: body, start: start, end: end, headScale: scale,
            warning: scale < 0.999 ? "短路径：本次头部按比例缩小至 " + Math.round(scale * 100) + "%（原参数保留）。" : "" };
        return { params: p, body: body, start: start, end: end, headScale: scale, warning: geometryCache.warning };
    }
    function samples(shape, steps) {
        var result = [], count = shape.vertices.length, segments = shape.closed ? count : count - 1, i, j, next, c;
        if (count === 0) { return result; }
        result.push(shape.vertices[0]);
        for (i = 0; i < segments; i++) {
            next = (i + 1) % count;
            c = [shape.vertices[i], add(shape.vertices[i], shape.outTangents[i]), add(shape.vertices[next], shape.inTangents[next]), shape.vertices[next]];
            for (j = 1; j <= steps; j++) { result.push(bezier(c, j / steps)); }
        }
        return result;
    }
    var PRESETS = [
        { name: "标准实心", patch: {} },
        { name: "纤细指示", patch: { strokeWidth: 3, end: { type: "triangle", length: 22, width: 18, notch: 0.35 } } },
        { name: "粗线箭头", patch: { strokeWidth: 18, end: { type: "triangle", length: 52, width: 56, notch: 0.35 } } },
        { name: "空心三角", patch: { strokeWidth: 4, end: { type: "hollow", length: 38, width: 32, notch: 0.35 } } },
        { name: "开放尖角", patch: { strokeWidth: 5, end: { type: "chevron", length: 30, width: 34, notch: 0.35 } } },
        { name: "燕尾箭头", patch: { end: { type: "stealth", length: 48, width: 38, notch: 0.4 } } },
        { name: "双向实心", patch: { start: { type: "triangle", length: 36, width: 30, notch: 0.35 } } },
        { name: "虚线指示", patch: { dashed: true, strokeWidth: 5, dash: 18, gap: 12 } },
        { name: "弧线箭头", patch: { pathType: "curve", bend: 140, end: { type: "stealth", length: 40, width: 32, notch: 0.35 } } },
        { name: "圆点起始", patch: { start: { type: "circle", length: 20, width: 20, notch: 0.35 } } },
        { name: "方块连线", patch: { start: { type: "square", length: 24, width: 24, notch: 0.35 }, end: { type: "square", length: 24, width: 24, notch: 0.35 } } },
        { name: "菱形端点", patch: { end: { type: "diamond", length: 42, width: 30, notch: 0.35 } } }
    ];
    function preset(index) {
        var p = defaults(), patch = PRESETS[index].patch, key;
        for (key in patch) { if (patch.hasOwnProperty(key)) { p[key] = clone(patch[key]); } }
        return validate(p);
    }
    A.Codec = Codec;
    A.Model = { defaults: defaults, validate: validate, clone: clone, markers: MARKERS, presets: PRESETS, preset: preset };
    A.Geometry = { generate: generate, samples: samples };
}(Arrow));

/* AE-only adapter. All writes are explicit, grouped and confined to owned content. */
(function (A) {
    var ROOT_NAME = "__AE_ARROW_V1__";
    var TAG = /\[\[AE_ARROW_V1:([^\]]*)\]\]/g;
    var ROOT = "ADBE Root Vectors Group", CONTENTS = "ADBE Vectors Group";
    var GROUP = "ADBE Vector Group", PATH = "ADBE Vector Shape - Group";
    var STROKE = "ADBE Vector Graphic - Stroke", FILL = "ADBE Vector Graphic - Fill";
    var DASHES = "ADBE Vector Stroke Dashes", DASH = "ADBE Vector Stroke Dash 1", GAP = "ADBE Vector Stroke Gap 1";
    var PARTS = ["Body", "Start", "End"];

    function fail(message) { throw new Error(message); }
    function comp() {
        var item = app.project ? app.project.activeItem : null;
        if (!(item instanceof CompItem)) { fail("请先打开一个合成。"); }
        return item;
    }
    function selected() {
        var item = comp(), layers = item.selectedLayers;
        if (layers.length !== 1 || !(layers[0] instanceof ShapeLayer)) { fail("请只选中一个由 AE Arrow 创建的形状图层。"); }
        return { comp: item, layer: layers[0], compId: item.id, layerId: layers[0].id };
    }
    function checkTarget(expected) {
        var target = selected();
        if (expected && (expected.compId !== target.compId || expected.layerId !== target.layerId)) {
            fail("选中对象已改变，请重新读取后更新。");
        }
        if (target.layer.locked) { fail("图层已锁定，请先解锁。"); }
        return target;
    }
    function findUnique(container, name, matchName) {
        var found = null, i, property;
        for (i = 1; i <= container.numProperties; i++) {
            property = container.property(i);
            if (property.name === name && (!matchName || property.matchName === matchName)) {
                if (found) { fail("箭头内部出现重名分组，请重新创建箭头。"); }
                found = property;
            }
        }
        return found;
    }
    function owned(layer) { return findUnique(layer.property(ROOT), ROOT_NAME, GROUP); }
    function groupContents(layer, name) {
        var root = owned(layer), group;
        if (!root) { fail("缺少工具管理分组，请新建箭头。"); }
        group = findUnique(root.property(CONTENTS), name, GROUP);
        if (!group) { fail("缺少 " + name + " 分组，请新建箭头。"); }
        return group.property(CONTENTS);
    }
    function paint(layer, name, matchName) {
        var property = groupContents(layer, name).property(matchName);
        if (!property) { fail("内部绘制属性不完整，请新建箭头。"); }
        return property;
    }
    function visibleProperty(container, matchName) {
        var i, property;
        /* AE enumerates hidden dash slots too; only enabled slots accept expressions. */
        for (i = 1; i <= container.numProperties; i++) {
            property = container.property(i);
            if (property.matchName === matchName && property.canSetExpression) { return property; }
        }
        return null;
    }
    function metadata(layer) {
        var comment = layer.comment || "", matches = [], match, data;
        TAG.lastIndex = 0;
        while ((match = TAG.exec(comment)) !== null) { matches.push(match); }
        if (matches.length !== 1) { fail("没有有效的 AE Arrow 参数标记，请选中工具生成的箭头。"); }
        try { data = A.Codec.parse(decodeURIComponent(matches[0][1])); }
        catch (error) { fail("箭头参数标记损坏，请创建新箭头。\n" + error.message); }
        if (!data || data.tool !== "ae-arrow" || data.schemaVersion !== 1 || typeof data.fingerprint !== "string") { fail("不支持此箭头元数据版本。"); }
        data.params = A.Model.validate(data.params);
        return { data: data, token: matches[0][0] };
    }
    function writeMetadata(layer, p) {
        var comment = layer.comment || "", token;
        var data = { tool: "ae-arrow", schemaVersion: 1, scriptVersion: A.version, params: p, fingerprint: fingerprint(owned(layer)) };
        token = "[[AE_ARROW_V1:" + encodeURIComponent(A.Codec.stringify(data)) + "]]";
        TAG.lastIndex = 0;
        if (TAG.test(comment)) { TAG.lastIndex = 0; comment = comment.replace(TAG, token); }
        else { comment += (comment.length ? "\n" : "") + token; }
        layer.comment = comment;
    }
    function numeric(value) {
        var result, i;
        if (typeof value === "number") { return Math.round(value * 1000000) / 1000000; }
        if (value instanceof Array) {
            result = []; for (i = 0; i < value.length; i++) { result.push(numeric(value[i])); } return result;
        }
        return value;
    }
    function snapshot(property, checkAnimation) {
        var result = { name: property.name, matchName: property.matchName }, i, value;
        if (property.propertyType !== PropertyType.PROPERTY) {
            result.children = [];
            for (i = 1; i <= property.numProperties; i++) { result.children.push(snapshot(property.property(i), checkAnimation)); }
        } else {
            result.canSetExpression = property.canSetExpression;
            result.keys = property.numKeys;
            result.expression = property.canSetExpression ? property.expression : "";
            result.expressionEnabled = property.canSetExpression ? property.expressionEnabled : false;
            if (checkAnimation && (result.keys > 0 || result.expression !== "")) {
                fail("箭头内部已有关键帧或表达式，本版不覆盖它们。请复制样式并创建新箭头。");
            }
            if (property.propertyValueType === PropertyValueType.SHAPE) {
                value = property.value;
                result.value = { vertices: numeric(value.vertices), inTangents: numeric(value.inTangents), outTangents: numeric(value.outTangents), closed: value.closed };
            } else if (property.propertyValueType !== PropertyValueType.NO_VALUE && property.propertyValueType !== PropertyValueType.CUSTOM_VALUE) {
                result.value = numeric(property.value);
            }
        }
        return result;
    }
    function fingerprint(property, checkAnimation) {
        if (!property) { return "missing"; }
        var text = A.Codec.stringify(snapshot(property, checkAnimation)), hash = 5381, i;
        for (i = 0; i < text.length; i++) { hash = ((hash << 5) + hash) ^ text.charCodeAt(i); }
        return (hash >>> 0).toString(16) + ":" + text.length;
    }
    function same(a, b) {
        return A.Codec.stringify(numeric(a)) === A.Codec.stringify(numeric(b));
    }
    function set(property, value) {
        if (!property) { fail("AE 缺少所需的形状属性。"); }
        if (!same(property.value, value)) { property.setValue(value); }
    }
    function asShape(data) {
        var shape = new Shape();
        shape.vertices = data.vertices; shape.inTangents = data.inTangents; shape.outTangents = data.outTangents; shape.closed = data.closed;
        return shape;
    }
    function setShape(property, data) {
        var value = property.value;
        function pointsEqual(a, b) {
            var i, j, tolerance;
            if (a.length !== b.length) { return false; }
            for (i = 0; i < a.length; i++) {
                for (j = 0; j < 2; j++) {
                    /* Accommodate host float storage without rewriting unchanged curves. */
                    tolerance = 0.0001 + Math.max(Math.abs(a[i][j]), Math.abs(b[i][j])) * 0.0000001;
                    if (Math.abs(a[i][j] - b[i][j]) > tolerance) { return false; }
                }
            }
            return true;
        }
        if (value.closed !== data.closed || !pointsEqual(value.vertices, data.vertices) ||
                !pointsEqual(value.inTangents, data.inTangents) || !pointsEqual(value.outTangents, data.outTangents)) {
            property.setValue(asShape(data));
        }
    }
    function initialize(layer) {
        var root, rootIndex, contents, added, groupIndex, i;
        root = layer.property(ROOT).addProperty(GROUP); root.name = ROOT_NAME; rootIndex = root.propertyIndex;
        for (i = 0; i < PARTS.length; i++) {
            /* Indexed groups invalidate descendant references after addProperty. Always reacquire. */
            contents = layer.property(ROOT).property(rootIndex).property(CONTENTS);
            added = contents.addProperty(GROUP); added.name = PARTS[i]; groupIndex = added.propertyIndex;
            contents = layer.property(ROOT).property(rootIndex).property(CONTENTS).property(groupIndex).property(CONTENTS);
            contents.addProperty(PATH).name = "Path";
            contents = layer.property(ROOT).property(rootIndex).property(CONTENTS).property(groupIndex).property(CONTENTS);
            contents.addProperty(STROKE).name = "Stroke";
            contents = layer.property(ROOT).property(rootIndex).property(CONTENTS).property(groupIndex).property(CONTENTS);
            contents.addProperty(FILL).name = "Fill";
        }
    }
    function setDashes(layer, enabled, dash, gap) {
        var group = paint(layer, "Body", STROKE).property(DASHES), item;
        if (!group) { fail("AE 缺少虚线属性组。"); }
        if (enabled) {
            if (!visibleProperty(group, DASH)) {
                if (!group.canAddProperty(DASH)) { fail("当前 AE 无法通过脚本添加虚线。"); }
                group.addProperty(DASH);
            }
            group = paint(layer, "Body", STROKE).property(DASHES);
            if (!visibleProperty(group, GAP)) {
                if (!group.canAddProperty(GAP)) { fail("当前 AE 无法通过脚本添加虚线间隔。"); }
                group.addProperty(GAP);
            }
            set(visibleProperty(paint(layer, "Body", STROKE).property(DASHES), DASH), dash);
            set(visibleProperty(paint(layer, "Body", STROKE).property(DASHES), GAP), gap);
        } else {
            item = visibleProperty(group, GAP); if (item) { item.remove(); }
            group = paint(layer, "Body", STROKE).property(DASHES);
            item = visibleProperty(group, DASH); if (item) { item.remove(); }
        }
    }
    function applyVisual(layer, plan, previous) {
        var p = plan.params, q = previous ? previous.params : null;
        var parts = [plan.body, plan.start, plan.end], oldParts = previous ? [previous.body, previous.start, previous.end] : null;
        var colorChanged = !q || !same(p.color, q.color), widthChanged = !q || p.strokeWidth !== q.strokeWidth;
        var i, name, cap, oldCap, contents, stroke, fill, pathChanged, strokeChanged, fillChanged, opacity, oldOpacity, fillOpacity, oldFillOpacity;
        for (i = 0; i < PARTS.length; i++) {
            name = PARTS[i];
            cap = i === 0 ? (p.cap === "butt" ? 1 : (p.cap === "round" ? 2 : 3)) : 1;
            oldCap = i === 0 && q ? (q.cap === "butt" ? 1 : (q.cap === "round" ? 2 : 3)) : 1;
            opacity = parts[i].stroke && parts[i].visible ? 100 : 0;
            oldOpacity = oldParts && oldParts[i].stroke && oldParts[i].visible ? 100 : 0;
            fillOpacity = parts[i].fill && parts[i].visible ? 100 : 0;
            oldFillOpacity = oldParts && oldParts[i].fill && oldParts[i].visible ? 100 : 0;
            pathChanged = !previous || !same(parts[i].shape, oldParts[i].shape);
            strokeChanged = !previous || colorChanged || widthChanged || cap !== oldCap || opacity !== oldOpacity;
            fillChanged = !previous || colorChanged || fillOpacity !== oldFillOpacity;
            if (!pathChanged && !strokeChanged && !fillChanged) { continue; }
            /* No indexed-group mutations in this loop: these handles can be reused. */
            contents = groupContents(layer, name);
            if (pathChanged) { setShape(contents.property(PATH).property("ADBE Vector Shape"), parts[i].shape); }
            if (strokeChanged) {
                stroke = contents.property(STROKE);
                if (colorChanged) { set(stroke.property("ADBE Vector Stroke Color"), p.color); }
                if (widthChanged) { set(stroke.property("ADBE Vector Stroke Width"), p.strokeWidth); }
                if (!previous || opacity !== oldOpacity) { set(stroke.property("ADBE Vector Stroke Opacity"), opacity); }
                if (!previous || cap !== oldCap) { set(stroke.property("ADBE Vector Stroke Line Cap"), cap); }
                if (!previous) { set(stroke.property("ADBE Vector Stroke Line Join"), 2); }
            }
            if (fillChanged) {
                fill = contents.property(FILL);
                if (colorChanged) { set(fill.property("ADBE Vector Fill Color"), p.color); }
                if (!previous || fillOpacity !== oldFillOpacity) { set(fill.property("ADBE Vector Fill Opacity"), fillOpacity); }
            }
        }
        if (!q || p.dashed !== q.dashed || (p.dashed && (p.dash !== q.dash || p.gap !== q.gap))) {
            setDashes(layer, p.dashed, p.dash, p.gap);
        }
    }
    function create(p) {
        var item = comp(), plan = A.Geometry.generate(p), layer = null;
        app.beginUndoGroup("AE Arrow — 创建箭头");
        try {
            layer = item.layers.addShape(); layer.name = "AE Arrow";
            layer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
            layer.property("ADBE Transform Group").property("ADBE Position").setValue([item.width / 2, item.height / 2]);
            initialize(layer); applyVisual(layer, plan); writeMetadata(layer, plan.params);
            var i;
            for (i = 1; i <= item.numLayers; i++) { if (item.layer(i).selected) { item.layer(i).selected = false; } }
            layer.selected = true;
            return { name: layer.name, warning: plan.warning, compId: item.id, layerId: layer.id };
        } catch (error) {
            if (layer) { try { layer.remove(); } catch (ignored) {} }
            throw error;
        } finally { app.endUndoGroup(); }
    }
    function read() {
        var target = selected(), stored = metadata(target.layer), root = owned(target.layer);
        return {
            params: A.Model.clone(stored.data.params), name: target.layer.name,
            modified: !root || fingerprint(root) !== stored.data.fingerprint,
            compId: target.compId, layerId: target.layerId
        };
    }
    function update(p, expected) {
        var target = checkTarget(expected), stored = metadata(target.layer), root = owned(target.layer);
        if (!root) { fail("管理分组已删除，请新建箭头。"); }
        if (fingerprint(root, true) !== stored.data.fingerprint) {
            fail("箭头内部路径或样式已被手动修改。本版保留这些改动；可读取原参数后创建新箭头。");
        }
        var plan = A.Geometry.generate(p), before = A.Geometry.generate(stored.data.params), oldComment = target.layer.comment;
        app.beginUndoGroup("AE Arrow — 更新箭头");
        try {
            applyVisual(target.layer, plan, before); writeMetadata(target.layer, plan.params);
            return { name: target.layer.name, warning: plan.warning, compId: target.compId, layerId: target.layerId };
        } catch (error) {
            var rollbackMessage = "";
            try {
                applyVisual(target.layer, before); target.layer.comment = oldComment;
                if (fingerprint(owned(target.layer)) !== stored.data.fingerprint) { rollbackMessage = "\n恢复未能完整确认，请用 AE 撤销本次操作。"; }
            } catch (rollbackError) { rollbackMessage = "\n恢复失败，请用 AE 撤销本次操作。"; }
            fail("更新未完成：" + error.message + rollbackMessage);
        } finally { app.endUndoGroup(); }
    }
    function exportPreset(p) {
        var params = A.Model.validate(p), file = File.saveDialog("保存箭头预设", "JSON:*.json");
        if (!file) { return false; }
        if (!/\.json$/i.test(file.name)) { file = new File(file.fsName + ".json"); }
        if (file.exists && !confirm("覆盖这个预设文件？\n" + file.fsName)) { return false; }
        file.encoding = "UTF-8";
        if (!file.open("w")) { fail("无法写入预设。请检查目录权限及 AE 的脚本文件访问设置。"); }
        try {
            if (!file.write(A.Codec.stringify({ tool: "ae-arrow-preset", schemaVersion: 1, params: params }))) { fail("预设写入失败。"); }
        } finally { file.close(); }
        return file.fsName;
    }
    function importPreset() {
        var file = File.openDialog("打开箭头预设", "JSON:*.json", false), content, value;
        if (!file) { return null; }
        if (file.length > 262144) { fail("预设文件过大（最多 256 KB）。"); }
        file.encoding = "UTF-8";
        if (!file.open("r")) { fail("无法读取预设文件。"); }
        try { content = file.read(); } finally { file.close(); }
        value = A.Codec.parse(content);
        if (!value || value.tool !== "ae-arrow-preset" || value.schemaVersion !== 1) { fail("这不是本工具支持的预设文件。"); }
        return A.Model.validate(value.params);
    }
    A.Host = { create: create, read: read, update: update, selection: selected, exportPreset: exportPreset, importPreset: importPreset };
}(Arrow));

/* ScriptUI shell: continuous local preview, optional commit on release. */
(function (A) {
    var MARKER_LABELS = ["无", "实心三角", "空心三角", "开放尖角", "燕尾", "圆点 / 椭圆", "方块", "菱形"];
    function indexOf(items, value) { var i; for (i = 0; i < items.length; i++) { if (items[i] === value) { return i; } } return 0; }
    function get(object, key) { var parts = key.split("."), i; for (i = 0; i < parts.length; i++) { object = object[parts[i]]; } return object; }
    function put(object, key, value) { var parts = key.split("."), i; for (i = 0; i < parts.length - 1; i++) { object = object[parts[i]]; } object[parts[parts.length - 1]] = value; }
    function hexColor(color) {
        var result = "#", i, part;
        for (i = 0; i < 3; i++) { part = Math.round(color[i] * 255).toString(16); result += part.length < 2 ? "0" + part : part; }
        return result.toUpperCase();
    }
    function parseColor(text) {
        text = text.replace(/^\s+|\s+$/g, "").replace(/^#/, "");
        if (!/^[0-9a-fA-F]{6}$/.test(text)) { throw new Error("颜色请输入六位十六进制，例如 #33A6FF。"); }
        return [parseInt(text.substr(0, 2), 16) / 255, parseInt(text.substr(2, 2), 16) / 255, parseInt(text.substr(4, 2), 16) / 255];
    }
    function open(thisObj, options) {
        var win = thisObj instanceof Panel ? thisObj : new Window("palette", "AE Arrow " + A.version, undefined, { resizeable: true });
        var state = A.Model.defaults(), plan = A.Geometry.generate(state), controls = {}, loading = false, target = null;
        var dragTarget = null, dragActive = false, dragBlocked = false, drawProblem = "";
        win.orientation = "column"; win.alignChildren = ["fill", "top"]; win.spacing = 8; win.margins = 12;
        win.minimumSize = [460, 650];
        var title = win.add("statictext", undefined, "AE Arrow  ·  箭头样式工具");
        var subtitle = win.add("statictext", undefined, "原生形状 · 静态生成 · 起终点独立设置");
        /* Use a drawable Image; AE's Image and Panel controls have no notify method. */
        var preview = win.add("image", undefined);
        preview.preferredSize = [440, 145]; preview.minimumSize = [360, 100]; preview.alignment = ["fill", "fill"];
        var previewNote = win.add("statictext", undefined, "示意预览自动缩放；AE 输出为实际尺寸的贝塞尔路径。");
        var common = win.add("group"); common.orientation = "row";
        common.add("statictext", undefined, "颜色");
        var colorText = common.add("edittext", undefined, hexColor(state.color)); colorText.characters = 9;
        var colorButton = common.add("button", undefined, "选色");
        var autoUpdate = common.add("checkbox", undefined, "松手更新已读取箭头"); autoUpdate.value = false;
        autoUpdate.helpTip = "本地预览在拖动时更新；AE 图层只在松手后写入一次。请先读取选中箭头。";

        var tabs = win.add("tabbedpanel"); tabs.alignChildren = ["fill", "top"]; tabs.preferredSize = [440, 360]; tabs.minimumSize.height = 350;
        var bodyTab = tabs.add("tab", undefined, "线身");
        var endsTab = tabs.add("tab", undefined, "端点");
        var presetsTab = tabs.add("tab", undefined, "预设");
        bodyTab.orientation = "column"; bodyTab.alignChildren = ["fill", "top"]; bodyTab.spacing = 5; bodyTab.margins = 10;
        endsTab.orientation = "row"; endsTab.alignChildren = ["fill", "top"]; endsTab.spacing = 10; endsTab.margins = 10;
        presetsTab.orientation = "column"; presetsTab.alignChildren = ["fill", "top"]; presetsTab.spacing = 10; presetsTab.margins = 12;

        var actions = win.add("group"); actions.orientation = "row"; actions.alignChildren = ["fill", "center"];
        var createButton = actions.add("button", undefined, "创建箭头");
        var readButton = actions.add("button", undefined, "读取选中");
        var updateButton = actions.add("button", undefined, "更新选中");
        var status = win.add("statictext", undefined, "准备就绪。请打开合成后创建箭头。", { multiline: true });
        status.preferredSize = [440, 48]; status.alignment = ["fill", "bottom"];
        var footer = win.add("statictext", undefined, "0.1.0 测试版 · AE 2026 · 松手后提交图层");

        function message(text) { status.text = text; status.helpTip = text; }
        function errorMessage(error) { message("操作未完成：" + (error.message || String(error))); }
        function redraw() {
            /* Re-show invalidates the control and lets AE paint on the next UI event. */
            try { preview.hide(); preview.show(); }
            catch (error) { message("预览刷新失败：" + (error.message || String(error))); }
        }
        function refreshPreview() {
            try { plan = A.Geometry.generate(state); drawProblem = ""; redraw(); if (plan.warning) { message(plan.warning); } return true; }
            catch (error) { drawProblem = error.message; redraw(); errorMessage(error); return false; }
        }
        function availability() {
            controls.bend.row.enabled = state.pathType === "curve";
            controls.dash.row.enabled = state.dashed; controls.gap.row.enabled = state.dashed;
            controls["start.length"].row.enabled = state.start.type !== "none";
            controls["start.width"].row.enabled = state.start.type !== "none";
            controls["start.notch"].row.enabled = state.start.type === "stealth";
            controls["end.length"].row.enabled = state.end.type !== "none";
            controls["end.width"].row.enabled = state.end.type !== "none";
            controls["end.notch"].row.enabled = state.end.type === "stealth";
        }
        function load(p) {
            var key;
            state = A.Model.validate(p); loading = true;
            try {
                for (key in controls) { if (controls.hasOwnProperty(key)) { controls[key].load(get(state, key)); } }
                colorText.text = hexColor(state.color);
            } finally { loading = false; }
            dragActive = false; dragTarget = null; dragBlocked = false;
            availability(); refreshPreview();
        }
        function tryAuto(expected) {
            if (!autoUpdate.value) { return; }
            if (!target || dragBlocked) { message("已更新面板预览。自动更新需要先读取一个箭头。"); return; }
            try {
                var result = A.Host.update(state, expected || target);
                target = { compId: result.compId, layerId: result.layerId };
                message("已更新：" + result.name + (result.warning ? "\n" + result.warning : ""));
            } catch (error) { errorMessage(error); }
        }
        function beginDrag() {
            if (dragActive) { return; }
            dragActive = true; dragTarget = null; dragBlocked = false;
            if (autoUpdate.value) {
                try {
                    var current = A.Host.selection();
                    if (!target || target.compId !== current.compId || target.layerId !== current.layerId) { dragBlocked = true; }
                    else { dragTarget = { compId: current.compId, layerId: current.layerId }; }
                } catch (ignored) { dragBlocked = true; }
            }
        }
        function change(key, value, commit) {
            if (loading) { return; }
            put(state, key, value); availability();
            if (refreshPreview() && commit) { tryAuto(dragTarget); }
            if (commit) { dragActive = false; dragTarget = null; dragBlocked = false; }
        }
        function numericControl(parent, label, key, min, max, sliderMin, sliderMax, compact) {
            var row = parent.add("group"); row.orientation = "row"; row.alignChildren = ["left", "center"];
            var labelControl = row.add("statictext", undefined, label); labelControl.preferredSize.width = compact ? 38 : 62;
            var field = row.add("edittext", undefined, String(get(state, key))); field.characters = compact ? 5 : 6;
            var slider = row.add("slider", undefined, get(state, key), sliderMin, sliderMax);
            slider.alignment = ["fill", "center"]; slider.preferredSize.width = compact ? 60 : 190;
            field.helpTip = "输入范围 " + min + "–" + max + "；滑条范围 " + sliderMin + "–" + sliderMax;
            slider.helpTip = field.helpTip;
            function formatted(n) { return String(Math.round(n * 100) / 100); }
            controls[key] = {
                row: row,
                load: function (value) { field.text = formatted(value); slider.value = Math.max(sliderMin, Math.min(sliderMax, value)); }
            };
            field.onChange = function () {
                if (loading) { return; }
                var text = field.text.replace(/^\s+|\s+$/g, ""), value = Number(text);
                if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || !isFinite(value) || value < min || value > max) {
                    controls[key].load(get(state, key)); message(label + "请输入 " + min + "–" + max + " 之间的数字。"); return;
                }
                slider.value = Math.max(sliderMin, Math.min(sliderMax, value)); field.text = formatted(value); change(key, value, true);
            };
            slider.onChanging = function () {
                if (loading) { return; }
                beginDrag(); var value = Math.round(slider.value * 100) / 100;
                field.text = formatted(value); change(key, value, false);
            };
            slider.onChange = function () {
                if (loading) { return; }
                var value = Math.round(slider.value * 100) / 100;
                field.text = formatted(value); change(key, value, true);
            };
            return row;
        }
        function selectControl(parent, label, key, values, labels) {
            var row = parent.add("group"); row.orientation = "row";
            row.add("statictext", undefined, label);
            var select = row.add("dropdownlist", undefined, labels); select.alignment = ["fill", "center"];
            select.selection = indexOf(values, get(state, key));
            controls[key] = { row: row, load: function (value) { select.selection = indexOf(values, value); } };
            select.onChange = function () { if (!loading && select.selection) { change(key, values[select.selection.index], true); } };
            return select;
        }
        selectControl(bodyTab, "线身", "pathType", ["straight", "curve"], ["直线", "贝塞尔曲线"]);
        numericControl(bodyTab, "总长度", "length", 10, 10000, 10, 2000, false);
        numericControl(bodyTab, "弯曲量", "bend", -3000, 3000, -700, 700, false);
        numericControl(bodyTab, "线宽", "strokeWidth", 0.5, 300, 0.5, 80, false);
        selectControl(bodyTab, "端帽", "cap", ["butt", "round", "square"], ["平头", "圆头", "方头"]);
        var dashed = bodyTab.add("checkbox", undefined, "虚线线身");
        controls.dashed = { load: function (value) { dashed.value = value; } };
        dashed.onClick = function () { change("dashed", dashed.value, true); };
        numericControl(bodyTab, "虚线长度", "dash", 0.5, 1000, 0.5, 150, false);
        numericControl(bodyTab, "虚线间隔", "gap", 0.5, 1000, 0.5, 100, false);
        numericControl(bodyTab, "起点留空", "startGap", 0, 2000, 0, 300, false);
        numericControl(bodyTab, "终点留空", "endGap", 0, 2000, 0, 300, false);

        function markerPanel(name, label) {
            var panel = endsTab.add("panel", undefined, label);
            panel.orientation = "column"; panel.alignChildren = ["fill", "top"]; panel.margins = 9; panel.spacing = 9;
            selectControl(panel, "类型", name + ".type", A.Model.markers, MARKER_LABELS);
            numericControl(panel, "长度", name + ".length", 1, 1000, 1, 160, true);
            numericControl(panel, "宽度", name + ".width", 1, 1000, 1, 160, true);
            numericControl(panel, "凹陷", name + ".notch", 0, 0.85, 0, 0.85, true);
            panel.add("statictext", undefined, "尺寸单位：图层局部像素\n圆点可用长宽调成椭圆。", { multiline: true });
        }
        markerPanel("start", "起点"); markerPanel("end", "终点");

        var presetNames = [], i;
        for (i = 0; i < A.Model.presets.length; i++) { presetNames.push(A.Model.presets[i].name); }
        var presetSelect = presetsTab.add("dropdownlist", undefined, presetNames); presetSelect.selection = 0;
        var presetApply = presetsTab.add("button", undefined, "载入内置样式");
        var presetActions = presetsTab.add("group");
        var exportButton = presetActions.add("button", undefined, "保存当前预设…");
        var importButton = presetActions.add("button", undefined, "打开预设…");
        var presetNote = presetsTab.add("statictext", undefined, "载入预设只改变面板参数；点击“更新选中”应用到现有箭头。\n可读取选中箭头，再创建新箭头以复制其样式。\n保存 / 打开预设可能需要开启 AE 的脚本文件访问权限。", { multiline: true });
        presetNote.preferredSize = [400, 95];
        presetApply.onClick = function () {
            try { load(A.Model.preset(presetSelect.selection.index)); message("已载入样式：" + presetSelect.selection.text + "。请创建或更新箭头。"); }
            catch (error) { errorMessage(error); }
        };
        exportButton.onClick = function () {
            try { var path = A.Host.exportPreset(state); if (path) { message("预设已保存：\n" + path); } }
            catch (error) { errorMessage(error); }
        };
        importButton.onClick = function () {
            try { var params = A.Host.importPreset(); if (params) { load(params); message("已打开预设。请创建或更新箭头。"); } }
            catch (error) { errorMessage(error); }
        };
        colorText.onChange = function () {
            if (loading) { return; }
            try { state.color = parseColor(colorText.text); colorText.text = hexColor(state.color); if (refreshPreview()) { tryAuto(target); } }
            catch (error) { colorText.text = hexColor(state.color); errorMessage(error); }
        };
        colorButton.onClick = function () {
            try {
                var picked = $.colorPicker();
                if (picked < 0) { return; }
                state.color = [((picked >> 16) & 255) / 255, ((picked >> 8) & 255) / 255, (picked & 255) / 255];
                colorText.text = hexColor(state.color); if (refreshPreview()) { tryAuto(target); }
            } catch (error) { errorMessage(error); }
        };
        autoUpdate.onClick = function () {
            if (autoUpdate.value && !target) { autoUpdate.value = false; message("请先读取选中箭头，再开启松手自动更新。"); }
            else { message(autoUpdate.value ? "已开启：拖动只预览，松手更新一次。" : "已关闭自动更新。参数调整后点击“更新选中”。"); }
        };
        createButton.onClick = function () {
            try {
                var result = A.Host.create(state); target = { compId: result.compId, layerId: result.layerId };
                message("已创建：" + result.name + (result.warning ? "\n" + result.warning : ""));
            } catch (error) { errorMessage(error); }
        };
        readButton.onClick = function () {
            try {
                var result = A.Host.read(); load(result.params); target = { compId: result.compId, layerId: result.layerId };
                if (result.modified) {
                    autoUpdate.value = false;
                    message("已读回原参数；内部内容有手动改动。本版保留改动，可用当前参数创建新箭头。");
                } else { message("已读取：" + result.name + "。可以调整参数并更新。"); }
            } catch (error) { target = null; autoUpdate.value = false; errorMessage(error); }
        };
        updateButton.onClick = function () {
            try {
                var result = A.Host.update(state, target); target = { compId: result.compId, layerId: result.layerId };
                message("已更新：" + result.name + (result.warning ? "\n" + result.warning : ""));
            } catch (error) { errorMessage(error); }
        };

        preview.onDraw = function () {
            var g = this.graphics, w = this.size.width, h = this.size.height;
            var background = g.newBrush(g.BrushType.SOLID_COLOR, [0.12, 0.13, 0.15, 1]);
            g.newPath(); g.rectPath(0, 0, w, h); g.fillPath(background);
            if (drawProblem || !plan || w < 34 || h < 30) { return; }
            var parts = [plan.body, plan.start, plan.end], lists = [], minX = 1e10, minY = 1e10, maxX = -1e10, maxY = -1e10;
            var i, j, points, point, p = plan.params;
            for (i = 0; i < parts.length; i++) {
                lists[i] = A.Geometry.samples(parts[i].shape, 24);
                if (!parts[i].visible) { continue; }
                for (j = 0; j < lists[i].length; j++) {
                    point = lists[i][j]; minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
                    minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
                }
            }
            if (minX > maxX) { return; }
            var pad = p.strokeWidth / 2;
            minX -= pad; maxX += pad; minY -= pad; maxY += pad;
            var scale = Math.min((w - 32) / Math.max(1, maxX - minX), (h - 28) / Math.max(1, maxY - minY));
            var offsetX = (w - (maxX - minX) * scale) / 2 - minX * scale;
            var offsetY = (h - (maxY - minY) * scale) / 2 - minY * scale;
            var rgba = [p.color[0], p.color[1], p.color[2], 1], pen = g.newPen(g.PenType.SOLID_COLOR, rgba, Math.max(0.5, p.strokeWidth * scale));
            var brush = g.newBrush(g.BrushType.SOLID_COLOR, rgba);
            function screen(value) { return [offsetX + value[0] * scale, offsetY + value[1] * scale]; }
            function drawPath(values, closed) {
                var n, v;
                g.newPath(); v = screen(values[0]); g.moveTo(v[0], v[1]);
                for (n = 1; n < values.length; n++) { v = screen(values[n]); g.lineTo(v[0], v[1]); }
                if (closed) { g.closePath(); }
            }
            function roundCap(value) {
                var v = screen(value), radius = p.strokeWidth * scale / 2;
                g.newPath(); g.ellipsePath(v[0] - radius, v[1] - radius, radius * 2, radius * 2); g.fillPath(brush);
            }
            function dashedPath(values) {
                /* Preview-only minimum lengths prevent thousands of subpixel drawing calls. */
                var previewDash = Math.max(p.dash, 2 / scale), previewGap = Math.max(p.gap, 2 / scale);
                var n, a, b, dx, dy, length, spent, step, at = 0, cycle = previewDash + previewGap, draw, left, from, to, budget = 2048;
                for (n = 1; n < values.length; n++) {
                    a = values[n - 1]; b = values[n]; dx = b[0] - a[0]; dy = b[1] - a[1]; length = Math.sqrt(dx * dx + dy * dy); spent = 0;
                    while (spent < length - 0.000001 && budget-- > 0) {
                        var position = at % cycle;
                        draw = position < previewDash; left = draw ? previewDash - position : cycle - position;
                        step = Math.min(length - spent, Math.max(0.000001, left));
                        if (draw) {
                            from = [a[0] + dx * spent / length, a[1] + dy * spent / length];
                            to = [a[0] + dx * (spent + step) / length, a[1] + dy * (spent + step) / length];
                            drawPath([from, to], false); g.strokePath(pen);
                        }
                        spent += step; at += step;
                    }
                }
            }
            for (i = 0; i < parts.length; i++) {
                if (!parts[i].visible) { continue; }
                points = lists[i];
                if (parts[i].fill) { drawPath(points, parts[i].shape.closed); g.fillPath(brush); }
                if (parts[i].stroke) {
                    if (i === 0 && p.dashed) { dashedPath(points); }
                    else {
                        drawPath(points, parts[i].shape.closed); g.strokePath(pen);
                        if (i === 0 && p.cap === "round") { roundCap(points[0]); roundCap(points[points.length - 1]); }
                    }
                }
            }
        };
        win.onResizing = win.onResize = function () { this.layout.resize(); redraw(); };
        win.onClose = function () { target = null; dragTarget = null; return true; };
        tabs.selection = bodyTab;
        load(state);
        win.layout.layout(true); win.layout.resize();
        if (win instanceof Window && (!options || options.show !== false)) { win.center(); win.show(); }
        return win;
    }
    A.UI = { open: open };
}(Arrow));

    Arrow.UI.open(thisObj);
}(this));