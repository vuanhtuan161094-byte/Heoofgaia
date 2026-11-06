from __future__ import annotations
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
FOLDER=ROOT/'assets/generated/hg33/troops'
SOURCE=ROOT/'assets/original/hg33/troops/elf-scout-master.png'
PNG=FOLDER/'elf-scout.png'
WEBP=FOLDER/'elf-scout.webp'
PROMPT=("Create one original, production-quality troop character master for the offline fantasy strategy game Anh Hùng Thời Loạn, inspired by premium dark teal and aged bronze fantasy materials, without copying any known game art. A forest elf scout archer, adult, full body, lean agile silhouette, three-quarter view facing right, poised in a calm ready stance with a recurved bow held low and a single visible quiver. Elegant but practical layered moss-green leather and muted teal cloth, fine silver leaf-shaped armor details, subtle bronze fasteners, expressive face, realistic hands, anatomically clean limbs, refined painterly 3D-rendered game art, high material detail that remains readable as a small battlefield unit. One character only, centered cutout, full boots and bow visible, feet aligned close to bottom, true transparent background, no ground shadow, no forest, no scenery, no text, no logo, no watermark, no extra weapons, no duplicate limbs, no motion blur.")
def digest(path:Path)->str:return sha256(path.read_bytes()).hexdigest()
def main():
 with Image.open(SOURCE) as src:
  if src.mode!='RGBA' or src.size!=(1024,1536):raise AssertionError(f'Unexpected source master {src.size} {src.mode}')
  a=src.getchannel('A')
  if a.getextrema()[0]!=0:raise AssertionError('Source background is not transparent')
  bounds=a.point(lambda v:255 if v>=8 else 0).getbbox()
  if not bounds:raise AssertionError('Empty alpha silhouette')
  crop=src.crop(bounds)
  w,h=crop.size
  if h>500:w=round(w*500/h);h=500
  if w>488:h=round(h*488/w);w=488
  art=crop.resize((w,h),Image.Resampling.LANCZOS)
  canvas=Image.new('RGBA',(512,512),(0,0,0,0))
  canvas.alpha_composite(art,((512-w)//2,506-h))
  canvas.save(PNG,'PNG',optimize=True)
  canvas.save(WEBP,'WEBP',quality=94,alpha_quality=100,method=6,exact=True)
 with Image.open(PNG) as im:
  assert im.size==(512,512) and im.mode=='RGBA' and im.getchannel('A').getextrema()==(0,255)
  visible=im.getchannel('A').point(lambda v:255 if v>=8 else 0).getbbox()
  visible_pixels=sum(1 for v in im.getchannel('A').getdata() if v>=8)
 with Image.open(WEBP) as im:
  assert im.size==(512,512) and im.convert('RGBA').getchannel('A').getextrema()==(0,255)
 manifest={'schema':'HG33-OriginalBattleSprite-v1','status':'RECREATED','assetId':'hg33-elf-scout','unitId':'elf_2','name':'Elf Scout','sourceRoute':'built-in image_gen','artist_route':'OpenAI built-in image_gen tool','creation_method':'AI-generated original raster master; alpha-registered and converted to WebP for offline runtime','source_file':SOURCE.relative_to(ROOT).as_posix(),'sourceImageId':'exec-f75ca6b5-d391-43ba-9b4c-47ad1e074a62','sourceLicense':'AI-generated original project art; no third-party art supplied as input','license_status':'Original generated work; no third-party art input','original_status':'verified-original','action_art_kind':'missing','prompt':PROMPT,'sourceMaster':SOURCE.relative_to(ROOT).as_posix(),'sourceSha256':digest(SOURCE),'sourceDimensions':[1024,1536],'sourceMode':'RGBA','sourceEditability':'Original high-resolution raster master; no separate articulated layers.','processedBy':'tools/prepare_hg33_elf_scout.py','registeredPng':PNG.relative_to(ROOT).as_posix(),'registeredPngSha256':digest(PNG),'runtimePath':WEBP.relative_to(ROOT).as_posix(),'runtimeSha256':digest(WEBP),'runtimeBytes':WEBP.stat().st_size,'runtimeDimensions':[512,512],'alpha':'Verified RGBA cutout; outside silhouette transparent, feet registered at y=506','alphaBoundsThreshold8':list(visible),'alphaVisiblePixels':visible_pixels,'pivot':[0.5,0.988],'assetQcPass':True,'animationCoverage':'NONE; no video-frame route or articulated layer source available.','animationStatus':'MASTER_STILL_ONLY; existing battle event transforms remain; no original five-action frame clips are claimed.'}
 (FOLDER/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'sourceSha256':manifest['sourceSha256'],'registeredPngSha256':manifest['registeredPngSha256'],'runtimeSha256':manifest['runtimeSha256'],'runtimeBytes':manifest['runtimeBytes'],'alphaBoundsThreshold8':manifest['alphaBoundsThreshold8'],'alphaVisiblePixels':visible_pixels},indent=2))
if __name__=='__main__':main()
