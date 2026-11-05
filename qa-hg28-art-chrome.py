"""Render the real offline Army screen and verify HG28 T9/T10 sprites load."""
from __future__ import annotations
import hashlib
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).parent
GAME=ROOT/'Play-Heoofgaia-HG11.html'
SIZES=[(1280,720),(960,540)]
FACTIONS=['human','elf','orc','undead']
checks=[];screenshots=[];errors=[]
def sha(path:Path)->str:
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest().upper()

with sync_playwright() as pw:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
 if os.environ.get('HOG_CHROME_PATH'):launch['executable_path']=os.environ['HOG_CHROME_PATH']
 browser=pw.chromium.launch(**launch)
 for width,height in SIZES:
  for faction in FACTIONS:
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   page.set_default_timeout(10000)
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
   page.goto(GAME.as_uri(),wait_until='load')
   page.locator(f'[data-action="race"][data-race="{faction}"]').click()
   page.locator('[data-action="start"]').click()
   assert page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())')
   page.locator('[data-action="tab"][data-tab="army"]').first.click()
   roster=page.locator('.hg28-tab-army')
   assert roster.count()==1
   recruit_layout=page.evaluate("""({faction}) => {
    const body=document.querySelector('#game-modal-body').getBoundingClientRect(),row=document.querySelector('.hg28-tab-army .unitrow'),button=row?.querySelector('[data-action="recruit"]');
    const r=row?.getBoundingClientRect(),b=button?.getBoundingClientRect();
    const image=row?.querySelector('img[data-hg28-unit-image="human_1"]');
    return {unit:button?.dataset.id,buttonDisabled:button?.disabled,rowVisible:!!r&&r.top>=body.top-1&&r.bottom<=body.bottom+1,
     recruitVisible:!!b&&b.top>=body.top-1&&b.bottom<=body.bottom+1&&b.left>=0&&b.right<=innerWidth,
     spearReady:faction!=='human'||!!image?.complete&&image.naturalWidth===512&&image.naturalHeight===512&&image.src.startsWith('data:image/webp;base64,')};
   }""",{'faction':faction})
   assert recruit_layout['rowVisible'] and recruit_layout['recruitVisible'] and recruit_layout['spearReady'],f'{width}x{height} first troop art and live recruit action are clipped or missing: {recruit_layout}'
   checks.append({'viewport':f'{width}x{height}','check':f'{faction} first troop and recruit action fit the visible Army panel','pass':True,'layout':recruit_layout})
   recruit=page.locator('.hg28-tab-army .unitrow').first.locator('[data-action="recruit"]')
   assert recruit.is_enabled(),f'{width}x{height} {faction} starter troop is unexpectedly unavailable'
   recruit.click()
   page.wait_for_function('HOG_APP_DEBUG.getState().training.length===1')
   assert page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'),f'{width}x{height} real Army recruit invalidated Save v07'
   checks.append({'viewport':f'{width}x{height}','check':f'{faction} visible Recruit button starts a paid queue and preserves v07','pass':True,'unit':recruit_layout['unit']})
   completed=page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),q=s.training[0];
    E.tick(s,s.lastTick+q.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render();
    return {count:s.army[q.unitId],queue:s.training.length,valid:E.strictSave(s)};
   }""")
   assert completed['count']>=3 and completed['queue']==0 and completed['valid'],f'{width}x{height} real troop queue did not complete cleanly: {completed}'
   checks.append({'viewport':f'{width}x{height}','check':f'{faction} paid troop queue completes through game tick','pass':True,'trained':completed['count']})
   troop_ids=[f'{faction}_9',f'{faction}_10']
   assert page.locator('.hg28-tab-army img[data-hg28-troop]').count()==2
   for troop_id in troop_ids:
    image=page.locator(f'.hg28-tab-army img[data-hg28-troop="{troop_id}"]')
    assert image.count()==1,f'missing real Army image node {troop_id}'
   visible=False
   for _ in range(40):
    visible=page.evaluate("ids=>{const b=document.querySelector('#game-modal-body').getBoundingClientRect();return ids.every(id=>{const r=document.querySelector(`[data-hg28-troop=\"${id}\"]`).getBoundingClientRect();return r.top>=b.top-1&&r.bottom<=b.bottom+1})}",arg=troop_ids)
    if visible:break
    old_scroll=page.locator('#game-modal-body').evaluate('e=>e.scrollTop')
    page.locator('[data-action="modal-page"][data-dir="1"]').click()
    page.wait_for_timeout(80)
    if page.locator('#game-modal-body').evaluate('e=>e.scrollTop')<=old_scroll:break
   assert visible,f'{width}x{height} {faction} T9/T10 could not be reached with real page controls'
   for troop_id in troop_ids:
    page.wait_for_function("id=>{const e=document.querySelector(`[data-hg28-troop=\"${id}\"]`);return e&&e.complete&&e.naturalWidth===512}",arg=troop_id)
   loaded=page.locator('.hg28-tab-army img[data-hg28-troop]').evaluate_all("els=>els.map(e=>({id:e.dataset.hg28Troop,width:e.naturalWidth,height:e.naturalHeight,transparent:e.src.startsWith('data:image/png;base64,'),masterMatch:e.src===document.getElementById('hg28-troop-'+e.dataset.hg28Troop)?.src}))")
   assert len(loaded)==2 and all(x['width']==512 and x['height']==512 and x['transparent'] and x['masterMatch'] for x in loaded),loaded
   page.wait_for_timeout(100)
   path=ROOT/'docs'/'evidence'/'hg28'/'after'/f'{width}x{height}'/f'14-t9-t10-{faction}.png'
   path.parent.mkdir(parents=True,exist_ok=True)
   visible_assets=page.locator('.hg28-tab-army img[data-hg28-troop]').evaluate_all("els=>els.map(e=>({id:e.dataset.hg28Troop,visible:(()=>{const b=document.querySelector('#game-modal-body').getBoundingClientRect(),r=e.getBoundingClientRect();return r.top>=b.top-1&&r.bottom<=b.bottom+1})(),width:e.naturalWidth,height:e.naturalHeight,masterMatch:e.src===document.getElementById('hg28-troop-'+e.dataset.hg28Troop)?.src}))")
   if not all(x['visible'] for x in visible_assets):
    debug=page.evaluate("""() => {const b=document.querySelector('#game-modal-body'),br=b.getBoundingClientRect();return {scrollTop:b.scrollTop,scrollHeight:b.scrollHeight,client:b.clientHeight,items:[...document.querySelectorAll('.hg28-tab-army img[data-hg28-troop]')].map(e=>{const r=e.getBoundingClientRect();return {id:e.dataset.hg28Troop,top:r.top,bottom:r.bottom,width:r.width,height:r.height,bodyTop:br.top,bodyBottom:br.bottom}})}}""")
    print(f"VISIBLE ART DEBUG {width}x{height} {faction}: {json.dumps(debug)}",flush=True)
    page.screenshot(path=str(ROOT/'docs'/'evidence'/'hg28'/'after'/'army-debug-visible.png'))
   assert len(visible_assets)==2 and all(x['visible'] and x['width']==512 and x['height']==512 and x['masterMatch'] for x in visible_assets),visible_assets
   page.screenshot(path=str(path),animations='disabled')
   screenshots.append({'viewport':f'{width}x{height}','faction':faction,'troops':troop_ids,'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path)})
   checks.append({'viewport':f'{width}x{height}','check':f'{faction} T9/T10 PNGs load in live Army roster and v07 stays valid','pass':page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'),'troops':troop_ids})
   page.close()
 for width,height in SIZES:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  page.set_default_timeout(10000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
  page.goto(GAME.as_uri(),wait_until='load')
  page.locator('[data-action="start"]').click()
  setup=page.evaluate("""() => {
   const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
   const ids=['azrael','cyclops-tyrant','demonlord-samurai'];
   const assets=ids.map(key=>{const img=document.getElementById('hg28-boss-'+key);return {id:img?.id,ready:!!img?.complete&&img.naturalWidth===512&&img.naturalHeight===512,offline:img?.src.startsWith('data:image/webp;base64,')}});
   s.army.human_1=16;E.setFormation(s,[{unitId:'human_1',count:16}]);
   const target=E.TILES.find(t=>t.kind==='npc'&&t.value==='Azrael');
   if(!target)throw new Error('Authored HG18 Azrael map encounter is missing');
   E.startMarch(s,target.key);
   E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
   HOG_APP_DEBUG.render();
   return {assets,target:target.key,inBattle:!!s.battle,names:s.battle?.enemies.map(u=>u.name)||[],saveValid:E.strictSave(s)};
  }""")
  assert len(setup['assets'])==3 and all(a['ready'] and a['offline'] for a in setup['assets']),f'{width}x{height} boss WebP images did not decode offline: {setup}'
  checks.append({'viewport':f'{width}x{height}','check':'three original transparent boss WebP assets decode from file:// HTML','pass':True,'assets':setup['assets']})
  spear=page.evaluate("""() => {const img=document.getElementById('hg28-battle-human-spear-militia'),profile=HOG_PAINTER.MOTION_SPRITES.human_1;return {ready:!!img?.complete&&img.naturalWidth===512&&img.naturalHeight===512,offline:img?.src.startsWith('data:image/webp;base64,'),registered:profile?.id===img?.id,animated:HOG_PAINTER.animatedUnitId('human_1','Spear Militia')}}""")
  assert all(spear.values()),f'{width}x{height} Human Spear Militia offline sprite or motion profile failed: {spear}'
  checks.append({'viewport':f'{width}x{height}','check':'Human Spear Militia uses its own offline registered art and battle transform profile','pass':True,'asset':spear})
  assert setup['inBattle'] and setup['names']==['Azrael','Demonlord Samurai','Cyclop Tyrant'] and setup['saveValid'],f'{width}x{height} real engine march did not construct the authored boss fight: {setup}'
  canvas=page.locator('#battle-canvas')
  assert canvas.is_visible(),f'{width}x{height} boss battlefield is not visible'
  # BEFORE is a controlled comparison from the same live battle. Remove only
  # these four image sources so the continuous battle renderer stays on its
  # genuine fallback while Chromium captures the frame.
  before_path=ROOT/'docs'/'evidence'/'hg28'/'before'/f'{width}x{height}'/'15-boss-battle.png'
  before_path.parent.mkdir(parents=True,exist_ok=True)
  before=page.evaluate("""() => {
   const ids=['hg28-boss-azrael','hg28-boss-demonlord-samurai','hg28-boss-cyclops-tyrant','hg28-battle-human-spear-militia'];
   const images=ids.map(id=>{const e=document.getElementById(id);return {id,src:e?.getAttribute('src')}});
   for(const item of images)document.getElementById(item.id)?.removeAttribute('src');
   return {images,state:JSON.stringify(HOG_ENGINE.clone(HOG_APP_DEBUG.getState()))};
  }""")
  page.wait_for_timeout(120)
  page.screenshot(path=str(before_path),animations='disabled')
  before_draw=page.evaluate("""() => {
   const c=document.querySelector('#battle-canvas'),ctx=c.getContext('2d'),calls=[],original=ctx.drawImage;
   ctx.drawImage=function(image,...args){if(image?.id?.startsWith('hg28-boss-')||image?.id==='hg28-battle-human-spear-militia')calls.push(image.id);return original.call(this,image,...args)};
   try{HOG_PAINTER.drawBattle(c,HOG_ENGINE,HOG_APP_DEBUG.getState(),performance.now(),{showGrid:false});return calls}
   finally{ctx.drawImage=original}
  }""")
  assert not before_draw,f'{width}x{height} BEFORE frame still drew new art: {before_draw}'
  page.evaluate("""images=>{for(const item of images){const e=document.getElementById(item.id);if(e&&item.src)e.setAttribute('src',item.src)}}""",before['images'])
  page.wait_for_function("ids=>ids.every(id=>{const e=document.getElementById(id);return e?.complete&&e.naturalWidth===512})",arg=['hg28-boss-azrael','hg28-boss-demonlord-samurai','hg28-boss-cyclops-tyrant','hg28-battle-human-spear-militia'])
  assert page.evaluate("s=>JSON.stringify(HOG_ENGINE.clone(HOG_APP_DEBUG.getState()))===s",before['state']),f'{width}x{height} art comparison changed live battle state'
  screenshots.append({'viewport':f'{width}x{height}','state':'boss-art-before-controlled-fallback','path':before_path.relative_to(ROOT).as_posix(),'sha256':sha(before_path)})
  checks.append({'viewport':f'{width}x{height}','check':'BEFORE Chromium frame uses the real fallback with generated sprite sources disabled and unchanged battle state','pass':before_path.stat().st_size>10000 and not before_draw})
  painted=page.evaluate("""() => {
   const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),c=document.querySelector('#battle-canvas'),ctx=c.getContext('2d');
   const calls=[],original=ctx.drawImage,stateBefore=JSON.stringify(E.clone(s));
   ctx.drawImage=function(image,...args){if(image?.id?.startsWith('hg28-boss-')||image?.id==='hg28-battle-human-spear-militia')calls.push(image.id);return original.call(this,image,...args)};
   try{
    P.drawBattle(c,E,s,performance.now(),{showGrid:false});const first=c.toDataURL('image/png');
    P.drawBattle(c,E,s,performance.now()+250,{showGrid:false});const second=c.toDataURL('image/png');
    const layout=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height);
    return {calls,changed:first!==second,stable:JSON.stringify(E.clone(s))===stateBefore,
     labelsFit:layout.every(e=>!layout.some(o=>o!==e&&P.battleRectOverlap(e.label,o.sprite,1))&&!P.battleRectOverlap(e.label,{x:c.width-190,y:58,w:184,h:38},1)),
     profileNames:s.battle.enemies.map(u=>P.bossSprite(u.name)?.id||null)};
   }finally{ctx.drawImage=original}
  }""")
  expected=['hg28-boss-azrael','hg28-boss-demonlord-samurai','hg28-boss-cyclops-tyrant']
  spear_drawn=painted['calls'].count('hg28-battle-human-spear-militia')>=2
  assert all(painted['calls'].count(asset)>=2 for asset in expected) and spear_drawn and painted['changed'] and painted['stable'] and painted['labelsFit'] and painted['profileNames']==expected,f'{width}x{height} battle failed to draw/animate registered battle troops cleanly: {painted}'
  checks.append({'viewport':f'{width}x{height}','check':'real boss battle draws all three portraits and the custom Spear Militia, idle motion changes, HUD labels clear and game state stays unchanged','pass':True,'drawn':painted['calls'],'labelsFit':painted['labelsFit']})
  after_path=ROOT/'docs'/'evidence'/'hg28'/'after'/f'{width}x{height}'/'15-boss-battle.png'
  after_path.parent.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(after_path),animations='disabled')
  screenshots.append({'viewport':f'{width}x{height}','state':'boss-battle-after-art','path':after_path.relative_to(ROOT).as_posix(),'sha256':sha(after_path)})
  checks.append({'viewport':f'{width}x{height}','check':'AFTER actual boss battlefield screenshot captured at target size','pass':after_path.stat().st_size>10000})
  page.close()
 browser.close()

receipt={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'html':GAME.name,'htmlSha256':sha(GAME),'browser':'Playwright Chromium, local file://; Army UI plus actual engine March into the authored Azrael encounter; Boss visual lineup uses 16 deployed Human Spear Militias as a disclosed art fixture, not organic progression.','screenshots':screenshots,'checks':checks,'pageErrors':errors,'animation':'Boss and Spear Militia still masters use the existing event-linked Idle/Walk/Attack/Hit/Death transform renderer; no fabricated action frames. Human Archer retains its real 48-frame atlas; Skeleton HG22.1 remains untouched.','pass':len(checks)==42 and len(screenshots)==12 and not errors}
qa=ROOT/'docs'/'qa'/'hg28'/'art-chrome.json';qa.parent.mkdir(parents=True,exist_ok=True);qa.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"HG28 Army/T9-T10 and Boss Chromium: {len(checks)}/42 checks; {len(screenshots)}/12 screenshots; {len(errors)} page/console errors")
print(f"HTML SHA-256 {receipt['htmlSha256']} · receipt {qa.relative_to(ROOT).as_posix()}")
if not receipt['pass']:raise SystemExit(1)
