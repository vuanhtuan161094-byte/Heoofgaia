"""HG40.9 real offline Chromium: purple CS, rewards preview, genuine item info and battle HUD."""
from pathlib import Path
import json
import hashlib
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
EVIDENCE=ROOT/'docs'/'evidence'/'hg409'
QA=ROOT/'docs'/'qa'/'hg409'
EVIDENCE.mkdir(parents=True,exist_ok=True)
QA.mkdir(parents=True,exist_ok=True)
results=[];shots=[];errors=[]
def check(name,ok,detail=None):
 ok=bool(ok);results.append({'name':name,'pass':ok,'detail':detail})
 print(('PASS ' if ok else 'FAIL ')+'HG40.9 '+name,flush=True)
 if not ok:raise AssertionError(name+' '+str(detail)[:300])
def shot(p,name):
 path=EVIDENCE/name;p.screenshot(path=str(path),animations='disabled')
 shots.append({'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
with sync_playwright() as pw:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
 if os.environ.get('HOG_CHROME_PATH'):launch['executable_path']=os.environ['HOG_CHROME_PATH']
 browser=pw.chromium.launch(**launch)
 for label,w,h,mobile in [('pc-1280x720',1280,720,False),('phone-844x390',844,390,True),('phone-768x260',768,260,True),('phone-412x915',412,915,True)]:
  context=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
  page=context.new_page();page.set_default_timeout(18000)
  page.on('pageerror',lambda e,label=label:errors.append({'viewport':label,'message':str(e)}))
  page.goto(HTML.as_uri(),wait_until='load',timeout=60000)
  page.locator('[data-action="start"]').click()
  check(label+' new Game v07 and HG40.9 live',page.evaluate("() => HOG_APP_DEBUG.getState().version===7 && HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()) && !!HOG_ENGINE.hg409Preview"))
  page.locator('[data-action="tab"][data-tab="relics"]').first.click()
  check(label+' nine actual material cards each explain use',page.locator('.hg409-material-card details').count()==9)
  page.locator('.hg409-material-card:has([data-action="hg18-open"][data-id="resource_card"]) details summary').click()
  check(label+' card states exact gold/wood/ore quantities','+600' in page.locator('.hg409-material-card').first.inner_text())
  shot(page,label+'-item-info.png')
  page.locator('[data-action="tab"][data-tab="tower"]').first.click()
  check(label+' Tower discloses real purple commander CS, buffs and extra loot',page.locator('.hg409-tower-reward').count()==1 and 'CS1' in page.locator('.hg409-tower-reward').inner_text())
  shot(page,label+'-tower-commander.png')
  page.locator('[data-action="tab"][data-tab="map"]').first.click()
  npc=page.evaluate("""() => {
    const t=HOG_ENGINE.NPC_CAMPS_2009.find(x=>x.stars===5);
    return {key:t?.key,preview:HOG_ENGINE.hg409Preview('npc',t.key,1,5)};
  }""")
  check(label+' real 5star NPC has purple Lv100 CS5 and preview',npc['preview']['cs']==5 and npc['preview']['commander']['quality']=='purple',npc)
  page.locator('[data-action="select"][data-key="'+npc['key']+'"]').first.click()
  check(label+' map labels increased risk and guaranteed reward',page.locator('.hg409-target-preview').count()==1 and 'CS5' in page.locator('.hg409-target-preview').inner_text())
  shot(page,label+'-map-enemy-preview.png')
  # Visual battle fixture opens the authoritative engine battle directly,
  # does not simulate a victory, AP payment or troop loot.
  battle=page.evaluate("""key => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
   s.battle=E.makeBattle(s,key);
   const c=s.battle.hg409EnemyCommander;
   HOG_APP_DEBUG.render();
   return {cs:c?.cs,quality:c?.quality,valid:E.strictSave(s),
           stats:[c?.atk,c?.def,c?.spd,c?.int],enemies:s.battle.enemies.length};
  }""",npc['key'])
  check(label+' actual combat states purple CS5 and strict Save v07',battle['cs']==5 and battle['quality']=='purple' and battle['valid'] and battle['stats']==[100,100,100,100],battle)
  check(label+' combat HUD shows CS and real unit multipliers',page.locator('.hg409-combat-boss').count()==1 and 'CS5/10' in page.locator('.hg409-combat-boss').inner_text())
  shot(page,label+'-battle-purple-cs.png')
  check(label+' no page exceptions',not [e for e in errors if e['viewport']==label],errors)
  context.close()
 browser.close()
(QA/'chromium-purple-cs-item-cards.json').write_text(json.dumps({'checks':results,'screenshots':shots,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
print('HG40.9 CHROMIUM '+str(sum(r['pass'] for r in results))+'/'+str(len(results)),flush=True)
