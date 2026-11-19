#!/usr/bin/env python3
from pathlib import Path
from PIL import Image,ImageChops
import hashlib,json
root=Path(__file__).resolve().parents[1]/'assets/ngoalong/troops_r15_spear'
m=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
assert m['gameIntegration']=='NOT_IN_GAME' and m['artStatus']=='VISUAL_CANDIDATE'
assert len(m['frames'])==8 and m['pivot']==[64,121]
source=root/m['sourceMaster']['path']
assert source.is_file() and hashlib.sha256(source.read_bytes()).hexdigest()==m['sourceMaster']['sha256']
assert set(m['actionMapping'])=={'IDLE','ATTACK','HIT','SKILL','DEATH'}
atlas=Image.open(root/m['atlas']['path']).convert('RGBA')
assert atlas.size==(512,256)
for i,f in enumerate(m['frames']):
    p=root/f['path']; b=p.read_bytes()
    assert hashlib.sha256(b).hexdigest()==f['sha256']
    a=Image.open(p).convert('RGBA')
    assert a.size==(128,128) and a.getchannel('A').getextrema()==(0,255)
    assert atlas.crop(((i%4)*128,(i//4)*128,((i%4)+1)*128,((i//4)+1)*128)).tobytes()==a.tobytes()
    box=a.getchannel('A').point(lambda t:255 if t>18 else 0).getbbox()
    assert box and 2<box[0] and box[2]<126 and box[1]>=3 and box[3]<=122,(f['id'],box)
assert min(m['metrics']['frameDistinctChangeRatios'])>0.06
print('PASS: 8/8 distinct pose frames, alpha, clipping, pivot, atlas matching, SHA256; not-in-game.')
