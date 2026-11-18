#!/usr/bin/env python3
"""Original deterministic 2D light FX (code art), no image-sampling or engine writes.
Static single images for a real event adapter. Not an animation nor VNG asset.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math,random
OUT=Path(__file__).resolve().parent
SIZE=256;S=SIZE
random.seed(12871)

def make_layer():return Image.new('L',(S,S))
def draw_lines(layer,paths,width=3,fill=255):
 d=ImageDraw.Draw(layer)
 for path in paths:
  d.line([(round(x),round(y)) for x,y in path],fill=fill,width=width,joint='curve')
  for x,y in path:
   r=width/2
   d.ellipse((x-r,y-r,x+r,y+r),fill=fill)
def glow(layer,rgb,glow_weight=0.84):
 # additive light composition with clean alpha, subtle soft spill and a bright core
 blurred=layer.filter(ImageFilter.GaussianBlur(15))
 mid=layer.filter(ImageFilter.GaussianBlur(5))
 canvas=Image.new('RGBA',(S,S),(0,0,0,0))
 for matte,color in [(blurred,tuple(int(v*0.65) for v in rgb)),(mid,rgb),(layer,(246,250,255))]:
  m=matte.point(lambda a:int(a*(0.52 if matte is blurred else 0.76 if matte is mid else 0.94)))
  rgba=Image.new('RGBA',(S,S),color+(0,));rgba.putalpha(m)
  canvas=Image.alpha_composite(canvas,rgba)
 return canvas

def add_sparks(layer,points,radius=2):
 d=ImageDraw.Draw(layer)
 for x,y,weight in points:
  r=radius*(.65+weight)
  d.ellipse((x-r,y-r,x+r,y+r),fill=int(190+65*weight))

def morale():
 layer=make_layer();d=ImageDraw.Draw(layer)
 # three independently readable upward energy arrows, not a decorative fence
 for x,top in [(81,70),(128,48),(175,80)]:
  draw_lines(layer,[[(x,177),(x,top+30)]],width=9,fill=235)
  d.polygon([(x-19,top+34),(x,top),(x+19,top+34)],fill=255)
 for i in range(2):
  d.arc((51+8*i,155-3*i,205-8*i,213-6*i),188,349,fill=195,width=5)
 add_sparks(layer,[(random.randint(57,199),random.randint(66,195),random.random()) for _ in range(20)],radius=2)
 return glow(layer,(255,180,38))

def shield():
 outer=make_layer();d=ImageDraw.Draw(outer)
 # readable shield projected energy, hollow center
 path=[(128,39),(177,67),(188,129),(169,173),(128,207),(87,173),(68,129),(79,67),(128,39)]
 draw_lines(outer,[path],width=6,fill=255)
 for t in (0,1):
  d.arc((70+10*t,59+10*t,186-10*t,183-10*t),225,317,fill=210,width=3)
 add_sparks(outer,[(x,y,1) for x,y in [(128,36),(188,124),(128,208),(69,129)]],radius=3)
 out=glow(outer,(69,187,244))
 # central low-alpha light blue face; never opaque square background
 film=Image.new('RGBA',(S,S),(29,131,209,0));mask=make_layer()
 ImageDraw.Draw(mask).polygon(path,fill=23)
 film.putalpha(mask)
 return Image.alpha_composite(film,out)

def morale_down():
 layer=make_layer();d=ImageDraw.Draw(layer)
 # descending fractured purple arcs and broken morale fragments
 for w,x in enumerate((80,128,176)):
  zig=[(x-11,56),(x+6,78),(x-8,103),(x+4,123),(x-11,146),(x,165)]
  draw_lines(layer,[zig],width=5 if w==1 else 3,fill=245)
  d.polygon([(x-13,163),(x+13,163),(x,191)],fill=225)
 for a,b in [(0,125),(128,230)]:
  d.arc((48,44,208,202),a,b,fill=170,width=2)
 add_sparks(layer,[(random.randint(53,205),random.randint(49,203),random.random()) for _ in range(18)])
 return glow(layer,(171,76,247))

def contact():
 layer=make_layer();d=ImageDraw.Draw(layer)
 # diagonal contact energy: crescent shards, core flash + clear attack direction
 draw_lines(layer,[[(44,175),(75,153),(121,120),(171,85),(214,57)]],width=8,fill=255)
 draw_lines(layer,[[(61,196),(113,166),(172,134),(213,99)]],width=3,fill=200)
 c=(140,132)
 for j in range(10):
  a=j*math.pi/5+.12
  r1=25+7*(j%2);r2=77+11*(j%3)
  draw_lines(layer,[[(c[0]+math.cos(a)*r1,c[1]+math.sin(a)*r1),(c[0]+math.cos(a)*r2,c[1]+math.sin(a)*r2)]],width=3,fill=230)
 add_sparks(layer,[(random.randint(56,205),random.randint(56,199),random.random()) for _ in range(15)])
 return glow(layer,(255,110,63))

def export():
 for name,fn in [('morale_gain',morale),('guard_buff',shield),('morale_drain',morale_down),('contact_slash',contact)]:
  full=fn()
  # clean transparent fringes, preserve RGBA and no rectangular fill
  reduced=full.resize((128,128),Image.Resampling.LANCZOS)
  if name=='contact_slash':
   shrunk=reduced.resize((112,112),Image.Resampling.LANCZOS)
   board=Image.new('RGBA',(128,128))
   board.alpha_composite(shrunk,(8,8))
   reduced=board
  reduced.save(OUT/(name+'.png'),optimize=True)
  print(name,reduced.size,reduced.getchannel('A').getbbox(),(OUT/(name+'.png')).stat().st_size)
 if __name__=='__main__':preview()

def preview():
 names=['morale_gain','guard_buff','morale_drain','contact_slash']
 sheet=Image.new('RGB',(4*172,2*158),(32,41,55));d=ImageDraw.Draw(sheet)
 for i,n in enumerate(names):
  im=Image.open(OUT/(n+'.png')).convert('RGBA')
  for row in range(2):
   x=i*172;y=row*158
   back=(40,50,60) if row==0 else (177,179,168)
   d.rounded_rectangle((x+8,y+6,x+163,y+148),radius=11,fill=back)
   at=im.resize((80,80),Image.Resampling.LANCZOS)
   sheet.paste(at,(x+46,y+30),at)
   d.text((x+18,y+129),n,fill=(255,255,255) if row==0 else (21,22,24))
 sheet.save(OUT/'preview_1x_dark_light.png')

if __name__=='__main__':export()
