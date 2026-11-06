#!/usr/bin/env python3
"""HG28: pack genuine independently rendered action frames into compact WebP atlases.

Never creates frames by rotating, warping, or shifting one still master.
Requires 5 source clip directories: idle, walk, attack, hit, death.
Example:
 python tools/pack_hg28_action_frames.py --unit human_4 \
   --source assets/licensed/kaykit-heavy-soldier/rendered \
   --output docs/qa/hg28-animation-pack-smoke
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageOps

ACTIONS=("idle","walk","attack","hit","death")
DURATION_MS={"idle":1100,"walk":820,"attack":720,"hit":520,"death":1000}
MAX_TEXTURE=2048
def sha(path:Path)->str:
 return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def pack(unit:str,source:Path,output:Path,cell:int=192)->dict:
 if not __import__('re').fullmatch(r'(human|elf|orc|undead)_(?:[1-9]|10)',unit):
  raise ValueError("Unit must be one of the canonical 40 troop IDs")
 if cell not in (128,192,256):
  raise ValueError("Use runtime cell 128, 192 or 256 px")
 if not source.exists():
  raise FileNotFoundError(source)
 output.mkdir(parents=True,exist_ok=True)
 result={"schema":"HG28-TrueActionAtlas-v1","unitId":unit,"format":"WebP-lossless-RGBA",
  "cell":cell,"origin":"independently rendered action frames","clips":{}}
 for action in ACTIONS:
  folder=source/action
  frames=sorted(folder.glob("*.png"))
  if not 8<=len(frames)<=24:
   raise ValueError(f"{unit}/{action}: expected 8..24 original frames, found {len(frames)}")
  bitmap=[];source_hashes=[]
  size=None
  for f in frames:
   with Image.open(f) as im:
    if im.mode!="RGBA":raise ValueError(f"{f} must be transparent RGBA")
    if size is None:size=im.size
    elif im.size!=size:raise ValueError(f"{f}: original frames need identical canvas dimensions")
    alpha=im.getchannel("A")
    lo,hi=alpha.getextrema()
    if lo!=0 or hi<100:raise ValueError(f"{f}: transparent silhouette source required")
    # Resize the WHOLE registered original canvas, never a per-frame moving
    # bounding-box crop: fixed feet/hand pivots must survive every animation.
    dest=Image.new("RGBA",(cell,cell),(0,0,0,0))
    view=ImageOps.contain(im,(cell,cell),Image.Resampling.LANCZOS)
    dest.alpha_composite(view,((cell-view.width)//2,(cell-view.height)//2))
    bitmap.append(dest)
    source_hashes.append(sha(f))
  if len(set(source_hashes))<max(6,int(len(frames)*.7)):
   raise ValueError(f"{unit}/{action}: too many exact duplicate frames; still-image movement is not a true clip")
  cols=min(MAX_TEXTURE//cell,len(bitmap))
  rows=math.ceil(len(bitmap)/cols)
  if rows*cell>MAX_TEXTURE:raise ValueError("Atlas exceeds GPU-safe dimension")
  atlas=Image.new("RGBA",(cols*cell,rows*cell),(0,0,0,0))
  for index,frame in enumerate(bitmap):
   atlas.alpha_composite(frame,((index%cols)*cell,(index//cols)*cell))
  target=output/f"{action}.webp"
  atlas.save(target,format="WEBP",lossless=True,quality=90,method=6)
  with Image.open(target) as loaded:
   if loaded.size!=atlas.size or loaded.getchannel("A").getextrema()[0]!=0:
    raise AssertionError(f"{target}: WebP lost alpha, frames, or dimensions")
  result["clips"][action]={
    "file":str(target).replace('\\','/'),"sha256":sha(target),
    "frames":len(bitmap),"durationMs":DURATION_MS[action],
    "loop":action in ("idle","walk"),"columns":cols,"rows":rows,
    "cell":cell,"sourceFrameHashes":source_hashes,
    "frameCanvas":list(size)}
 (output/"atlas-manifest.json").write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 return result
if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--unit",required=True)
 p.add_argument("--source",required=True,type=Path)
 p.add_argument("--output",required=True,type=Path)
 p.add_argument("--cell",type=int,default=192)
 a=p.parse_args()
 out=pack(a.unit,a.source,a.output,a.cell)
 print(f"PACKED {out['unitId']}: 5 source-backed action atlases, "+
       str(sum(x['frames'] for x in out['clips'].values()))+" genuine frames; no still transforms")
