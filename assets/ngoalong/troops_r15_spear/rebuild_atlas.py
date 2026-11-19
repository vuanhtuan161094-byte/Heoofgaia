#!/usr/bin/env python3
"""Rebuild the only runtime-facing 4x2 packed atlas from registered original frame files."""
from pathlib import Path
from PIL import Image
import json
BASE=Path(__file__).resolve().parent
m=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
atlas=Image.new('RGBA',(512,256))
for i,fr in enumerate(m['frames']):
    img=Image.open(BASE/fr['path']).convert('RGBA')
    if img.size!=(128,128):raise ValueError(fr['path'])
    atlas.alpha_composite(img,((i%4)*128,(i//4)*128))
atlas.save(BASE/'atlas_4x2_128.png',optimize=True,compress_level=9)
