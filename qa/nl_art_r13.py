#!/usr/bin/env python3
"""R13 two-character isolated asset gate (art only; never runs gameplay/Save)."""
from pathlib import Path
import hashlib, json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/ngoalong/infantry_r13'
M=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
assert M['artState']=='VISUAL_CANDIDATE' and M['integration']=='NOT_IN_GAME'
assert {x['id'] for x in M['units']}=={'hoang_bo','phan_quan'}
assert all(x['footPivot']==[64,121] for x in M['units'])
files=M['files']
assert len(files)==6 and len({f['path'] for f in files})==len(files)
for f in files:
    p=BASE/f['path']; raw=p.read_bytes()
    assert len(raw)==f['bytes'],str(p)
    assert hashlib.sha256(raw).hexdigest()==f['sha256'],str(p)
    sha=hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()
    assert sha==f['gitBlobSha'],str(p)
    img=Image.open(p)
    assert list(img.size)==f['dimensions'] and img.mode==f['mode'],str(p)
    if f['path'].startswith('sprites/idle/'):
        assert img.size==(128,128) and img.mode=='RGBA'
        alpha=img.getchannel('A')
        assert alpha.getextrema()==(0,255),str(p)
        b=alpha.point(lambda x:255 if x>=16 else 0).getbbox()
        assert b is not None and b[0]>=4 and b[1]>=4 and b[2]<=124 and b[3]<=124, (p,b)
        assert 120<=b[3]<=123,(p,b)
print(f'PASS NL ART R13: {len(files)} files, two IDLE RGBA, fixed pivot and SHA-256/Git blob checks. Owner approval PENDING.')
