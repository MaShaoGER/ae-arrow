import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'tools' / 'ffx-builder'))
from ae_ffx import generate_ffx_file
def label(s):
    return s.encode('utf-8').decode('latin-1')
generate_ffx_file(label('箭头测试'), 'Pseudo/AEArrowProbe', [
    {'type': 'group', 'name': label('线身')},
    {'type': 'slider', 'name': label('粗细'), 'default_value': 8},
    {'type': 'endgroup', 'name': ''},
    {'type': 'dropdown', 'name': label('样式'), 'content': label('无|实心箭头|圆点'), 'default_value': 2},
], str(root / 'test-results' / 'pseudo-probe.ffx'))
