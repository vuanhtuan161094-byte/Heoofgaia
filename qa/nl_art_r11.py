#!/usr/bin/env python3
"""One-pass R11 source-art QA. No browser, runtime or Save mutation."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/ngoalong/infantry_r11'

def main():
    d=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
    assert len(d['units'])==14
    assert len(d['quarantined'])==5
    assert len({u['id'] for u in d['units']})==14
    assert (BASE/'preview.html').is_file() and (BASE/'preview_80px.png').is_file()
    total=0
    for u in d['units']:
        assert u['state']=='VISUAL_CANDIDATE'
        decoded={}
        for pose in ('idle','attack'):
            meta=u[pose]
            file=BASE/meta['path']
            payload=file.read_bytes()
            assert len(payload)==meta['bytes'],file
            assert hashlib.sha256(payload).hexdigest()==meta['sha256'],file
            git_sha=hashlib.sha1(b'blob '+str(len(payload)).encode()+b'\x00'+payload).hexdigest()
            assert git_sha==meta['gitBlobSha'],file
            with Image.open(file) as im:
                assert im.mode=='RGBA' and im.size==(128,128),file
                im.load()
                alpha=im.getchannel('A')
                bbox=alpha.getbbox()
                assert list(bbox)==meta['alphaBounds'],file
                assert bbox[3]==121,('foot-line',file,bbox)
                assert not any(alpha.getpixel((0,y)) or alpha.getpixel((127,y)) for y in range(128)),file
                assert not any(alpha.getpixel((x,0)) or alpha.getpixel((x,127)) for x in range(128)),file
                decoded[pose]=im.copy()
            total+=1
        # The second pose must actually change pixels, not be a byte-identical still.
        changed=sum(1 for v in ImageChops.difference(decoded['idle'],decoded['attack']).getdata() if v!=(0,0,0,0))
        assert changed/(128*128)>0.20,u['id']
    print(f'PASS NL ART R11: {total}/28 128x128 RGBA; alpha/feet/sha/pose distinct; 14 candidates; 5 quarantined')
    print('PENDING: owner visual approval and Chat 08 integration; no Chromium/full CI claimed')

if __name__=='__main__':main()
