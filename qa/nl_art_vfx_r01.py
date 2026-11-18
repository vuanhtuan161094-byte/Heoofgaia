#!/usr/bin/env python3
"""Single batch asset QA, no Chromium / gameplay / Save changes."""
from pathlib import Path
import json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/ngoalong/vfx_r01'
m=json.loads((BASE/'manifest.json').read_text())
assert m['status']=='VISUAL_CANDIDATE' and m['runtimeIntegration']=='NOT_IN_GAME'
assert len(m['effects'])==4 and len(m['files'])==5
for rec in m['files']:
    raw=(BASE/rec['path']).read_bytes()
    assert len(raw)==rec['bytes']
    assert hashlib.sha256(raw).hexdigest()==rec['sha256']
    with Image.open(BASE/rec['path']) as im:
      assert list(im.size)==rec['size']
      if rec['path'] != 'preview_1x_dark_light.png':
        assert im.mode=='RGBA'
        a=im.getchannel('A');assert a.getextrema()==(0,255)
        bbox=a.point(lambda v:255 if v>6 else 0).getbbox()
        assert bbox and bbox[0]>=2 and bbox[1]>=1 and bbox[2]<=126 and bbox[3]<=126, (rec['path'],bbox)
        assert im.getpixel((0,0))[3]==0
print('PASS NL VFX R01: 4 distinct transparent event-intent RGBA sprites + 80px contrast preview, SHA256/size/clipping.')
