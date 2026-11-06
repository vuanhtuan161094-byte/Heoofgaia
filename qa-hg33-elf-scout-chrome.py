"""Capture an actual offline Elf Scout battle before/after its original art master."""
from __future__ import annotations
import hashlib,json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent;GAME=ROOT/'Play-Heoofgaia-HG11.html';SIZES=[(1280,720),(960,540)]
checks=[];screens=[];errors=[]
def sha(p:Path):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
with sync_playwright() as pw:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
 if os.environ.get('HOG_CHROME_PATH'):launch['executable_path']=os.environ['HOG_CHROME_PATH']
 browser=pw.chromium.launch(**launch)
 for width,height in SIZES:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1);page.set_default_timeout(10000)
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto(GAME.as_uri(),wait_until='load');page.locator('[data-action="race"][data-race="elf"]').click();page.locator('[data-action="start"]').click()
  setup=page.evaluate("""() => {const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),img=document.getElementById('unit-elf-scout');s.army.elf_2=16;E.setFormation(s,[{unitId:'elf_2',count:16}]);const target=E.TILES.find(t=>t.kind==='npc'&&t.value==='Azrael');if(!target)throw Error('Azrael target missing');E.startMarch(s,target.key);E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render();return {image:{complete:!!img?.complete,width:img?.naturalWidth,height:img?.naturalHeight,offline:!!img?.src?.startsWith('data:image/webp;base64,')},battle:!!s.battle,target:target.key,unit:s.battle?.allies.some(u=>u.unitId==='elf_2'),saveValid:E.strictSave(s)};}""")
  assert setup['image']['complete'] and setup['image']['width']==512 and setup['image']['height']==512 and setup['image']['offline'],{k:v for k,v in setup.items() if k!='state'}
  assert setup['battle'] and setup['unit'] and setup['saveValid'],f'{width}x{height} did not enter a valid actual Elf Scout encounter: {setup}'
  assert page.locator('#battle-canvas').is_visible()
  folder=ROOT/'docs'/'evidence'/'hg33'/'H2-elf-scout';before=folder/'before'/f'{width}x{height}.png';after=folder/'after'/f'{width}x{height}.png';before.parent.mkdir(parents=True,exist_ok=True);after.parent.mkdir(parents=True,exist_ok=True)
  page.evaluate("""() => {const e=document.getElementById('unit-elf-scout');window.__hg33ElfSrc=e.getAttribute('src');e.removeAttribute('src');HOG_APP_DEBUG.render()}""");page.wait_for_timeout(160);page.screenshot(path=str(before),animations='disabled')
  page.evaluate("""() => {document.getElementById('unit-elf-scout').setAttribute('src',window.__hg33ElfSrc);HOG_APP_DEBUG.render()}""");page.wait_for_function("()=>{const e=document.getElementById('unit-elf-scout');return e.complete&&e.naturalWidth===512}")
  paint=page.evaluate("""()=>{const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),c=document.getElementById('battle-canvas'),ctx=c.getContext('2d'),calls=[],original=ctx.drawImage,state=JSON.stringify(E.clone(s));ctx.drawImage=function(img,...a){if(img?.id==='unit-elf-scout')calls.push(img.id);return original.call(this,img,...a)};try{P.drawBattle(c,E,s,performance.now(),{showGrid:true});const layout=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height),elf=layout.find(e=>e.u.unitId==='elf_2');return {calls,stateUnchanged:state===JSON.stringify(E.clone(s)),saveValid:E.strictSave(s),spriteSize:elf?.size,labelNoOverlap:!!elf&&!P.battleRectOverlap(elf.label,elf.sprite,1)&&!layout.some(o=>o!==elf&&P.battleRectOverlap(elf.label,o.sprite,1))}}finally{ctx.drawImage=original}}""")
  assert paint['calls'] and paint['stateUnchanged'] and paint['saveValid'] and paint['labelNoOverlap'],f'{width}x{height} Elf Scout image not drawn or battle Save changed: {paint}'
  page.wait_for_timeout(100);page.screenshot(path=str(after),animations='disabled')
  checks.extend([{'viewport':f'{width}x{height}','check':'Original 512px RGBA-derived Elf Scout decodes from standalone file HTML','pass':True},{'viewport':f'{width}x{height}','check':'real engine march enters valid Elf Scout vs Azrael encounter; Save v07 remains strict','pass':True,'target':setup['target']},{'viewport':f'{width}x{height}','check':'before fallback and after original-art full-game screenshots captured','pass':True},{'viewport':f'{width}x{height}','check':'battle renderer draws source-linked Elf Scout and state remains unchanged','pass':True,'drawCalls':len(paint['calls'])}])
  screens.extend([{'state':'before-fallback','viewport':f'{width}x{height}','path':before.relative_to(ROOT).as_posix(),'sha256':sha(before)},{'state':'after-original-art','viewport':f'{width}x{height}','path':after.relative_to(ROOT).as_posix(),'sha256':sha(after)}]);page.close()
 browser.close()
receipt={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'html':GAME.name,'htmlSha256':sha(GAME),'browser':'Playwright using installed Chrome, local file://; actual Elf New Game selection and engine march into Azrael battle; 16-unit visual fixture (no battle outcome claimed).','checks':checks,'screenshots':screens,'pageErrors':errors,'animation':'Still master only. This capture does not claim original Idle/Walk/Attack/Hit/Death frames.','pass':len(checks)==8 and len(screens)==4 and not errors}
qa=ROOT/'docs'/'qa'/'hg33'/'H2-elf-scout-chromium.json';qa.parent.mkdir(parents=True,exist_ok=True);qa.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"HG33 H2 Elf Scout Chromium: {len(checks)}/8 checks; {len(screens)}/4 screenshots; {len(errors)} browser errors")
print(f"HTML SHA256 {receipt['htmlSha256']} · receipt {qa.relative_to(ROOT).as_posix()}")
if not receipt['pass']:raise SystemExit(1)