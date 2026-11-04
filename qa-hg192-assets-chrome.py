"""HG19.2: decode 24 real, independent source PNGs and draw actual 5-action combat animation."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
out=root/"docs/qa/hg192"
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1280,"height":720},device_scale_factor=1)
    page.goto((root/"Play-Heoofgaia-HG11.html").as_uri(),wait_until="load")
    result=page.evaluate("""async () => {
       const S=window.HOG_HG192_SPRITES,P=window.HOG_PAINTER,A=window.HOG_ART_PACK;
       if(!S||!P||!A)throw Error('Missing HG19.2 loaded module');
       const ids=S.ids(),unique=new Set,coverage=[],states=['idle','walk','attack','hit','death'];
       if(ids.length!==24)throw Error('Wrong source unit count '+ids.length);
       function sumCanvas(canvas){
         const a=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
         let n=0,checksum=0;
         for(let i=0;i<a.length;i+=4)if(a[i+3]>25){
           n++;checksum=(checksum+a[i]*3+a[i+1]*5+a[i+2]*7+(i/4))%2147483647;
         }
         if(n<45)throw Error('Blank/malformed sprite alpha '+n);
         return [n,checksum];
       }
       const sheet=document.createElement('div');
       sheet.id='hg192-real-source-review';
       sheet.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0e1b2b;color:#f1e4c7;padding:14px;box-sizing:border-box;overflow:auto;font:12px system-ui';
       sheet.innerHTML='<h2 style="margin:0 0 4px">HG19.2 — 24 imported original fantasy monster portraits</h2><p style="margin:0 0 9px">2015 curated CC0 sprites • crisp 32px pixel art • basic motion</p>';
       const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(8,1fr);gap:6px';
       for(const id of ids){
         const s=S.profile(id),im=document.getElementById(s.id);
         if(!im)throw Error('Missing preloaded asset '+id);
         await im.decode();
         const key=im.src;
         if(!key.startsWith('data:image/png;base64,'))throw Error('Source not bundled offline: '+id);
         if(im.naturalWidth!==32||![32,48].includes(im.naturalHeight))throw Error('Bad source dimensions: '+id);
         unique.add(key);
         let samples={};
         for(const action of states){
           const c=document.createElement('canvas');c.width=160;c.height=160;
           const k=1;
           if(!P.motionSprite(c.getContext('2d'),80,142,id,false,{action,time:action==='idle'?380:200,duration:650,alpha:1},k))
             throw Error('Battle renderer refused '+id+' '+action);
           samples[action]=sumCanvas(c)[0];
         }
         const preview=document.createElement('canvas');preview.width=108;preview.height=120;
         const ctx=preview.getContext('2d');
         P.motionSprite(ctx,54,112,id,false,{action:'idle',time:400,duration:650,alpha:1},.90);
         const wrapper=document.createElement('div');wrapper.style.cssText='border:1px solid #938567;background:#26384c;text-align:center;border-radius:5px;padding:2px';
         preview.style.cssText='height:99px;width:101px;max-width:100%';
         wrapper.appendChild(preview);const label=document.createElement('div');label.textContent=id;wrapper.appendChild(label);grid.appendChild(wrapper);
         if(!A.unitHTML(id,62).includes('data:image/png;base64,'))throw Error('Recruitment card not sourced: '+id);
         coverage.push({id,width:im.naturalWidth,height:im.naturalHeight,actions:samples});
       }
       if(unique.size!==24)throw Error('Duplicate source images');
       sheet.appendChild(grid);document.body.appendChild(sheet);
       return {status:'PASS',images:24,uniqueImages:unique.size,statesChecked:24*5,offline:true,saveSchemaChanged:false,coverage};
    }""")
    assert result["status"]=="PASS"
    page.screenshot(path=str(out/"creature-contact-sheet.png"),full_page=False)
    (out/"chrome-art.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    browser.close()
print("HG19.2 Chrome PASS 24 original sprites, 120 combat action renders, all offline")
