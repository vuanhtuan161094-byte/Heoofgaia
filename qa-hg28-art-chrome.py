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
EVIDENCE=Path(os.environ.get('HOG_HG28_ART_EVIDENCE_ROOT',ROOT/'docs'/'evidence'/'hg28'))
REPORT=Path(os.environ.get('HOG_HG28_ART_REPORT',ROOT/'docs'/'qa'/'hg28'/'art-chrome.json'))
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
   # HG62 production at 5000x can finish *before* the next Chromium poll.
   # Snapshot canonical stock and accept only a paid queue OR delivered stock.
   before_recruit=page.evaluate("""id=>{
      const s=HOG_APP_DEBUG.getState();return {unitId:id,stock:s.army[id]||0,
        queue:s.training.length,valid:HOG_ENGINE.strictSave(s)};
   }""",recruit_layout['unit'])
   recruit.click()
   paid=page.evaluate("""id=>{
     const s=HOG_APP_DEBUG.getState();return {unitId:id,stock:s.army[id]||0,
       queue:s.training.length,queued:s.training.at(-1)?.unitId||null,
       valid:HOG_ENGINE.strictSave(s)};
   }""",recruit_layout['unit'])
   queued=(paid['queue']==before_recruit['queue']+1 and paid['queued']==recruit_layout['unit'])
   delivered=(paid['queue']==before_recruit['queue'] and paid['stock']>before_recruit['stock'])
   assert before_recruit['valid'] and paid['valid'] and (queued or delivered),f'{width}x{height} real paid troop request neither queued nor delivered: {before_recruit} => {paid}'
   checks.append({'viewport':f'{width}x{height}','check':f'{faction} Recruit really queues or immediately delivers paid stock and preserves v07',
       'pass':True,'unit':recruit_layout['unit'],'mode':'queued' if queued else 'delivered'})
   completed=page.evaluate("""id => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),q=s.training.find(x=>x.unitId===id);
    if(q)E.tick(s,s.lastTick+q.remaining/s.speed*1000+1000);
    HOG_APP_DEBUG.render();
    return {unitId:id,count:s.army[id]||0,queue:s.training.length,valid:E.strictSave(s)};
   }""",recruit_layout['unit'])
   assert completed['count']>before_recruit['stock'] and completed['queue']==0 and completed['valid'],f'{width}x{height} real troop delivery did not complete cleanly: {completed}'
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
   # HG69: lossless offline pack encodes original RGBA masters as WebP.
   # A data:image/png MIME prefix never proved pixel transparency, and was
   # falsely rejecting perfectly loaded WebP assets. Check actual alpha via
   # Chromium Canvas and preserve the exact original master-src comparison.
   loaded=page.locator('.hg28-tab-army img[data-hg28-troop]').evaluate_all("""els=>els.map(e=>{
     const c=document.createElement('canvas');c.width=e.naturalWidth;c.height=e.naturalHeight;
     const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(e,0,0);
     const corners=[[0,0],[c.width-1,0],[0,c.height-1],[c.width-1,c.height-1]];
     const alphas=corners.map(([x,y])=>cx.getImageData(x,y,1,1).data[3]);
     const pixels=cx.getImageData(0,0,c.width,c.height).data;
     let visible=0;for(let j=3;j<pixels.length;j+=4)if(pixels[j]>32)visible++;
     return {id:e.dataset.hg28Troop,width:e.naturalWidth,height:e.naturalHeight,
       offline:/^data:image\/(?:png|webp);base64,/.test(e.src),
       transparent:alphas.every(alpha=>alpha<255),visiblePixels:visible,
       masterMatch:e.src===document.getElementById('hg28-troop-'+e.dataset.hg28Troop)?.src};
   })""")
   assert (len(loaded)==2 and all(x['width']==512 and x['height']==512 and x['offline'] and
      x['transparent'] and x['visiblePixels']>5000 and x['masterMatch'] for x in loaded)),loaded
   page.wait_for_timeout(100)
   path=EVIDENCE/'after'/f'{width}x{height}'/f'14-t9-t10-{faction}.png'
   path.parent.mkdir(parents=True,exist_ok=True)
   visible_assets=page.locator('.hg28-tab-army img[data-hg28-troop]').evaluate_all("els=>els.map(e=>({id:e.dataset.hg28Troop,visible:(()=>{const b=document.querySelector('#game-modal-body').getBoundingClientRect(),r=e.getBoundingClientRect();return r.top>=b.top-1&&r.bottom<=b.bottom+1})(),width:e.naturalWidth,height:e.naturalHeight,masterMatch:e.src===document.getElementById('hg28-troop-'+e.dataset.hg28Troop)?.src}))")
   if not all(x['visible'] for x in visible_assets):
    debug=page.evaluate("""() => {const b=document.querySelector('#game-modal-body'),br=b.getBoundingClientRect();return {scrollTop:b.scrollTop,scrollHeight:b.scrollHeight,client:b.clientHeight,items:[...document.querySelectorAll('.hg28-tab-army img[data-hg28-troop]')].map(e=>{const r=e.getBoundingClientRect();return {id:e.dataset.hg28Troop,top:r.top,bottom:r.bottom,width:r.width,height:r.height,bodyTop:br.top,bodyBottom:br.bottom}})}}""")
    print(f"VISIBLE ART DEBUG {width}x{height} {faction}: {json.dumps(debug)}",flush=True)
    page.screenshot(path=str(EVIDENCE/'after'/'army-debug-visible.png'))
   assert len(visible_assets)==2 and all(x['visible'] and x['width']==512 and x['height']==512 and x['masterMatch'] for x in visible_assets),visible_assets
   page.screenshot(path=str(path),animations='disabled')
   screenshots.append({'viewport':f'{width}x{height}','faction':faction,'troops':troop_ids,'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path)})
   checks.append({'viewport':f'{width}x{height}','check':f'{faction} T9/T10 transparent optimized images load in Army roster and v07 stays valid','pass':page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'),'troops':troop_ids})
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
  spear=page.evaluate("""() => {const img=document.getElementById('hg28-battle-human-spear-militia'),profile=HOG_PAINTER.MOTION_SPRITES.human_1,atlas=HOG_HG33_TROOP_ATLASES?.units?.human_1;return {ready:!!img?.complete&&img.naturalWidth===512&&img.naturalHeight===512,offline:img?.src.startsWith('data:image/webp;base64,'),registered:profile?.id===img?.id,animated:HOG_PAINTER.animatedUnitId('human_1','Spear Militia'),atlas:!!atlas&&['idle','walk','attack','hit','death'].every(a=>atlas.actions[a]?.count===8)}}""")
  assert all(spear.values()),f'{width}x{height} Human Spear Militia offline sprite or motion profile failed: {spear}'
  checks.append({'viewport':f'{width}x{height}','check':'Human Spear Militia uses its own offline registered art and battle transform profile','pass':True,'asset':spear})
  # HG61: three named Boss leaders keep their own atlases; the remaining
  # thirteen are distinct genuine HG40 troop archetypes (not Boss clones).
  assert (setup['inBattle'] and len(setup['names'])==16 and len(set(setup['names']))>=4 and
   setup['names'][:3]==['Azrael','Demonlord Samurai','Cyclop Tyrant'] and
   all(name.endswith(' · Hộ vệ') for name in setup['names'][3:]) and setup['saveValid']),f'{width}x{height} real engine march did not construct the authentic three-leader + thirteen-minion Boss fight: {setup}'
  canvas=page.locator('#battle-canvas')
  assert canvas.is_visible(),f'{width}x{height} boss battlefield is not visible'
  # HG69: before/after are two REAL frames of the live HG33 atlas combat,
  # never an artificial legacy fallback. HG61's runtime correctly retains
  # its original atlas resolver; nulling the public global is not an art switch.
  # Both frames must depict all named Bosses and a real troop, without
  # mutating the authoritative battle state or its existing Save v07.
  before_path=EVIDENCE/'before'/f'{width}x{height}'/'15-boss-battle.png'
  before_path.parent.mkdir(parents=True,exist_ok=True)
  before=page.evaluate("""() => {
   const ids=['hg28-boss-azrael','hg28-boss-demonlord-samurai','hg28-boss-cyclops-tyrant','hg28-battle-human-spear-militia'];
   const images=ids.map(id=>{const e=document.getElementById(id);return {id,src:e?.getAttribute('src')}});
   return {images,state:JSON.stringify(HOG_ENGINE.clone(HOG_APP_DEBUG.getState()))};
  }""")
  page.wait_for_timeout(120)
  page.screenshot(path=str(before_path),animations='disabled')
  before_draw=page.evaluate("""() => {
   const c=document.querySelector('#battle-canvas'),ctx=c.getContext('2d'),calls=[],original=ctx.drawImage;
   ctx.drawImage=function(image,...args){if(image?.id?.startsWith('hg28-boss-')||image?.id?.startsWith('hg28-battle-')||image?.id?.startsWith('unit-hg33-')||image?.id?.startsWith('hg33-atlas-'))calls.push(image.id);return original.call(this,image,...args)};
   try{return {calls:(HOG_PAINTER.drawBattle(c,HOG_ENGINE,HOG_APP_DEBUG.getState(),performance.now(),{showGrid:false}),calls),state:JSON.stringify(HOG_ENGINE.clone(HOG_APP_DEBUG.getState()))}}
   finally{ctx.drawImage=original}
  }""")
  expected_first=['unit-hg33-human-1-atlas','hg33-atlas-azrael','hg33-atlas-demonlord-samurai','hg33-atlas-cyclop-tyrant']
  assert all(before_draw['calls'].count(asset)>=1 for asset in expected_first) and before_draw['state']==before['state'],f'{width}x{height} baseline real Boss atlas did not render on the original 16-stack encounter: {before_draw}'
  assert page.evaluate("()=>!!HOG_HG33_TROOP_ATLASES?.resolve?.(null,'Azrael')"),'Live Boss atlas resolver was lost before comparing frames'
  page.wait_for_function("ids=>ids.every(id=>{const e=document.getElementById(id);return e?.complete&&e.naturalWidth===512})",arg=['hg28-boss-azrael','hg28-boss-demonlord-samurai','hg28-boss-cyclops-tyrant','hg28-battle-human-spear-militia'])
  page.evaluate("""async ids=>Promise.all(ids.map(async id=>{const e=document.getElementById(id);if(!e.hasAttribute('src'))e.src=e.dataset.hg33AtlasSrc;await e.decode();return e.naturalWidth===1536&&e.naturalHeight===1024}))""",['hg33-atlas-azrael','hg33-atlas-demonlord-samurai','hg33-atlas-cyclop-tyrant'])
  assert page.evaluate("s=>JSON.stringify(HOG_ENGINE.clone(HOG_APP_DEBUG.getState()))===s",before['state']),f'{width}x{height} art comparison changed live battle state'
  screenshots.append({'viewport':f'{width}x{height}','state':'boss-live-atlas-first-frame','path':before_path.relative_to(ROOT).as_posix(),'sha256':sha(before_path)})
  checks.append({'viewport':f'{width}x{height}','check':'FIRST live Chromium frame draws original HG33 Boss and troop atlases without changing Save state',
    'pass':before_path.stat().st_size>10000 and all(before_draw['calls'].count(asset)>=1 for asset in expected_first) and before_draw['state']==before['state'],'drawn':before_draw['calls']})
  painted=page.evaluate("""() => {
   const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),c=document.querySelector('#battle-canvas'),ctx=c.getContext('2d');
   const calls=[],original=ctx.drawImage,stateBefore=JSON.stringify(E.clone(s));
   ctx.drawImage=function(image,...args){if(image?.id?.startsWith('hg28-boss-')||image?.id?.startsWith('hg28-battle-')||image?.id?.startsWith('unit-hg33-')||image?.id?.startsWith('hg33-atlas-'))calls.push(image.id);return original.call(this,image,...args)};
   try{
    P.drawBattle(c,E,s,performance.now(),{showGrid:false});const first=c.toDataURL('image/png');
    P.drawBattle(c,E,s,performance.now()+250,{showGrid:false});const second=c.toDataURL('image/png');
    const layout=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height);
    return {calls,changed:first!==second,stable:JSON.stringify(E.clone(s))===stateBefore,
     labelsFit:layout.filter(e=>e.label).every(e=>!layout.some(o=>o!==e&&P.battleRectOverlap(e.label,o.sprite,1))),
     bossActorCount:s.battle.enemies.length,
     profileNames:s.battle.enemies.map(u=>P.bossSprite(u.name)?.id||null)};
   }finally{ctx.drawImage=original}
  }""")
  expected=['hg33-atlas-azrael','hg33-atlas-demonlord-samurai','hg33-atlas-cyclop-tyrant']
  expected_profiles=['hg28-boss-azrael','hg28-boss-demonlord-samurai','hg28-boss-cyclops-tyrant']
  atlas_drawn=painted['calls'].count('unit-hg33-human-1-atlas')>=2
  assert (all(painted['calls'].count(asset)>=2 for asset in expected) and atlas_drawn and
   painted['changed'] and painted['stable'] and painted['labelsFit'] and
   painted['bossActorCount']==16 and painted['profileNames'][:3]==expected_profiles and
   painted['profileNames'][3:]==[None]*13),f'{width}x{height} battle failed to draw/animate three authentic Boss atlases and thirteen real troop atlases: {painted}'
  checks.append({'viewport':f'{width}x{height}','check':'real sixteen-stack Boss battle draws all three authored atlas archetypes and eight-frame Spear Militia, with live animation, safe visible labels and unchanged Save','pass':True,'drawn':painted['calls'],'labelsFit':painted['labelsFit']})
  after_path=EVIDENCE/'after'/f'{width}x{height}'/'15-boss-battle.png'
  after_path.parent.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(after_path),animations='disabled')
  screenshots.append({'viewport':f'{width}x{height}','state':'boss-battle-after-art','path':after_path.relative_to(ROOT).as_posix(),'sha256':sha(after_path)})
  checks.append({'viewport':f'{width}x{height}','check':'AFTER actual boss battlefield screenshot captured at target size','pass':after_path.stat().st_size>10000})
  page.close()
 browser.close()

receipt={'sourceCommit':subprocess.check_output(['git','-c',f'safe.directory={ROOT.resolve().as_posix()}','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'html':GAME.name,'htmlSha256':sha(GAME),'browser':'Playwright Chromium, local file://; Army UI plus actual engine March into the authored Azrael encounter; Boss visual lineup uses 16 deployed Human Spear Militias as a disclosed art fixture, not organic progression.','screenshots':screenshots,'checks':checks,'pageErrors':errors,'animation':'Before/after captures exercise the original runtime HG33 8-frame five-action atlas at two distinct times; no legacy fallback is forced. The 38 generated atlases complement Human Archer HG14.3 (48 source frames) and the unchanged Skeleton HG22.1 animation. Eight T9/T10 authored rig masters remain preserved by the HG28 Chromium gate.','pass':len(checks)==42 and len(screenshots)==12 and not errors}
qa=REPORT;qa.parent.mkdir(parents=True,exist_ok=True);qa.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"HG28 Army/T9-T10 and Boss Chromium: {len(checks)}/42 checks; {len(screenshots)}/12 screenshots; {len(errors)} page/console errors")
print(f"HTML SHA-256 {receipt['htmlSha256']} · receipt {qa.relative_to(ROOT).as_posix()}")
if not receipt['pass']:raise SystemExit(1)
