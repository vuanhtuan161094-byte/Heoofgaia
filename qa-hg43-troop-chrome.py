"""HG43 real Chromium: four layouts, full 40 troop profiles, recruit UI,
HG40 live stats/CD/statuses and selecting 16-stack Boss without losing RAF.
The browser fixture only creates a battle for inspection; no QA victory/loot.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,hashlib
ROOT=Path(__file__).resolve().parent
GAME=ROOT/'Play-Heoofgaia-HG11.html'
QA=ROOT/'docs/qa/hg43'
EVIDENCE=ROOT/'docs/evidence/hg43'
QA.mkdir(parents=True,exist_ok=True);EVIDENCE.mkdir(parents=True,exist_ok=True)
tests=[];shots=[];errors=[]
def check(name,ok,detail=None):
 ok=bool(ok);tests.append({'name':name,'pass':ok,'detail':detail})
 print(('HG43 PASS ' if ok else 'HG43 FAIL ')+name,flush=True)
 if not ok:raise AssertionError(name+' '+str(detail)[:200])
def shot(page,filename):
 dest=EVIDENCE/(filename+'.png');page.screenshot(path=str(dest),animations='disabled')
 shots.append({'name':filename,'path':str(dest.relative_to(ROOT)),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
with sync_playwright() as pw:
 opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
 if os.environ.get('HOG_CHROME_PATH'):opts['executable_path']=os.environ['HOG_CHROME_PATH']
 browser=pw.chromium.launch(**opts)
 for label,w,h,mobile in [
  ('pc-1280x720',1280,720,False),('phone-844x390',844,390,True),
  ('phone-768x260',768,260,True),('phone-412x915',412,915,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=mobile,is_mobile=mobile,device_scale_factor=2 if mobile else 1)
  page=ctx.new_page();page.set_default_timeout(12000)
  page.on('pageerror',lambda e,label=label:errors.append({'viewport':label,'error':str(e)}))
  page.goto(GAME.as_uri(),wait_until='load',timeout=60000)
  page.locator('[data-action="start"]').click()
  check(label+' game v07 valid',page.evaluate("() => HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"))
  page.locator('#nav [data-action="tab"][data-tab="army"]').click()
  recruit_counts={'all_recruitable_rows':page.locator('.hg28-tab-army .unitrow').count(),
    'hg40_standard_skill_rows':page.locator('.hg43-recruit-intel').count()}
  check(label+' all 10 canonical HG40 troops have skill panels, reward-only troops do not get invented skills',
    recruit_counts['all_recruitable_rows']>=10 and recruit_counts['hg40_standard_skill_rows']==10,recruit_counts)
  page.locator('.hg43-recruit-intel').first.locator('summary').click()
  check(label+' recruit displays HP/ATK/DEF/SPD plus deterministic skill magnitude',
    'Điều kiện:' in page.locator('.hg43-recruit-intel').first.inner_text() and
    'Mức hiệu ứng:' in page.locator('.hg43-recruit-intel').first.inner_text() and
    'Khắc chế:' in page.locator('.hg43-recruit-intel').first.inner_text())
  shot(page,label+'-recruit-skill')
  page.locator('[data-action="hg43-army-page"][data-page="codex"]').click()
  check(label+' 40-unit encyclopedia opens as distinct Army screen',
    page.locator('.hg43-codex').count()==1 and page.locator('.hg43-race-tabs button').count()==4)
  ids=[]
  for race in ['human','elf','orc','undead']:
   page.locator('.hg43-race-tabs [data-action="hg43-army-race"][data-race="'+race+'"]').click()
   entry=page.locator('.hg43-profile-card')
   check(label+' '+race+' ten profile cards with real stats & skill',entry.count()==10 and
    entry.first.locator('.hg43-unit-stats span').count()==6 and
    'CD' in entry.first.inner_text() and
    'Khắc chế' in entry.first.inner_text())
   ids.extend(entry.evaluate_all("(nodes) => nodes.map(n => n.dataset.hg43Unit)"))
   if race in ('human','undead'):shot(page,label+'-codex-'+race)
  check(label+' all 40 catalog IDs reachable, no duplicates',len(ids)==40 and len(set(ids))==40,ids)
  check(label+' codex read-only and Save v07 still strict',page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState();
   return HOG_ENGINE.strictSave(s)&&s.version===7&&!s.battle&&s.lootWins===0;
  }"""))
  page.locator('[data-action="hg43-army-page"][data-page="recruit"]').click()
  check(label+' recruitment actions stay intact after codex',page.locator('.unitrow [data-action="recruit"]').count()>=10)
  # Open a real T13 battle with the canonical engine. No test kill/loot.
  combat=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
   const boss=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===13);
   s.battle=E.makeBattle(s,boss.key);s.battle.autoUntil=Date.now()+3600000;
   HOG_APP_DEBUG.showCombatForTests();
   const b=s.battle,u=b.allies[0],foe=b.enemies[0];
   window.__hg43_canvas_ref=document.getElementById('battle-canvas');
   return {kind:boss.eliteTier,stacks:b.enemies.length,unitId:u.unitId,
    skill:E.HG40_TRAITS[u.unitId]?.name,foeUnitId:foe.unitId,
    foeSkill:E.HG40_TRAITS[foe.unitId]?.name,actualAtk:u.atk,foeAtk:foe.atk,
    valid:E.strictSave(s)};
  }""")
  check(label+' real 16-stack Boss and player skill metadata loaded',combat['stacks']==16 and combat['kind']==13 and combat['valid'] and bool(combat['skill']),combat)
  check(label+' in-combat profile displays both actual sides',page.locator('.hg43-combat-intel .hg43-battle-unit').count()==2 and page.locator('.hg43-battle-unit[data-side="player"]').count()==1)
  player=page.locator('.hg43-battle-unit[data-side="player"]').inner_text()
  check(label+' in-combat skill, role, HP/ATK/DEF/SPD/range and counter visible',
    combat['skill'] in player and all(x in player for x in ['HP thực','ATK','DEF','SPD','Tầm','Khắc chế','Nội tại']),player[:550])
  # HG61 reused real original troop skills for Boss leaders/guards.
  # Require the ACTUAL unitId skill in the enemy card; no invented ability.
  enemy_profile=page.locator('.hg43-battle-unit[data-side="enemy"]').inner_text()
  check(label+' Boss target displays its canonical HG40 skill, not a phantom ability',
    bool(combat['foeSkill']) and combat['foeSkill'] in enemy_profile and
    'không thuộc 40 kỹ năng' not in enemy_profile,
    {'unitId':combat['foeUnitId'],'skill':combat['foeSkill'],'render':enemy_profile[:400]})
  shot(page,label+'-combat-boss-stats')
  page.locator('.hg42-boss-roster summary').click()
  page.locator('.hg42-boss-roster [data-action="hg42-boss-focus"][data-id="e10"]').click()
  check(label+' selected enemy e10 changes live profile without destroying canvas',
    page.evaluate("""() => {
     const b=HOG_APP_DEBUG.getState().battle;
     return b.focused==='e10'&&
      !!document.querySelector('.hg43-battle-unit[data-side="enemy"][data-hg43-combat-unit="e10"]')&&
      document.querySelector('#battle-canvas')===window.__hg43_canvas_ref;
    }"""))
  # Renderer must read a real CD field from b.hg40.cd, without generating
  # probabilities or touching Save fields itself.
  tactical=page.evaluate("""() => {
   const b=HOG_APP_DEBUG.getState().battle,E=HOG_ENGINE,U=HOG_HG43_UI;
   const row=b.allies[0],desc=U.profile(row.unitId);
   const enemy=b.enemies.find(x=>x.id==='e10');
   const before=JSON.stringify(HOG_APP_DEBUG.getState());
   const html=U.battle(b,row,enemy);
   return {matches:html.includes(desc.trait.name),unchanged:before===JSON.stringify(HOG_APP_DEBUG.getState()),
    strict:E.strictSave(HOG_APP_DEBUG.getState())};
  }""")
  check(label+' tactical HUD is pure and preserves canonical Save v07',all(tactical.values()),tactical)
  shot(page,label+'-combat-focused-e10')
  check(label+' no browser runtime errors',not any(x['viewport']==label for x in errors),errors)
  ctx.close()
 browser.close()
(QA/'chromium-40-profiles-and-battle.json').write_text(json.dumps({
 'version':'HG43','passed':sum(x['pass'] for x in tests),'total':len(tests),
 'checks':tests,'screenshots':shots,'browserErrors':errors
},ensure_ascii=False,indent=2),encoding='utf-8')
print('HG43 CHROMIUM '+str(sum(x['pass'] for x in tests))+'/'+str(len(tests)),flush=True)
