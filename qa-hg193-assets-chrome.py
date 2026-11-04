"""HG-19.3: actual offline Chrome source image and five-action battle rendering acceptance."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent
out=root/"docs/qa/hg193"
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1280,"height":720},device_scale_factor=1)
    page.goto((root/"Play-Heoofgaia-HG11.html").as_uri(),wait_until="load")
    result=page.evaluate("""async () => {
      const X=window.HOG_HG193_SPRITES,P=window.HOG_PAINTER,A=window.HOG_ART_PACK;
      const B=window.HOG_HG192_SPRITES,F=window.HOG_FREE_SPRITES;
      if(!X||!P||!A||!B||!F)throw Error('Missing HG19.3 sprite pipeline');
      const ids=X.ids(),actions=['idle','walk','attack','hit','death'];
      const dims={'human_6':[784,98],'human_8':[32,32],'elf_4':[32,32],
        'elf_5':[64,64],'elf_7':[64,64],'orc_2':[64,64],'orc_7':[32,32]};
      if(ids.length!==7)throw Error('Wrong final troop count');
      const draw=(id,action,time)=>{
        const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;
        const c=canvas.getContext('2d'),v={action,time,duration:700,alpha:1};
        const okay=id==='human_6'?X.draw(c,80,144,id,false,v,1):P.motionSprite(c,80,144,id,false,v,1);
        if(!okay)throw Error('Battle cannot draw '+id+'/'+action);
        const data=c.getImageData(0,0,160,160).data;let alpha=0,checksum=0;
        for(let i=0;i<data.length;i+=4)if(data[i+3]>25){alpha++;checksum=(checksum+data[i]*3+data[i+1]*5+data[i+2]*7+i/4)%2147483647;}
        if(alpha<60)throw Error('Blank sprite '+id+'/'+action);
        return {canvas,alpha,checksum};
      };
      let actionCount=0;const meta=[];
      for(const id of ids){
        const im=X.image(id);if(!im)throw Error('No preload image '+id);
        await im.decode();
        if(!im.src.startsWith('data:image/png;base64,'))throw Error('Not self-contained '+id);
        if(im.naturalWidth!==dims[id][0]||im.naturalHeight!==dims[id][1])throw Error('Dimensions '+id);
        for(const act of actions){draw(id,act,300);actionCount++;}
        const thumb=A.unitHTML(id,64);
        if(!thumb.includes('data-hog-unit="'+id+'"')||!thumb.includes('data:image/png;base64,'))
          throw Error('Unit card still uses vector fallback '+id);
        meta.push({id,width:im.naturalWidth,height:im.naturalHeight});
      }
      const monk=new Set([0,280,560,840].map(t=>draw('human_6','idle',t).checksum));
      if(monk.size<2)throw Error('Monk 8-frame idle sheet is not animating');
      const all=new Set(['human_1','human_3','human_4','elf_1','elf_2','orc_1','undead_1',
        ...Object.keys(F.CONFIG),...B.ids(),...ids]);
      if(all.size!==40||A.ids().length!==40)throw Error('Not 40/40');
      const panel=document.createElement('div');panel.id='hg193-review';
      panel.style.cssText='position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#0d1b2d;color:#f4e5c8;padding:14px;box-sizing:border-box;font:13px system-ui';
      panel.innerHTML='<h2 style="margin:0 0 4px">HG-19.3 · all 40 troops have sprites</h2><p>Seven final PNGs: four source-licensed, three new original art masters</p>';
      const gallery=document.createElement('div');
      gallery.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:7px';
      for(const id of ids){
        const cell=document.createElement('div');
        cell.style.cssText='background:#2a3d50;border:1px solid #a78e66;text-align:center;padding:4px';
        const cv=draw(id,'idle',330).canvas;cv.style.cssText='width:130px;height:128px;max-width:100%;image-rendering:pixelated';
        cell.appendChild(cv);const label=document.createElement('div');label.textContent=id;cell.appendChild(label);gallery.appendChild(cell);
      }
      panel.appendChild(gallery);
      const title=document.createElement('h3');title.textContent='Complete 40/40 troop catalog';panel.appendChild(title);
      const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(10,1fr);gap:4px';
      for(const id of A.ids()){
        const cell=document.createElement('div');cell.style.cssText='background:#243447;border:1px solid #52687a;text-align:center;overflow:hidden';
        cell.innerHTML=A.unitHTML(id,65)+'<div style="font-size:10px">'+id+'</div>';grid.appendChild(cell);
      }
      panel.appendChild(grid);document.body.appendChild(panel);
      return {status:'PASS',masterCount:7,uniqueArtSourceIds:all.size,statesRendered:actionCount,monkDistinctFrames:monk.size,allOffline:true,units:meta};
    }""")
    assert result["status"]=="PASS" and result["uniqueArtSourceIds"]==40 and result["statesRendered"]==35
    page.screenshot(path=str(out/"contact-sheet.png"))
    (out/"chrome-art.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    browser.close()
print("HG19.3 Chrome PASS: 7 PNG masters, 35 five-state renders, 40/40 sprite catalog")
