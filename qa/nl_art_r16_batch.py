#!/usr/bin/env python3
"""R16 three-core troop focused asset gate; no gameplay, Save or CI mutation."""
from pathlib import Path
import json, hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/ngoalong/troops_r16_core'
M=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
assert M['status']=='VISUAL_CANDIDATE' and not M['inGame']
assert len(M['units'])==3
assert [u['id'] for u in M['units']]==['ky_binh','cung_binh','quan_van']
assert len(M['files'])==34, len(M['files'])
for f in M['files']:
 p=BASE/f['path']; b=p.read_bytes()
 assert len(b)==f['bytes'],str(p)
 assert hashlib.sha256(b).hexdigest()==f['sha256'],str(p)
 assert hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()==f['gitBlobSha'],str(p)
for u in M['units']:
 assert len(u['frames'])==8
 for frame in u['frames']:
  im=Image.open(BASE/frame['file']);assert im.size==(128,128) and im.mode=='RGBA'
  a=im.getchannel('A');bb=a.getbbox()
  assert a.getextrema()==(0,255),(u['id'],frame['action'])
  assert bb and bb[0]>=4 and bb[1]>=5 and bb[2]<=124 and bb[3]<=122,(u['id'],frame['action'],bb)
  assert frame['registeredFootPivot']==[64,121]
 atlas=Image.open(BASE/'atlases'/(u['id']+'_4x2_128.png'));assert atlas.size==(512,256) and atlas.mode=='RGBA'
 src=Image.open(BASE/'source'/(u['id']+'_original_lossless.webp'));assert src.size==(1774,887) and src.mode=='RGBA'
print('PASS: 3 distinct troop identities / 24 frame cells / 3 atlases / source SHA / 1x scale / true alpha. Owner approval pending.')
