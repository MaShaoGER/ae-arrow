"""Inspect AE-generated PNG output. No image modification or screenshot capture."""
from PIL import Image
from pathlib import Path
import json
root = Path(__file__).resolve().parents[1] / 'test-results'
report = {'cases': [], 'passed': 0, 'failed': 0}
def check(name, callback):
    try:
        details = callback()
        report['passed'] += 1
        report['cases'].append({'name': name, 'status': 'pass', **details})
    except Exception as e:
        report['failed'] += 1
        report['cases'].append({'name': name, 'status': 'fail', 'error': str(e)})
def straight():
    im = Image.open(root / 'live-double.png').convert('RGBA')
    # Entire interior centerline, including both x=205/795 necks, must be opaque.
    assert im.size == (1000,600)
    pixels = [im.getpixel((x,300)) for x in range(155,845)]
    assert all(p[3] >= 250 for p in pixels), 'Transparent seam on arrow centerline'
    assert all(p[2] > p[0] for p in pixels), 'Unexpected color or blank shaft'
    return {'interiorPixelsChecked': len(pixels), 'minimumAlpha': min(p[3] for p in pixels)}
def curve():
    im = Image.open(root / 'live-curve.png').convert('RGBA')
    # Single connected alpha silhouette detects separated heads on curved source.
    w,h = im.size
    mask = {(x,y) for y in range(h) for x in range(w) if im.getpixel((x,y))[3] >= 128}
    assert mask
    todo=[next(iter(mask))]; remaining=set(mask); remaining.discard(todo[0])
    while todo:
        x,y=todo.pop()
        for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if p in remaining:
                remaining.remove(p); todo.append(p)
    assert not remaining, f'{len(remaining)} pixels detached from silhouette'
    return {'connectedPixelsChecked': len(mask)}
def spatial():
    front = Image.open(root / 'threeD-front.png').convert('RGBA')
    angled = Image.open(root / 'threeD-angled.png').convert('RGBA')
    assert front.size == angled.size == (1000, 600)
    bounds = []
    for im in [front, angled]:
        visible = [(x,y) for y in range(im.height) for x in range(im.width)
                   if im.getpixel((x,y))[3] >= 128 and im.getpixel((x,y))[2] > im.getpixel((x,y))[0]]
        assert len(visible) > 1000, '3D shaft and arrowhead are missing or clipped'
        bounds.append((min(x for x,y in visible), min(y for x,y in visible),
                       max(x for x,y in visible), max(y for x,y in visible)))
    assert bounds[0] != bounds[1], 'Source rotation and camera motion did not change the rendered projection'
    assert bounds[1][2] - bounds[1][0] < (bounds[0][2] - bounds[0][0]) * .9, 'Expected perspective foreshortening is missing'
    return {'frontBounds': bounds[0], 'angledBounds': bounds[1]}

check('Straight native render has no centerline seam', straight)
check('Curved native render is one connected silhouette', curve)
check('3D shaft and head remain visible and respond to camera perspective', spatial)
(root / 'live-render-tests.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
raise SystemExit(1 if report['failed'] else 0)
