"""Build the control preset and embed it in the standalone JSX (no runtime Python)."""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools' / 'ffx-builder'))
import ae_ffx

DISPLAY_NAME = '◆ 箭头样式 · 在此调整'
MATCH_NAME = 'Pseudo/AEArrow0503-0503'
controls = []
indices = {}

def add(kind, name, key=None, **options):
    # FFX strings are UTF-8; the generator writes a byte-preserving latin-1 string.
    if len(name.encode('utf-8')) > 35:
        raise ValueError('FFX parameter names must fit the 35-byte field: ' + name)
    item = dict(type=kind, name=name.encode('utf-8').decode('latin-1'), **options)
    for field in ('content', 'label'):
        if field in item:
            item[field] = item[field].encode('utf-8').decode('latin-1')
    controls.append(item)
    if key:
        indices[key] = len(controls)

def slider(name, key, value, maximum=600, **options):
    add('slider', name, key, default_value=value, valid_min=0, valid_max=10000,
        slider_min=0, slider_max=maximum, precision=1, **options)

add('group', '线身')
slider('粗细', 'width', 8, 300, pixel=True)
add('color', '颜色', 'color', red=51, green=166, blue=255)
add('checkbox', '虚线', 'dashed', default_value=False)
slider('虚线长度', 'dash', 24, 200, pixel=True)
slider('虚线间隔', 'gap', 14, 200, pixel=True)
add('endgroup', '')
styles = '无|箭头|有刺|V 形|圆|方框|菱形|方形尾部|三角尾部|内半圆|外半圆'
for end, title, default in [('start', '起点', 1), ('end', '终点', 2)]:
    add('group', title)
    add('dropdown', '样式', end + 'Type', content=styles, default_value=default, hold=True)
    slider('端点高度', end + 'Width', 72, pixel=True)
    add('checkbox', '成比例', end + 'Proportional', default_value=True)
    slider('长度 / 大小', end + 'Length', 50, 200, percent=True)
    add('group', '按样式调整')
    slider('箭头 · 内偏移', end + 'Inset', 0, 100, percent=True)
    slider('有刺 · 厚度', end + 'Thickness', 10, 100, percent=True)
    slider('V 形 · V 形长度', end + 'VLength', 50, 200, percent=True)
    slider('方形尾部 · 缩进大小', end + 'SquareIndent', 25, 100, percent=True)
    slider('三角尾 / 内半圆缩进', end + 'TailIndent', 0, 100, percent=True)
    add('endgroup', '')
    add('endgroup', '')

# The upstream generator adds a short UUID. Keep this schema's matchName stable.
original_uuid = ae_ffx.uuid.uuid4
try:
    ae_ffx.uuid.uuid4 = lambda: '0503'
    binary = ae_ffx.FFXGenerator(DISPLAY_NAME.encode('utf-8').decode('latin-1'),
                                'Pseudo/AEArrow0503', controls).ffx_data
finally:
    ae_ffx.uuid.uuid4 = original_uuid
(ROOT / 'dist').mkdir(exist_ok=True)
(ROOT / 'dist' / 'AE Arrow Controls.ffx').write_bytes(binary)

chunks = [''.join('\\x%02x' % b for b in binary[i:i + 128])
          for i in range(0, len(binary), 128)]
data = '\n        + '.join('"' + chunk + '"' for chunk in chunks)
template = (ROOT / 'src' / 'pseudo-template.jsxinc').read_text(encoding='utf-8')
result = template.replace('__DISPLAY_NAME__', json.dumps(DISPLAY_NAME, ensure_ascii=False))
result = result.replace('__MATCH_NAME__', json.dumps(MATCH_NAME))
result = result.replace('__INDICES__', json.dumps(indices)).replace('__BINARY__', data)
(ROOT / 'src' / 'pseudo.jsxinc').write_text(result, encoding='utf-8')
(ROOT / 'docs' / 'pseudo-schema.json').write_text(json.dumps({
    'name': DISPLAY_NAME, 'matchName': MATCH_NAME, 'indices': indices,
    'controls': [{**item, **{field: item[field].encode('latin-1').decode('utf-8')
                 for field in ('name', 'content', 'label') if field in item}}
                 for item in controls]}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Built embedded pseudo effect: %d bytes, %d parameters' % (len(binary), len(controls)))
