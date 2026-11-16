#!/usr/bin/env python3
"""Produce separate 2D frames from owner-created P4 troop sheet (NO RIG).
These frames are programmatically re-composited from two original pose masters, with
frame-specific painted illumination, movement smears and contact sparks. They are
NOT individually artist-drawn keyframes and are not claimed as such.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from pathlib import Path
import math, json, hashlib
from functools import lru_cache
from PIL import ImageChops
ROOT=Path(__file__).resolve().parents[1]
SRC=Image.open(ROOT/'assets/p4/troops.webp').convert('RGBA')
assert SRC.size==(960,720)
CW, CH=100, 144
COUNT=6
COLS=8
ROWS=4*4*3*COUNT//COLS
atlas=Image.new('RGBA',(COLS*CW,ROWS*CH),(0,0,0,0))
frames_dir=ROOT/'assets/p41/frames'
frames_dir.mkdir(parents=True,exist_ok=True)
names=('infantry','cavalry','archer','strategist')
directions=('front','right','back','left')
actions=('idle','attack','hit')
meta={'version':'P4.1','frameWidth':CW,'frameHeight':CH,'columns':COLS,'framesPerAction':COUNT,
      'units':{},'frameCount':0,'source':'P4 original troop sprite atlas',
      'method':'frame-by-frame composite from two pose masters + custom painted motion/contact; NO RIG',
      'fps':{'idle':8,'attack':10,'hit':10},'license':'new user-project AI illustration, do not imply extraction from Ngọa Long'}

@lru_cache(maxsize=64)
def prep(row,dir,attack=False):
    cell=SRC.crop(((dir+(4 if attack else 0))*120,row*180,(dir+(5 if attack else 1))*120,(row+1)*180))
    # Remove accidental sprites spilling across atlas cell borders. Keep the main
    # contiguous 2D character silhouette and its antialiased edge; no rigging.
    alpha=cell.getchannel('A');w,h=cell.size;pix=alpha.load();seen=set();biggest=[]
    for y in range(h):
        for x in range(w):
            if pix[x,y]<38 or (x,y) in seen:continue
            stack=[(x,y)];seen.add((x,y));comp=[]
            while stack:
                xx,yy=stack.pop();comp.append((xx,yy))
                for nx,ny in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
                    if 0<=nx<w and 0<=ny<h and (nx,ny) not in seen and pix[nx,ny]>=38:
                        seen.add((nx,ny));stack.append((nx,ny))
            if len(comp)>len(biggest):biggest=comp
    keep=Image.new('L',(w,h),0);kp=keep.load()
    for xx,yy in biggest:kp[xx,yy]=255
    # Three-pixel feather reattaches subpixel edge details without isolated bleed.
    keep=keep.filter(ImageFilter.MaxFilter(5))
    a=ImageChops.multiply(alpha,keep).point(lambda v:0 if v<15 else v)
    cell.putalpha(a)
    cell.thumbnail((92,134),Image.Resampling.LANCZOS)
    return cell

def overlay(effect,ix,dir,act,row):
    d=ImageDraw.Draw(effect,'RGBA')
    t=ix/5
    if act=='idle':
        # Separate torch/morale-gleam pixels; deliberate subtle looping animation.
        if ix in (1,3,4):
            x=47+int(4*math.sin(ix*1.8+row));y=32+int(ix*1.5)
            d.ellipse((x-1,y-2,x+1,y+2),fill=(238,207,133,88))
    elif act=='attack':
        # Per-frame bright curved streaks, with directional arc. 2D pixels only.
        if ix in (2,3,4):
            side=(-1 if dir in (2,3) else 1)
            xx=50+side*(11+5*(ix-2)); yy=60-(ix-2)*6
            color=((255,233,159,190),(255,184,92,158),(238,168,113,90))[ix-2]
            d.arc((xx-36,yy-31,xx+22,yy+24),start=240 if side>0 else 50,end=350 if side>0 else 165,fill=color,width=4 if ix==3 else 3)
            d.line((xx-11,yy-3,xx+side*17,yy-19),fill=(255,253,218,165),width=2)
            if row==2:
                # arrow trail from archer
                d.line((xx-36,yy-18,xx+side*24,yy-18),fill=(232,248,191,200),width=2)
            if row==3:
                d.arc((xx-20,yy-10,xx+20,yy+15),start=10,end=160,fill=(150,195,255,180),width=3)
    elif act=='hit':
        if ix in (1,2,3):
            # Concise directional contact sparks that vanish rather than UI circles.
            x=48+(-9 if dir in (0,1) else 9);y=64
            strength=(190,135,80)[ix-1]
            d.line((x-13,y-9,x+15,y+9),fill=(255,222,165,strength),width=3)
            d.line((x-9,y+11,x+7,y-14),fill=(255,246,224,strength),width=2)
            for a in range(0,360,60):
                rr=14+ix*3; dx=math.cos(math.radians(a));dy=math.sin(math.radians(a))
                d.line((x+dx*(rr-3),y+dy*(rr-3),x+dx*rr,y+dy*rr),fill=(255,189,123,max(50,strength-50)),width=2)

def frame_for(row,di,act,fi):
    idle=prep(row,di,False);attack=prep(row,di,True)
    im=Image.new('RGBA',(CW,CH),(0,0,0,0))
    if act=='idle':
        source=idle;dy=(0,-1,-2,-2,-1,0)[fi];dx=(0,0,1,0,-1,0)[fi]
        scale=(1,1.008,1.019,1.019,1.008,1)[fi]
    elif act=='attack':
        source=[idle,attack,attack,attack,attack,idle][fi]
        dx=[0,-5,1,9,4,0][fi]*(1 if di in (0,1) else -1)
        dy=[0,0,-2,-1,2,0][fi]
        scale=[1,1.00,1.03,1.045,1.012,1][fi]
    else:
        source=[idle,attack,attack,idle,idle,idle][fi]
        dx=[0,-5,-9,-6,-3,0][fi]*(1 if di in (0,1) else -1)
        dy=[0,2,5,4,2,0][fi]
        scale=[1,0.98,.94,.95,.98,1][fi]
    ow=int(source.width*scale);oh=int(source.height*scale)
    source=source.resize((max(1,ow),max(1,oh)),Image.Resampling.LANCZOS)
    # Registration baseline: feet at y=137 on every frame; stable central pivot.
    x=CW//2-source.width//2+dx
    y=137-source.height+dy
    im.alpha_composite(source,(x,y))
    fx=Image.new('RGBA',(CW,CH),(0,0,0,0))
    overlay(fx,fi,di,act,row)
    im=Image.alpha_composite(im,fx)
    return im

for row,name in enumerate(names):
    meta['units'][name]={}
    for di,direction in enumerate(directions):
        meta['units'][name][direction]={}
        for act in actions:
            indices=[]
            for fi in range(COUNT):
                frame=frame_for(row,di,act,fi)
                idx=meta['frameCount'];cx=(idx%COLS)*CW;cy=(idx//COLS)*CH
                atlas.alpha_composite(frame,(cx,cy))
                filename=f'{name}_{direction}_{act}_{fi:02d}.png'
                frame.save(frames_dir/filename)
                indices.append(idx)
                meta['frameCount']+=1
            meta['units'][name][direction][act]=indices
assert meta['frameCount']==288
assert atlas.size==(800,5184)
art=ROOT/'assets/p41'
atlas.save(art/'troops_p41.webp',format='WEBP',lossless=False,quality=79,method=6)
meta['atlasSha256']=hashlib.sha256((art/'troops_p41.webp').read_bytes()).hexdigest()
meta['atlasBytes']=(art/'troops_p41.webp').stat().st_size
(meta_path:=art/'troops_manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
# Visual proof matrix with 12 sample characters, front/right frames and action progression
preview=Image.new('RGBA',(3*CW*3,4*CH),(15,29,34,255));d=ImageDraw.Draw(preview)
for row in range(4):
 for act_i,act in enumerate(actions):
  for f_i,fi in enumerate((0,2,3)):
   frame=frame_for(row,1,act,fi)
   preview.alpha_composite(frame,((act_i*3+f_i)*CW,row*CH))
preview.convert('RGB').save(ROOT/'qa/p41-contact.jpg',quality=88)
print(f"P41 {meta['frameCount']} unique frame files, atlas {atlas.size}, {meta['atlasBytes']} bytes, SHA {meta['atlasSha256']}")
