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
   troop_ids=[f'{faction}_9',f'{faction}_10']
   assert page.locator('.hg28-tab-army img[data-hg28-troop]').count()==2
   for troop_id in troop_ids:
    image=page.locator(f'.hg28-tab-army img[data-hg28-troop="{troop_id}"]')
    assert image.count()==1,f'missing real Army image node {troop_id}'
   visible=False
   for _ in range(12):
    visible=page.evaluate("ids=>{const b=document.querySelector('#game-modal-body').getBoundingClientRect();return ids.every(id=>{const r=document.querySelector(`[data-hg28-troop=\"${id}\"]`).getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom})}",arg=troop_ids)
    if visible:break
    page.locator('[data-action="modal-page"][data-dir="1"]').click()
    page.wait_for_timeout(80)
   assert visible,f'{width}x{height} {faction} T9/T10 could not be reached with real page controls'
   for troop_id in troop_ids:
    page.wait_for_function("id=>{const e=document.querySelector(`[data-hg28-troop=\"${id}\"]`);return e&&e.complete&&e.naturalWidth===512}",arg=troop_id)
   loaded=page.locator('.hg28-tab-army img[data-hg28-troop]').evaluate_all("els=>els.map(e=>({id:e.dataset.hg28Troop,width:e.naturalWidth,height:e.naturalHeight,transparent:e.src.startsWith('data:image/png;base64,'),masterMatch:e.src===document.getElementById('hg28-troop-'+e.dataset.hg28Troop)?.src}))")
   assert len(loaded)==2 and all(x['width']==512 and x['height']==512 and x['transparent'] and x['masterMatch'] for x in loaded),loaded
   page.wait_for_timeout(100)
   path=ROOT/'docs'/'evidence'/'hg28'/'after'/f'{width}x{height}'/f'14-t9-t10-{faction}.png'
   path.parent.mkdir(parents=True,exist_ok=True)
   visible_assets=page.locator('.hg28-tab-army img[data-hg28-troop]').evaluate_all("els=>els.map(e=>({id:e.dataset.hg28Troop,visible:(()=>{const b=document.querySelector('#game-modal-body').getBoundingClientRect(),r=e.getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom})(),width:e.naturalWidth,height:e.naturalHeight,masterMatch:e.src===document.getElementById('hg28-troop-'+e.dataset.hg28Troop)?.src}))")
   assert len(visible_assets)==2 and all(x['visible'] and x['width']==512 and x['height']==512 and x['masterMatch'] for x in visible_assets),visible_assets
   page.screenshot(path=str(path),animations='disabled')
   screenshots.append({'viewport':f'{width}x{height}','faction':faction,'troops':troop_ids,'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path)})
   checks.append({'viewport':f'{width}x{height}','check':f'{faction} T9/T10 PNGs load in live Army roster and v07 stays valid','pass':page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'),'troops':troop_ids})
   page.close()
 browser.close()

receipt={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'html':GAME.name,'htmlSha256':sha(GAME),'browser':'Playwright Chromium, local file://; new game and actual Army UI','screenshots':screenshots,'checks':checks,'pageErrors':errors,'animation':'Still masters in Army UI. Existing battle action rendering retained; these new masters have no fabricated action frames.','pass':len(checks)==8 and len(screenshots)==8 and not errors}
qa=ROOT/'docs'/'qa'/'hg28'/'art-chrome.json';qa.parent.mkdir(parents=True,exist_ok=True);qa.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"HG28 actual Army art Chromium: {len(checks)}/8 faction/viewport checks; {len(screenshots)}/8 screenshots; {len(errors)} page/console errors")
print(f"HTML SHA-256 {receipt['htmlSha256']} · receipt {qa.relative_to(ROOT).as_posix()}")
if not receipt['pass']:raise SystemExit(1)
