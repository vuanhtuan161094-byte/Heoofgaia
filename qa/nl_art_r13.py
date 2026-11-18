#!/usr/bin/env python3
"""Single-pass independent asset checks. Never claims engine integration."""
from pathlib import Path
import hashlib,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/ngoalong/infantry_r13'
M=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
assert M['artState']=='VISUAL_CANDIDATE' and M['integration']=='NOT_IN_GAME'
assert M['unit']['footPivot']==[64,121]
for f in M['files']:
 p=BASE/f['path']; raw=p.read_bytes()
 assert len(raw)==f['bytes'],str(p)
 assert hashlib.sha256(raw).hexdigest()==f['sha256'],str(p)
 assert hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()==f['gitBlobSha'],str(p)
 img=Image.open(p)
 assert list(img.size)==f['dimensions'] and img.mode==f['mode'],str(p)
 if f['path'].endswith('hoang_bo.png'):
  assert img.size==(128,128) and img.mode=='RGBA'
  b=img.getchannel('A').point(lambda x:255 if x>=16 else 0).getbbox()
  assert b and b[0]>=5 and b[1]>=4 and b[2]<=123 and b[3]<=122,b
print('PASS: 3 assets, RGBA, 128×128, alpha, safe clipping, pivot, SHA-256, Git blob SHA; visual remains candidate')
