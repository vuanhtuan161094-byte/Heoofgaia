"""HG19.1 actual PNG source sheets and attribution icons in real standalone Chromium."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent
out=root/"docs/qa/hg191"
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1280,"height":720},device_scale_factor=1)
    page.goto((root/"Play-Heoofgaia-HG11.html").as_uri(),wait_until="load")
    receipt=page.evaluate("""async () => {
      const S=window.HOG_FREE_SPRITES, A=window.HOG_ART_PACK, G=window.HOG_FREE_GLYPHS;
      if(!S||!A||!G)throw Error('Missing HG19.1 modules');
      const expected={
       'human_2':{idle:[1536,192]},
       'human_7':{idle:[704,88],walk:[704,88],attack:[704,88],hit:[704,88],death:[1056,88]}
      };
      for(const [id,states] of Object.entries(expected))
       for(const [action,dimensions] of Object.entries(states)){
        const el=document.getElementById(S.CONFIG[id].sheets[action].id);
        if(!el)throw Error('No source sheet '+id+' '+action);
        await el.decode();
        if(el.naturalWidth!==dimensions[0]||el.naturalHeight!==dimensions[1])
          throw Error('Wrong image dimensions '+id+' '+action);
       }
      const draw=(id,action,t)=>{
        const c=document.createElement('canvas');c.width=160;c.height=144;
        const ctx=c.getContext('2d');
        if(!S.draw(ctx,80,131,id,false,{action,time:t,duration:600,alpha:1},1))
          throw Error('Art renderer rejected '+id+' '+action);
        const pixels=ctx.getImageData(0,0,160,144).data;
        let alpha=0,opaque=0,signature=0;
        for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>15){alpha++;signature=(signature+pixels[i]*3+pixels[i+1]*5+pixels[i+2]*7+i)%2147483647;if(pixels[i+3]>200)opaque++;}}
        if(alpha<120||opaque<40)throw Error('Blank/malformed art '+id+' '+action+' '+alpha);
        return {alpha,signature,canvas:c};
      };
      const types=['idle','walk','attack','hit','death'];
      const seen={};
      for(const id of Object.keys(expected)){
       seen[id]={};
       for(const state of types)seen[id][state]=draw(id,state,320).alpha;
      }
      if(draw('human_7','attack',0).signature===draw('human_7','attack',450).signature)
        throw Error('Frame animation is not changing');
      const actualIcons=['gold','wood','ore','sulfur','crystal','human','elf','orc','undead','weapon','armor','charm','fire','water','earth','air','light','dark'];
      for(const key of actualIcons){
       const svg=A.iconSVG(key);
       if(!svg.includes('scale(.086)'))throw Error('Original Game-Icons glyph missing '+key);
       const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await im.decode();
       if(!im.naturalWidth)throw Error('Failed source SVG decode '+key);
      }
      const card=document.createElement('div');
      card.id='hg191-asset-review';
      card.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0e1b2b;color:#f5e5bf;overflow:auto;padding:22px;box-sizing:border-box;font:16px system-ui';
      card.innerHTML='<h2 style="margin:0 0 5px">HG19.1 — Source art in-game, basic animations</h2>'+
       '<p style="margin:0 0 16px">Human Scout (CC0) · Elite Knight (CC0) · 26 real Game-Icons source glyphs (CC BY 3.0)</p>';
      for(const id of ['human_2','human_7']){
       const row=document.createElement('div');
       row.style.cssText='display:flex;gap:12px;margin:0 0 14px';
       const title=document.createElement('div');title.style.cssText='width:95px;padding:16px 0';title.textContent=id+' '+S.CONFIG[id].name;row.appendChild(title);
       for(const type of types){
        const box=document.createElement('div');box.style.cssText='width:126px;padding:4px;background:#26394b;border:1px solid #b79a6b;text-align:center';
        const preview=draw(id,type,320).canvas;preview.style.cssText='width:116px;height:110px;object-fit:contain';
        box.appendChild(preview);const label=document.createElement('div');label.textContent=type;box.appendChild(label);row.appendChild(box);
       }card.appendChild(row);
      }
      const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:6px;max-width:1150px';
      for(const key of actualIcons){
       const cell=document.createElement('div');cell.style.cssText='width:68px;text-align:center;font-size:11px';
       cell.innerHTML=A.iconHTML(key,48)+'<div>'+key+'</div>';row.appendChild(cell);
      }card.appendChild(row);document.body.appendChild(card);
      return {status:'PASS',sourceSheets:6,units:2,actualSourceIconKeys:Object.keys(G).length,
       statesChecked:10,sourcePNGDecode:'PASS',renderer:'PASS',frameVaries:true,alphaPixels:seen};
    }""")
    assert receipt["status"]=="PASS"
    page.screenshot(path=str(out/"free-sprites-and-icons.png"),full_page=False)
    (out/"free-assets-chrome.json").write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    browser.close()
print("HG19.1 Chromium source sprites/icons and five visual states PASS")
