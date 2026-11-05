from __future__ import annotations
from collections import deque
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
ASSET_ROOT=ROOT/'assets/generated/hg28/troops'
SOURCE=ASSET_ROOT/'source/t9-t10-sheet.png'
UNITS=[
 ('human_9','Angel','human',9,0),('human_10','Archangel','human',10,1),
 ('elf_9','Green Dragon','elf',9,2),('elf_10','Fairy Dragon','elf',10,3),
 ('orc_9','Monster','orc',9,4),('orc_10','Behemoth','orc',10,5),
 ('undead_9','Bone Dragon','undead',9,6),('undead_10','Ghost Dragon','undead',10,7),
]
PROMPT='''Original polished painterly 2.5D fantasy strategy-game unit master sheet, transparent background, wide 2:1, four columns by two rows, one full-body character centered per equal square cell with no overlap, no borders or text. Consistent 3/4 isometric-facing-right view, whole silhouette and feet visible, detailed materials, cohesive premium game-art finish, readable at 64px. Row 1: Human Angel tier 9, noble white-and-gold winged knight with sword; Human Archangel tier 10, larger radiant elder angel with broad wings and ornate armor; Elf Green Dragon tier 9, emerald forest dragon with leaf-like wings; Elf Fairy Dragon tier 10, slender turquoise-silver faerie dragon with luminous wings. Row 2: Orc Monster tier 9, hulking moss-green swamp ogre with tusks and iron club; Orc Behemoth tier 10, larger ancient tusked beast with dark hide and bone armor; Undead Bone Dragon tier 9, ivory skeletal dragon with bony wings; Undead Ghost Dragon tier 10, spectral indigo-teal dragon with translucent wings and violet eyes. No gore, no chibi, no pixel art, no background, no props detached from their character.'''

def digest(path:Path)->str:
    h=sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest().upper()

def keep_largest_component(alpha:Image.Image)->tuple[Image.Image,tuple[int,int,int,int]]:
    w,h=alpha.size
    source=bytearray(1 if v>28 else 0 for v in alpha.getdata())
    labels=bytearray(w*h);sizes=[];boxes=[];label=0
    for start,on in enumerate(source):
        if not on or labels[start]:continue
        label+=1;labels[start]=label;todo=[start];n=0;minx=w;miny=h;maxx=maxy=-1
        while todo:
            idx=todo.pop();n+=1;x=idx%w;y=idx//w
            minx=min(minx,x);maxx=max(maxx,x);miny=min(miny,y);maxy=max(maxy,y)
            if x and source[idx-1] and not labels[idx-1]:labels[idx-1]=label;todo.append(idx-1)
            if x+1<w and source[idx+1] and not labels[idx+1]:labels[idx+1]=label;todo.append(idx+1)
            if y and source[idx-w] and not labels[idx-w]:labels[idx-w]=label;todo.append(idx-w)
            if y+1<h and source[idx+w] and not labels[idx+w]:labels[idx+w]=label;todo.append(idx+w)
        sizes.append(n);boxes.append((minx,miny,maxx+1,maxy+1))
    if not sizes:raise ValueError('Empty sprite cell')
    largest=max(range(len(sizes)),key=sizes.__getitem__)
    mask=Image.frombytes('L',(w,h),bytes(255 if v==largest+1 else 0 for v in labels))
    # Restore antialiased edge pixels near the one actual character; discard detached sheet specks.
    mask=mask.filter(ImageFilter.MaxFilter(3))
    filtered=ImageChops.multiply(alpha,mask)
    bounds=filtered.point(lambda v:255 if v>10 else 0).getbbox()
    if not bounds:raise ValueError('Filtered sprite became empty')
    return filtered,bounds

def main()->None:
    if not SOURCE.is_file():raise FileNotFoundError(SOURCE)
    sheet=Image.open(SOURCE).convert('RGBA');sw,sh=sheet.size
    if sw/sh<1.9 or sw/sh>2.1:raise ValueError(f'Expected the generated 2:1 sheet, got {sheet.size}')
    ASSET_ROOT.mkdir(parents=True,exist_ok=True)
    rows=[]
    for unit_id,name,race,tier,index in UNITS:
        col=index%4;row=index//4
        cell=(round(col*sw/4),round(row*sh/2),round((col+1)*sw/4),round((row+1)*sh/2))
        raw=sheet.crop(cell);alpha,bounds=keep_largest_component(raw.getchannel('A'))
        raw.putalpha(alpha)
        x0,y0,x1,y1=bounds
        sprite=raw.crop((x0,y0,x1,y1))
        scale=min(460/sprite.width,460/sprite.height)
        dims=(max(1,round(sprite.width*scale)),max(1,round(sprite.height*scale)))
        sprite=sprite.resize(dims,Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(512,512),(0,0,0,0))
        canvas.alpha_composite(sprite,((512-dims[0])//2,496-dims[1]))
        path=ASSET_ROOT/f'{unit_id}.png';canvas.save(path,optimize=True)
        a=canvas.getchannel('A');vis=a.point(lambda v:255 if v>10 else 0)
        visible=vis.getbbox();pixels=sum(v>10 for v in a.getdata())
        if canvas.size!=(512,512) or not visible or pixels<10000:raise ValueError(f'Asset QA failed: {unit_id}')
        rows.append({
          'id':unit_id,'name':name,'race':race,'tier':tier,'kind':'master-still','sourceCell':{'row':row+1,'column':col+1,'rect':list(cell)},
          'path':path.relative_to(ROOT).as_posix(),'resolution':'512x512','mode':'RGBA','pivot':[0.5,0.95],
          'alphaVisiblePixels':pixels,'alphaBounds':list(visible),'bytes':path.stat().st_size,'sha256':digest(path),
          'animation':'MASTER_STILL_ONLY; no generated action frames. Ready for video2dsprite when real action clips are available.'
        })
        print(unit_id,rows[-1]['resolution'],rows[-1]['alphaBounds'],rows[-1]['bytes'],rows[-1]['sha256'])
    manifest={
      'schema':'HG28-Troop-Masters-v1','status':'RECREATED','asOf':'2026-11-05',
      'goal':'Eight modern original high-tier troop masters for the four Heroes of Gaia races.',
      'source':{'route':'OpenAI ImageGen','sheet':SOURCE.relative_to(ROOT).as_posix(),'sheetResolution':list(sheet.size),'sheetBytes':SOURCE.stat().st_size,'sheetSha256':digest(SOURCE),'promptFile':'assets/generated/hg28/troops/generation-prompts.md','promptSha256':sha256(PROMPT.encode()).hexdigest().upper(),'license':'AI-generated original art; no third-party source/license is asserted.'},
      'processing':{'pipeline':'tools/crop_hg28_troop_masters.py','registeredCanvas':'512x512','pivot':[0.5,0.95],'alpha':'Keep largest connected character silhouette and antialiased edge; discard detached sheet artifacts.'},
      'animationDisclosure':'These are still masters, not animation sheets. Existing battle animation systems remain intact. The video2dsprite skill requires real action clips; none are included in this source.',
      'units':rows
    }
    (ASSET_ROOT/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ASSET_ROOT/'generation-prompts.md').write_text('# HG28 T9–T10 troop masters\n\n'+PROMPT+'\n\nGenerated as one transparent 4×2 identity sheet, then separated and registered by `tools/crop_hg28_troop_masters.py`. AI-generated original artwork; no third-party source/license is asserted.\n',encoding='utf-8')
    print('MANIFEST',digest(ASSET_ROOT/'asset-manifest.json'))
if __name__=='__main__':main()
