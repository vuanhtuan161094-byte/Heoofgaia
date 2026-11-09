"""HG40.7 real Chromium foot-lock before/after on *embedded* authored atlases.
Each pixel measured here comes from native Canvas drawImage, not a mock sprite.
Test is render-only; game Save v07 is never mutated or written by samples.
"""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
ART=ROOT/'docs/evidence/hg407'
OUT=ROOT/'docs/qa/hg407'
ART.mkdir(parents=True,exist_ok=True)
OUT.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as pw:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
    if os.getenv('HOG_CHROME_PATH'):launch['executable_path']=os.environ['HOG_CHROME_PATH']
    browser=pw.chromium.launch(**launch)
    page=browser.new_page(viewport={'width':1280,'height':720})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(HTML.as_uri(),wait_until='load',timeout=45000)
    page.locator('[data-action="start"]').click()
    rows=page.evaluate("""async () => {
      const P=HOG_PAINTER,E=HOG_ENGINE,A=HOG_HG33_TROOP_ATLASES;
      const state=HOG_APP_DEBUG.getState(),before=JSON.stringify(state);
      const output=[];
      for(const id of ['undead_10','undead_4','orc_10']){
        const atlas=A.resolve(id),img=document.getElementById(atlas.imageId);
        if(!atlas||!img)throw Error('Missing native atlas '+id);
        if(!img.hasAttribute('src'))img.src=img.dataset.hg33AtlasSrc;
        await img.decode();
        const clip=atlas.actions.walk,frames=[],rect=atlas.frameDimensions||[atlas.frameWidth,atlas.frameHeight],
              width=Math.max(18,Math.min(160,atlas.renderWidth)),height=width*rect[1]/rect[0],px=160,py=220;
        for(let index=0;index<8;index++){
          const make=()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=260;return canvas},
           raw=make(),fixed=make();
          const src={sx:index*rect[0],sy:clip.row*rect[1],sw:rect[0],sh:rect[1]},
           ctx=raw.getContext('2d',{willReadFrequently:true});
          ctx.drawImage(img,src.sx,src.sy,src.sw,src.sh,
            px-width*.5,py-height*atlas.pivot,width,height);
          const visual={action:'walk',time:(index+.02)*clip.durationMs/clip.count,
                         duration:clip.durationMs,alpha:1};
          const painted=P.animatedTroopAtlas(fixed.getContext('2d',{willReadFrequently:true}),
                                              px,py,false,visual,1,id);
          if(!painted)throw Error('Sprite failed to paint in actual Canvas '+id+':'+index);
          function bottom(canvas){
            const a=canvas.getContext('2d',{willReadFrequently:true}).getImageData(130,0,60,260),
                  data=a.data;
            for(let y=259;y>=0;y--){
              let n=0;
              for(let x=0;x<60;x++)if(data[(y*60+x)*4+3]>45)n++;
              if(n>=3)return y+1;
            }
            return null;
          }
          frames.push({index,rawBottom:bottom(raw),fixedBottom:bottom(fixed),
            offsetSourcePixels:P.HG407_WALK_FOOT[id][index],
            image:fixed.toDataURL('image/png')});
        }
        output.push({id,frames});
      }
      if(JSON.stringify(state)!==before||!E.strictSave(state)||state.version!==7)
        throw Error('Render-only scan touched Save v07');
      return output;
    }""")
    browser.close()
results=[]
sheet=Image.new('RGB',(8*260,3*250),(25,39,42))
draw=ImageDraw.Draw(sheet)
for rowno,entry in enumerate(rows):
    frames=entry['frames']
    raw=[f['rawBottom'] for f in frames];fixed=[f['fixedBottom'] for f in frames]
    if None in raw or None in fixed:raise AssertionError('Missing visible silhouette '+entry['id'])
    raw_span=max(raw)-min(raw);fixed_span=max(fixed)-min(fixed)
    print('HG40.7 LIVE FOOT '+entry['id']+' BEFORE '+str(raw_span)+
          'px AFTER '+str(fixed_span)+'px',flush=True)
    if not fixed_span<raw_span:
        raise AssertionError('Actual browser boot drift not improved '+entry['id']+
                             ': before '+str(raw_span)+' after '+str(fixed_span))
    if entry['id']=='orc_10' and fixed_span>15:
        raise AssertionError('Orc T10 bottom-edge atlas debris still visible: '+str(fixed_span)+'px');
    for f in frames:
        image=Image.open(io.BytesIO(base64.b64decode(f.pop('image').split(',',1)[1]))).convert('RGBA')
        # Visual evidence only: a projected baseline, not a sprite frame edit.
        tile=Image.new('RGB',(260,250),(23,40,45))
        tile.paste(image.resize((246,200)),(7,34),image.resize((246,200)))
        sheet.paste(tile,(f['index']*260,rowno*250))
        draw.line((f['index']*260,rowno*250+205,(f['index']+1)*260-1,rowno*250+205),
                  fill=(181,166,115),width=1)
        draw.text((f['index']*260+10,rowno*250+8),
                  entry['id']+' · Walk '+str(f['index']),fill=(230,221,189))
    results.append({'id':entry['id'],'source':'real embedded HTML atlas',
                    'rawFootSpanCanvasPx':raw_span,'correctedFootSpanCanvasPx':fixed_span,
                    'frames':frames})
if errors:raise AssertionError('Uncaught JS '+json.dumps(errors))
img=ART/'hg407-walk-foot-lock-3-units-eight-frames.png'
sheet.save(img,optimize=True)
receipt={'schema':'HG40.7-AlphaFootLock-RealChromium-v1','status':'PASS',
         'gameHtmlSha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),
         'testedIds':[r['id'] for r in results],
         'limitations':['Central alpha contact is a proxy for a foot; wing particles can touch atlas edges.',
                        'Test captures actual Chromium Canvas poses but is not proof of anatomical art perfection.',
                        'Only Ghost Dragon, Phantom (undead_4) and Orc T10 sampled at eight phases; 39 IDs have source-map checks in CJS.'],
         'results':results,'screenshot':str(img.relative_to(ROOT))}
(OUT/'foot-lock-live-chrome.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('HG40.7 PASS 24 real Chromium Walk poses and Source/Save v07 unchanged',flush=True)
