"""HG91: derive truthful itch.io cover and gallery from REAL Chromium screenshots.
No invented screenshots, external art, or browser mockups.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import shutil,hashlib,json
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/"docs"/"qa"/"hg91"
OUT=ROOT/"dist"/"itch"/"store-media"
OUT.mkdir(parents=True,exist_ok=True)
inputs=[("01-intro-desktop.png","intro-english-desktop.png"),
        ("02-world-map-desktop.png","game-chinese-desktop.png"),
        ("03-language-mobile.png","intro-language-mobile-412x915.png")]
for dest,source in inputs:
    src=QA/source
    assert src.is_file() and src.stat().st_size>10000,source
    with Image.open(src) as im:im.verify()
    shutil.copy2(src,OUT/dest)
with Image.open(QA/"intro-english-desktop.png") as original:
    bg=ImageOps.fit(original.convert("RGB"),(630,500),Image.Resampling.LANCZOS,centering=(0.50,0.47)).convert("RGBA")
gradient=Image.new("RGBA",bg.size,(0,0,0,0));layer=ImageDraw.Draw(gradient)
for y in range(500):
    darkness=int(max(0,min(1,(y-150)/350))*190)
    layer.line([(0,y),(630,y)],fill=(8,18,36,darkness))
bg=Image.alpha_composite(bg,gradient)
d=ImageDraw.Draw(bg)
font_path="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
subtitle_path="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
def font(size,bold=True):
    p=font_path if bold else subtitle_path
    return ImageFont.truetype(p,size)
headline="ANH HÙNG THỜI LOẠN"
size=42
while size>20 and d.textbbox((0,0),headline,font=font(size))[2]>598:size-=1
f=font(size)
for ox,oy in ((2,2),(3,3)):
    d.text((20+ox,393+oy),headline,font=f,fill=(0,0,0,210))
d.text((20,393),headline,font=f,fill=(255,234,177,255),
       stroke_width=1,stroke_fill=(45,53,80,255))
d.text((22,450),"4 FACTIONS  •  40 TROOP TYPES  •  MYTHIC HEROES",
       font=font(14,False),fill=(214,229,240,255))
d.text((21,16),"FANTASY STRATEGY  /  EARLY ACCESS",
       font=font(13),fill=(245,236,203,255))
out=OUT/"cover-630x500.png";bg.convert("RGB").save(out,optimize=True)
assert Image.open(out).size==(630,500)
manifest={"status":"STAGING_OWNER_VISUAL_APPROVAL_PENDING",
          "source":"Real Chromium screenshots of the game running on local HTTP",
          "cover":"630x500 screenshot-derived promotion; not a mockup",
          "files":[{"name":p.name,"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),
                    "bytes":p.stat().st_size} for p in sorted(OUT.glob("*.png"))]}
(OUT/"source-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("HG91_PROMO_REAL_SCREENSHOTS",json.dumps(manifest,ensure_ascii=False),flush=True)
