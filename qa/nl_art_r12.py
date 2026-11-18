#!/usr/bin/env python3
"""One-shot, art-only, pixel/manifest QA for R12. Never opens or mutates runtime."""
import hashlib
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/ngoalong/infantry_r12'

def main():
    m = json.loads((ART/'manifest.json').read_text(encoding='utf-8'))
    assert m['status'] == 'VISUAL_CANDIDATE'
    assert m['integration'] == 'NOT_IN_GAME'
    assert m['unit']['footPivot'] == [64,121]
    assert len(m['files']) == 3
    for rec in m['files']:
        p=ART/rec['path']; raw=p.read_bytes()
        assert len(raw) == rec['bytes'], p
        assert hashlib.sha256(raw).hexdigest() == rec['sha256'], p
        assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest() == rec['gitBlobSha'], p
        with Image.open(p) as im:
            assert im.mode == 'RGBA' or 'preview/' in rec['path'], p
            assert list(im.size) == rec['dimensions'], p
            if 'preview/' not in rec['path']:
                a=im.getchannel('A'); assert a.getextrema()==(0,255), p
                b=a.point(lambda v:255 if v>6 else 0).getbbox()
                assert b and b[0]>2 and b[1]>2 and b[2]<im.width-2 and b[3]<im.height-2, (p,b)
                if 'sprites/' in rec['path']:
                    assert b[1] <= 12 and 115<=b[3]<=122, b
                    # A single image must not have opaque rectangular background.
                    assert im.getpixel((0,0))[3] == 0
    print('PASS NL ART R12: 3 PNG hashes, 128x128 RGBA pivot, 512 source, alpha/clipping, 80px preview.')

if __name__ == '__main__':main()
