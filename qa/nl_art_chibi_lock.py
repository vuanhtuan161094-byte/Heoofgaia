#!/usr/bin/env python3
"""One-batch R11 asset reference integrity check; subjective art approval is manual."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image


def check(repo: Path) -> None:
    base = repo / 'assets/ngoalong/chibi_style_r11'
    document = json.loads((base / 'reference_manifest.json').read_text(encoding='utf-8'))
    assert document['schema'] == 'NL-R11-CHIBI-STYLE-LOCK/V1'
    assert document['sourceApproval'] == 'STYLE_CONFIRMED_NOT_INDIVIDUAL_ART'
    assert document['runtimeIntegration'] == 'NOT_IN_GAME'
    entries = document['units']
    assert len(entries) == 14 and len({u['id'] for u in entries}) == 14
    assert document['referenceCount'] == len(entries)
    n = 0
    for u in entries:
        assert u['style'] == 'USER_CONFIRMED_R11_REFERENCE'
        assert u['artState'] == 'VISUAL_CANDIDATE'
        assert u['pivot'] == [64, 121] and u['size'] == [128, 128]
        for pose in ('idle', 'attack'):
            f = repo / u[pose]['file']
            data = f.read_bytes()
            assert hashlib.sha256(data).hexdigest() == u[pose]['sha256'], str(f)
            im = Image.open(f)
            assert im.format == 'PNG' and im.mode == 'RGBA' and im.size == (128, 128), str(f)
            a = im.getchannel('A')
            assert a.getextrema() == (0, 255), str(f)
            bbox = a.point(lambda v: 255 if v >= 12 else 0).getbbox()
            assert tuple(u[pose]['bounds']) == bbox, (f, bbox)
            assert bbox[0] >= 6 and bbox[1] >= 5 and bbox[2] <= 122 and bbox[3] == 121, (f, bbox)
            n += 1
    excluded = {u['id']: u['state'] for u in document['reviewCorrections']}
    assert excluded == {'giap_bo': 'QUARANTINED', 'hoang_bo': 'VISUAL_CANDIDATE',
                        'phan_quan': 'QUARANTINED', 'loi_kiem_si': 'QUARANTINED',
                        'van_khuc': 'QUARANTINED'}
    print(f'PASS R11 STYLE-LOCK: {len(entries)} identity refs; {n} byte-exact PNG RGBA poses, 128px, alpha, pivot and bounds.')
    print('NOT CLAIMED: new R14 sprites, artistic approval, real event integration or full CI.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo-root', type=Path, default=Path(__file__).resolve().parents[1])
    check(parser.parse_args().repo_root)
