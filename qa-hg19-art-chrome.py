"""HG19 real Chromium image-decoding check and visual contact sheet."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
out=root/"docs/qa/hg19"
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1280,"height":720})
    page.goto((root/"Play-Heoofgaia-HG11.html").as_uri(),wait_until="load")
    result=page.evaluate("""async () => {
      const A=window.HOG_ART_PACK;
      if(!A)throw Error('Art module not bundled');
      const ids=A.ids(),keys=A.iconKeys();
      async function check(src){
        const im=new Image();im.src=src;await im.decode();
        if(!im.naturalWidth||!im.naturalHeight)throw Error('Image decode failed');
        const c=document.createElement('canvas');c.width=c.height=128;
        const ctx=c.getContext('2d');ctx.drawImage(im,0,0,128,128);
        if(!ctx.getImageData(0,0,128,128).data.some((x,i)=>i%4===3&&x>0))throw Error('Blank asset');
      }
      for(const id of ids)await check(A.unitSrc(id));
      for(const id of keys)await check('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(A.iconSVG(id)));
      const panel=document.createElement('div');
      panel.style.cssText='position:fixed;inset:0;z-index:9999999;background:#102035;color:#fff;overflow:auto;padding:14px;font:13px system-ui';
      panel.innerHTML='<h2>HG19 — 40 troop silhouettes</h2><div style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px">'+
        ids.map(id=>'<div style="border:1px solid #bba47c;text-align:center">'+A.unitHTML(id,92)+'<div>'+id+'</div></div>').join('')+
        '</div><h3>Icon pack</h3>'+keys.map(id=>A.iconHTML(id,38)).join(' ');
      document.body.appendChild(panel);
      return {units:ids.length,icons:keys.length,allDecoded:true};
    }""")
    assert result["units"]==40 and result["icons"]>=60 and result["allDecoded"]
    page.screenshot(path=str(out/"contact-sheet.png"))
    (out/"chrome-art.json").write_text(json.dumps(result,indent=2)+"\n")
    browser.close()
print("HG19 Chromium SVG decoding PASS")
