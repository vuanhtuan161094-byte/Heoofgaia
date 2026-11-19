#!/usr/bin/env python3
"""Regenerate R16 individual 128x128 sprites and 4x2 atlases from committed lossless source sheets.
No rig, fake frame interpolation, or combat/gameplay code.
"""
from pathlib import Path
from PIL import Image

BASE=Path(__file__).resolve().parent
ACTIONS=['idle_00','idle_01','attack_anticipation','attack_contact','attack_recovery','hit','skill','death']

for unit in ('ky_binh','cung_binh','quan_van'):
    source=Image.open(BASE/'source'/f'{unit}_original_lossless.webp').convert('RGBA')
    assert source.size==(1774,887)
    w,h=source.size
    atlas=Image.new('RGBA',(512,256),(0,0,0,0))
    for i,action in enumerate(ACTIONS):
        c,r=i%4,i//4
        tile=source.crop((round(c*w/4),round(r*h/2),round((c+1)*w/4),round((r+1)*h/2)))
        bb=tile.getchannel('A').point(lambda alpha:255 if alpha>=12 else 0).getbbox()
        if not bb:raise ValueError(f'empty pose {unit}/{action}')
        bb=(max(0,bb[0]-2),max(0,bb[1]-2),min(tile.width,bb[2]+2),min(tile.height,bb[3]+2))
        src=tile.crop(bb)
        ratio=min(116/src.width,111/src.height)
        nw,nh=round(src.width*ratio),round(src.height*ratio)
        src=src.resize((nw,nh),Image.Resampling.LANCZOS)
        assert 64-nw//2>=3 and 121-nh>=5
        cell=Image.new('RGBA',(128,128),(0,0,0,0))
        cell.alpha_composite(src,(64-nw//2,121-nh))
        path=BASE/'frames'/unit/f'{action}.png'
        path.parent.mkdir(parents=True,exist_ok=True)
        cell.save(path,optimize=True,compress_level=9)
        atlas.alpha_composite(cell,((i%4)*128,(i//4)*128))
    out=BASE/'atlases'/f'{unit}_4x2_128.png'
    out.parent.mkdir(parents=True,exist_ok=True)
    atlas.save(out,optimize=True,compress_level=9)
print('Rebuilt 3 identities / 24 PNG frames / 3 PNG atlases from lossless source sheets')
