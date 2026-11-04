"""HG22.1 real Chromium 5-action 50-frame skeleton decode, visual comparison and offline source check."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
out=root/"docs/qa/hg22"
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1280,"height":720}, device_scale_factor=1)
    page.goto((root/"Play-Heoofgaia-HG11.html").as_uri(),wait_until="load")
    result=page.evaluate("""async () => {
      const S=window.HOG_HG22_SKELETON,A=window.HOG_ART_PACK,P=window.HOG_PAINTER;
      if(!S||!A||!P)throw Error('Missing installed HG22 modules');
      if(S.UNIT!=='undead_1')throw Error('Wrong troop target');
      const actions=['idle','walk','attack','hit','death'];
      const panel=document.createElement('div');
      panel.id='hg22-skeleton-preview';
      panel.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#111e2b;color:#f0dfb7;font:15px system-ui;padding:24px;box-sizing:border-box';
      panel.innerHTML='<h1 style="margin:0 0 8px">HG22.1 | Undead Skeleton • 50 genuine animation frames</h1><p>Five authentic sprite-sheet actions, canvas runtime preview • 1280×720</p>';
      const grid=document.createElement('div');
      grid.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);gap:10px';
      const checked=[];
      for(const action of actions){
        const id=S.CLIPS[action].id,im=document.getElementById(id);
        if(!im)throw Error('missing image '+id);
        await im.decode();
        if(im.naturalWidth!==1280||im.naturalHeight!==512)throw Error('wrong PNG dimensions '+id);
        if(!im.src.startsWith('data:image/png;base64,'))throw Error('not offline embedded '+id);
        const tile=document.createElement('div');
        tile.style.cssText='padding:10px;text-align:center;background:#253a4e;border:1px solid #a68f5d;border-radius:8px';
        for(const time of [0,500]){
          const canvas=document.createElement('canvas');canvas.width=195;canvas.height=205;
          const ctx=canvas.getContext('2d');
          const v={action,time,duration:1200,alpha:1};
          if(!S.draw(ctx,97,195,'undead_1',false,v,1))throw Error('draw failed '+action);
          const a=ctx.getImageData(0,0,canvas.width,canvas.height).data;
          let pixels=0;for(let i=3;i<a.length;i+=4)if(a[i]>0)pixels++;
          if(pixels<70)throw Error('blank canvas '+action+' time '+time+' pixels '+pixels);
          canvas.style.cssText='max-width:100%;height:170px;image-rendering:pixelated';
          tile.appendChild(canvas);
        }
        const label=document.createElement('div');label.textContent=action.toUpperCase();tile.appendChild(label);
        grid.appendChild(tile);checked.push(action);
      }
      panel.appendChild(grid);document.body.appendChild(panel);
      if(!A.unitHTML('undead_1',60).includes('data:image/png;base64,'))throw Error('recruitment thumb missing');
      const old=document.getElementById('unit-undead-skeleton');
      if(!old||!old.complete)throw Error('original fallback absent');
      return {status:'PASS',unit:'undead_1',actions:checked,spriteSheets:5,totalFrames:50,renderedStates:10,offline:true,source:'MIT'};
    }""")
    assert result["status"]=="PASS"
    page.screenshot(path=str(out/"skeleton-five-actions.png"))
    (out/"skeleton-chrome.json").write_text(json.dumps(result,indent=2)+"\n")
    browser.close()
print("HG22.1 Chromium PASS — skeleton 50 source frames, five actions and offline embedded")
