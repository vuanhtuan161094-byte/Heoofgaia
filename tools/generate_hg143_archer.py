"""HG14.3 deterministic, source-registered Human Archer frame-by-frame atlas builder.

Art source: assets/generated/hg11/units/human-archer.png. This creates 48 genuinely
different composited poses from independently pivoted original-art layers, not 48
copies of the same whole-image tilt. No online dependency or generative service.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/generated/hg11/units/human-archer.png"
OUT = ROOT / "assets/generated/hg143/animation"
ATLAS = OUT / "human-archer-atlas.png"
METADATA = OUT / "human-archer-atlas.json"
ACTIONS = ("idle", "walk", "draw", "release", "hit", "death")
COUNT = 8
SIZE = 256

# Authored source-art cut-lines in 512×512 reference coordinates. These masks
# preserve the original archer's face, outfit, bow, quiver and footwear.
POLYGONS = {
 "bow": [(304,53),(327,53),(343,108),(340,180),(338,273),(317,359),(290,365),(298,328),(302,260),(305,170)],
 "arrow": [(235,217),(365,219),(366,239),(232,240)],
 "left_arm": [(163,187),(192,185),(216,191),(249,209),(261,227),(254,245),(223,244),(194,238),(169,229),(158,209)],
 "right_arm": [(262,182),(282,188),(301,204),(331,215),(332,248),(308,257),(279,230),(266,220)],
 "left_leg": [(178,298),(229,300),(233,341),(230,384),(232,453),(163,455),(169,393),(169,339)],
 "right_leg": [(228,298),(282,305),(297,356),(305,448),(220,454),(221,387)],
 "head": [(198,95),(256,94),(267,107),(275,135),(258,175),(197,182),(191,140)]
}
PIVOTS = {
 "left_arm": (183,199), "right_arm": (267,196),
 "left_leg": (208,311), "right_leg": (251,313),
 "head": (230,158), "bow": (311,229)
}
ACTION_MS = {"idle": 1100, "walk": 750, "draw": 510, "release": 360, "hit": 540, "death": 950}

def sha256(path):
 return hashlib.sha256(path.read_bytes()).hexdigest()

def build():
 src = Image.open(SOURCE).convert("RGBA")
 if src.size != (512,512):
  raise ValueError("Human Archer source should be a 512x512 premultiplied-safe RGBA master")
 layers = {}
 for name, polygon in POLYGONS.items():
  mask = Image.new("L",src.size,0)
  ImageDraw.Draw(mask).polygon(polygon,fill=255)
  mask = mask.filter(ImageFilter.GaussianBlur(1.1))
  layer = src.copy()
  layer.putalpha(ImageChops.multiply(src.getchannel("A"),mask))
  layers[name] = layer
 core = src.copy()
 for layer in layers.values():
  core.putalpha(ImageChops.subtract(core.getchannel("A"),layer.getchannel("A")))

 def joint(layer,pivot,angle=0,dx=0,dy=0):
  result=layer.rotate(angle,Image.Resampling.BICUBIC,center=pivot,expand=False)
  if dx or dy:
   result=result.transform(result.size,Image.Transform.AFFINE,
      (1,0,-dx,0,1,-dy),resample=Image.Resampling.BICUBIC)
  return result

 def pose(action,i):
  t=i/COUNT
  phase=t*math.tau
  if action=="idle":
   left=math.sin(phase)*1.5;right=-math.sin(phase)*1.5
   arms=1.5*math.sin(phase);bob=-1.3*math.sin(phase)
   head=1.6*math.sin(phase)+.9*math.cos(phase)
   bow=1.5*math.sin(phase)+.8*math.cos(phase)
  elif action=="walk":
   left=20*math.sin(phase);right=-20*math.sin(phase)
   arms=11*math.sin(phase+math.pi);bob=-3*abs(math.sin(phase))
   head=3*math.sin(phase)+1.2*math.cos(phase)
   bow=-8*math.sin(phase)+1.5*math.cos(phase)
  elif action=="draw":
   q=(i+1)/COUNT
   left=-3;right=2;bob=0;arms=-26*q;head=-5*q;bow=-7*q
  elif action=="release":
   q=i/(COUNT-1)
   left=-2;right=2;bob=-2*math.sin(math.pi*q)
   arms=15*(1-q);head=2*math.sin(math.pi*q);bow=10*math.sin(math.pi*q)
  elif action=="hit":
   q=i/(COUNT-1)
   left=8*(1-q);right=-7*(1-q);bob=2*math.sin(math.pi*q)
   arms=-12*(1-q)*math.cos(7*q);head=-7*(1-q);bow=14*(1-q)
  else:
   q=i/(COUNT-1)
   left=-27*q;right=24*q;bob=8*q;arms=-32*q;head=-29*q;bow=40*q

  result=Image.new("RGBA",src.size,(0,0,0,0))
  for part,angle,dx in [
    ("left_leg",left,-5*math.sin(phase) if action=="walk" else 0),
    ("right_leg",right,5*math.sin(phase) if action=="walk" else 0)]:
   result.alpha_composite(joint(layers[part],PIVOTS[part],angle,dx,bob))
  result.alpha_composite(joint(core,(254,240),0,0,bob))
  result.alpha_composite(joint(layers["head"],PIVOTS["head"],head,0,bob))
  result.alpha_composite(joint(layers["left_arm"],PIVOTS["left_arm"],arms,
                              -26*i/COUNT if action=="draw" else 0,bob))
  result.alpha_composite(joint(layers["right_arm"],PIVOTS["right_arm"],-arms*.55,
                              16*i/COUNT if action=="draw" else 0,bob))
  result.alpha_composite(joint(layers["bow"],PIVOTS["bow"],bow,
                              13*i/COUNT if action=="draw" else 0,bob))
  if action in ("draw","release"):
   layer=Image.new("RGBA",src.size,(0,0,0,0))
   d=ImageDraw.Draw(layer)
   if action=="draw":
    q=(i+1)/COUNT
    tail=(235-28*q,225+6*q);tip=(345+13*q,222-6*q)
    d.line((tail,tip),fill=(231,222,173,242),width=2)
    d.line(((315,77),tail,(300,349)),fill=(200,202,176,175),width=1)
   elif i<=3:
    q=i/4
    d.line(((280+72*q,226-4*q),(352+90*q,222-4*q)),
            fill=(251,227,149,255),width=2)
   result.alpha_composite(layer)
  if action=="death":
   q=i/(COUNT-1)
   result=result.rotate(-78*q,Image.Resampling.BICUBIC,
                        center=(238,330),expand=False)
   result=result.transform(result.size,Image.Transform.AFFINE,
                 (1,0,10*q,0,1,-65*q),resample=Image.Resampling.BICUBIC)
  if action=="hit" and i<3:
   glint=Image.new("RGBA",src.size,(0,0,0,0))
   ImageDraw.Draw(glint).arc((183,124,282,257),212,285,
                            fill=(247,154,113,125),width=6)
   result.alpha_composite(glint)
  return result.resize((SIZE,SIZE),Image.Resampling.LANCZOS)

 OUT.mkdir(parents=True,exist_ok=True)
 individual=OUT/"frames"
 individual.mkdir(parents=True,exist_ok=True)
 atlas=Image.new("RGBA",(SIZE*COUNT,SIZE*len(ACTIONS)),(0,0,0,0))
 hashes={}
 alpha_ok=True
 for row,action in enumerate(ACTIONS):
  hashes[action]=[]
  for i in range(COUNT):
   image=pose(action,i)
   atlas.paste(image,(SIZE*i,SIZE*row))
   frame_file=individual/f"human-archer-{action}-{i:02d}.png"
   image.save(frame_file,optimize=True)
   hashes[action].append(hashlib.sha256(image.tobytes()).hexdigest())
   alpha_ok=alpha_ok and image.getchannel("A").getextrema()==(0,255)
 atlas.save(ATLAS,optimize=True)
 if not alpha_ok:
  raise AssertionError("Atlas frame must contain transparent and opaque pixels")
 unique=len(set(h for frames in hashes.values() for h in frames))
 if unique!=COUNT*len(ACTIONS):
  raise AssertionError(f"Atlas needs 48 distinct raster frames, found {unique}")
 meta={
   "asset_id":"hg143-human-archer-48",
   "source":"assets/generated/hg11/units/human-archer.png",
   "art_source":"source cutout + authored layered articulation; no generated video",
   "source_sha256":sha256(SOURCE),
   "atlas_sha256":sha256(ATLAS),
   "atlas":"assets/generated/hg143/animation/human-archer-atlas.png",
   "atlas_dimensions":[SIZE*COUNT,SIZE*len(ACTIONS)],
   "frame_dimensions":[SIZE,SIZE],
   "columns":COUNT, "rows":len(ACTIONS),
   "pivot":[.485,.87],
   "total_frames":unique,
   "fps":24,
   "clips":{
     action:{"row":row,"count":COUNT,"duration_ms":ACTION_MS[action],
             "loop":action in ("idle","walk"),
             "frames":[{"index":i,"sx":i*SIZE,"sy":row*SIZE}
                       for i in range(COUNT)]}
     for row,action in enumerate(ACTIONS)
   },
   "frame_hashes":hashes
 }
 METADATA.write_text(json.dumps(meta,ensure_ascii=False,sort_keys=True,
             separators=(",",":"))+"\n",encoding="utf-8")
 print(f"HG143: {unique} unique transparent frames, {ATLAS.stat().st_size} bytes, SHA256 {meta['atlas_sha256']}")
 return meta

if __name__=="__main__":
 build()
