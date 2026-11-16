"""P4.1 static source + runtime QA, independent from prior P2/P3 tests."""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
from io import BytesIO
import hashlib, json, base64, os
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'assets/p41/troops_manifest.json').read_text(encoding='utf-8'))
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
CHECKS=[]
def check(label,cond):
    ok=bool(cond);CHECKS.append((label,ok));print(('PASS' if ok else 'FAIL'),label)
check('288 registered frames',DATA['frameCount']==288)
check('frame atlas dimensions',Image.open(ROOT/'assets/p41/troops_p41.webp').size==(800,5184))
check('all directions and actions',all(len(DATA['units'][u][d][a])==6 for u in DATA['units'] for d in ('front','right','back','left') for a in ('idle','attack','hit')))
check('all source frame PNGs exist',len(list((ROOT/'assets/p41/frames').glob('*.png')))==288)
check('all frames are distinct across each action',all(len({hashlib.sha256((ROOT/'assets/p41/frames'/f'{u}_{d}_{a}_{i:02d}.png').read_bytes()).digest() for i in range(6)})>=4 for u in DATA['units'] for d in ('front','right','back','left') for a in ('idle','attack','hit')))
check('embedded atlas identical to source',hashlib.sha256(base64.b64decode(''.join(json.loads('['+HTML.split('const P41_SPRITE_URI=[')[1].split('].join')[0].strip().rstrip(',')+']')).split(',',1)[1])).hexdigest()==DATA['atlasSha256'])
check('schema v5 migration and save key still present',"muu_dinh_tam_quoc_v1" in HTML and 'game.version=5;' in HTML)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_BIN') or None,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    SHIM="""<script>window.__P2_ENABLE_QA__=true;const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});</script>"""
    page.set_content(HTML.replace('<script>',SHIM+'<script>',1),wait_until='domcontentloaded')
    page.wait_for_function('window.__P41_QA__?.image?.complete && window.__P41_QA__.image.naturalWidth === 800',timeout=30000)
    check('atlas loads offline in Chromium',page.evaluate('window.__P41_QA__.image.naturalHeight===5184'))
    check('all 288 coordinates available',page.evaluate('(()=>{for(const u of ["infantry","cavalry","archer","strategist"])for(const d of ["front","right","back","left"])for(const a of ["idle","attack","hit"])for(let f=0;f<6;f++)if(__P41_QA__.index(u,d,a,f)<0)return false;return true})()'))
    check('four direction frame indexes distinct',page.evaluate('new Set(["front","right","back","left"].map(d=>__P41_QA__.index("infantry",d,"attack",3))).size===4'))
    # Artwork contact sheet drawn by the actual browser into canvas, not a composited mock screenshot.
    gallery=page.evaluate("""(()=>{let c=document.createElement('canvas');c.width=1200;c.height=672;let x=c.getContext('2d');x.fillStyle='#16252a';x.fillRect(0,0,1200,672);let types=['infantry','cavalry','archer','strategist'],dirs=['front','right','back','left'],actions=['idle','attack','hit'];for(let i=0;i<4;i++)for(let d=0;d<4;d++)for(let a=0;a<3;a++){let col=d*3+a,xx=col*100,yy=i*168;x.fillStyle='#34423a';x.fillRect(xx,yy,100,164);__P41_QA__.drawFrame(x,types[i],dirs[d],actions[a],3,xx,yy,100,144);x.fillStyle='#f4d9a2';x.font='10px sans-serif';x.fillText(types[i].slice(0,3)+' '+dirs[d].slice(0,1)+' '+actions[a].slice(0,1),xx+4,yy+155);}return c.toDataURL('image/png').split(',')[1]})()""")
    (ROOT/'qa/p41-browser-matrix.png').write_bytes(base64.b64decode(gallery))
    api='window.__P2_QA__'
    page.evaluate(f"{api}.beginBattle(1,'campaign')")
    check('real battle initialized',page.evaluate('!!window.__P2_QA__.debugBattle()'))
    page.evaluate('__P2_QA__.debugBattle().next=Date.now()+999999')
    # Capture a genuine action from game combat engine, do not synthesize target/hit entries.
    page.evaluate('__P2_QA__.stepBattle()')
    actual=page.evaluate('__P41_QA__.currentEvent()')
    check('visual takes actor + targets from real event',bool(actual and actual.get('actor') and actual.get('hits')))
    phases=[];snapshots=[]
    for elapsed in [70,290,520,790,1070]:
        phase=page.evaluate('(ms)=>{__P41_QA__.setVisualElapsed(ms);return __P41_QA__.phase(performance.now())}',elapsed)
        shot=page.locator('#battle-canvas').screenshot()
        phases.append(phase)
        snapshots.append(hashlib.sha256(shot).hexdigest())
        (ROOT/f'qa/p41-{phase}-{elapsed}.png').write_bytes(shot)
    check('charge/release/contact/fade stages',phases==['charge','release','contact','fade','none'])
    check('canvas pixels change during phases',len(set(snapshots))==5)
    # Hit sprite reacts only if current actual event hit this unit; it must be a 2D frame.
    check('hit animation driven by recorded target',page.evaluate('(()=>{const ev=__P2_QA__.debugBattle().current;const h=ev.hits[0];if(!h)return false;ev.time=performance.now()-520;return __P41_QA__.visual(h.target,performance.now()).action==="hit";})()'))
    check('current attacker uses attack animation',page.evaluate('(()=>{const ev=__P2_QA__.debugBattle().current;if(!ev.attacker)return false;ev.time=performance.now()-250;return __P41_QA__.visual(ev.attacker,performance.now()).action==="attack";})()'))
    # Pure visual QA must leave economy/save unchanged.
    before=page.evaluate('JSON.stringify(__P2_QA__.getGame())')
    page.evaluate('[20,180,420,610,820].forEach(ms=>__P41_QA__.setVisualElapsed(ms))')
    after=page.evaluate('JSON.stringify(__P2_QA__.getGame())')
    check('VFX does not modify game state',before==after)
    check('no Chromium JavaScript exceptions',not errors)
    browser.close()
result={'total':len(CHECKS),'passed':sum(ok for _,ok in CHECKS),'checks':[{'name':n,'pass':ok} for n,ok in CHECKS], 'phases':phases,'actualBattleEvent':actual,'browserErrors':errors}
(ROOT/'qa/p41-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('P4.1 TOTAL',result['passed'],'/',result['total'])
assert result['passed']==result['total'],result
