"""HG64: combat-earned Boss/Tower multi-channel receipts are shown exactly once in the offline popup.
Battlefield enemy health is a QA speed fixture ONLY; settlement, skill paths, loot rolls and Save remain production engine.
"""
from pathlib import Path
import sys,json,hashlib,atexit
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
OUT=ROOT/"docs/qa/hg64"; SHOTS=ROOT/"docs/evidence/hg64"
OUT.mkdir(parents=True,exist_ok=True);SHOTS.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];screens=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(name,condition,details=None):
 ok=bool(condition)
 checks.append({'name':name,'pass':ok,'detail':None if ok else details})
 print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 if not ok:raise AssertionError(name+' '+str(details)[:900])
def shot(page,name):
 p=SHOTS/(name+".png");page.screenshot(path=str(p),animations="disabled")
 screens.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
@atexit.register
def record():
 report={'suite':'HG64 Boss/Tower real receipt presentation','checks':checks,'pass':sum(c['pass'] for c in checks),'total':len(checks),'errors':errors,'screens':screens,
 'htmlSha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
 'fixtureDisclosure':'Boss: funded L100 human and 500 Archangels are explicit loadout fixture, actual engine route/march/battle and reward settlement. Tower: regular New Game team. To avoid 30-minute battles, enemy HP/count are set to 1 and other squads 0 in active battle ONLY, never add or fabricate loot, victory or report. UI click performs the one real production battle settlement.'}
 (OUT/'real-boss-tower-chromium.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
def weaken(page):
 return page.evaluate("""()=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),b=s.battle;
  if(!b||!b.allies?.length||!b.enemies?.length)throw Error('Expected actual active fight');
  const a=b.allies.find(u=>u.pool>0);if(!a)throw Error('No real allied army');
  b.enemies.forEach((e,i)=>{e.count=i===0?1:0;e.initial=i===0?1:0;e.hp=1;e.pool=i===0?1:0;
    e.def=0;e.atk=0;e.range=1;
    e.x=i===0?(a.x<11?a.x+1:a.x-1):11;e.y=i===0?a.y:8;});
  b.autoUntil=Date.now()+600000;s.battleAuto=false;
  const before={resources:{...s.res},v7:E.strictSave(s),existingReports:s.battleReports?.length||0,
    towerEssence:s.hg20?.tower?.essence||0,gear:s.hg47?.history?.length||0,
    legendary:s.hg31?.history?.length||0,fragments:s.hg29?.history?.length||0,items:s.inventory?.length||0,
    marks:s.hg27?.marks||0,bossToken:s.hg27?.boss||0,towerToken:s.hg27?.tower||0};
  window.__hg64Before=before;
  HOG_APP_DEBUG.showCombatForTests();return {before,enemyCount:b.enemies.length,live:b.enemies.filter(e=>e.pool>0).length,
    type:b.kind,strict:E.strictSave(s)};
 }""")
def click_victory(page):
 for turn in range(6):
  if page.locator("#hg63-battle-result").count()>0:break
  page.locator('[data-action="battle"][data-cmd="attack"]').click()
  page.wait_for_timeout(1150)
 check('real combat result opens single post-battle overlay',page.locator('#hg63-battle-result').count()==1)
 return page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,ui=document.querySelector('#hg63-battle-result');
   const goldTokens=[...ui.querySelectorAll('.hg63-reward-token')].map(e=>e.textContent.trim())
    .filter(s=>s.endsWith(' '+E.C.resource.gold.label)&&s.includes('+'));
   const goldPaid=s.res.gold-window.__hg64Before.resources.gold;
   const totalDisplayedGold=goldTokens.reduce((n,t)=>n+Number((t.match(/\\+([\\d.,\\s]+)/)?.[1]||'0').replace(/\\D/g,'')),0);
   return {save:E.strictSave(s),version:s.version,outcome:s.battleReports?.[0]?.outcome||
     s.hg20?.tower?.last?.outcome,type:s.hg20?.tower?.last?.claimed? 'paid-tower':'other',
     ui:ui.innerText,tokens:[...ui.querySelectorAll('.hg63-reward-token')].map(e=>e.textContent.trim()),
     goldPaid,goldTokens,totalDisplayedGold,battle:!!s.battle,
     before:window.__hg64Before,now:{marks:s.hg27?.marks||0,bossToken:s.hg27?.boss||0,
       towerToken:s.hg27?.tower||0,gear:s.hg47?.history?.length||0,
       legendary:s.hg31?.history?.length||0,fragments:s.hg29?.history?.length||0,
       essence:s.hg20?.tower?.essence||0,claimed:s.hg20?.tower?.last?.claimed,
       wins:s.hg18?.victories||0,reports:s.battleReports?.length||0},
     inventory:s.inventory.length};}""")
def new_game(browser,label,width,height,touch):
 ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=touch,has_touch=touch,device_scale_factor=1)
 p=ctx.new_page();p.set_default_timeout(20000)
 p.on('pageerror',lambda exc,label=label:errors.append(label+': '+str(exc)))
 p.goto(HTML.as_uri(),wait_until='load',timeout=120000)
 p.locator('[data-action="start"]').click()
 return ctx,p
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 # T11 Boss from an actual non-stage NPC: prevents unrelated HG50 phase shields obscuring loot assertions.
 ctx,p=new_game(browser,'boss',1280,720,False)
 scene=p.evaluate("""()=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),h=s.heroes[0];
   h.level=100;h.atk=240000;h.def=240000;h.spd=100;s.ap=700;s.army.human_10=500;
   E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count:500}]);
   const stages=new Set(E.hg50Status(s).stages.map(x=>x.target)),
     tile=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===11&&!stages.has(t.key));
   if(!tile)throw Error('No non-stage T11 Boss tile');
   E.startMarch(s,tile.key);let steps=0;
   while(s.march&&steps++<12)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
   if(!s.battle)throw Error('Real Boss march failed');
   return {tile:tile.key,elite:tile.eliteTier,strict:E.strictSave(s),
    participants:s.battle.enemies.length,boss:s.battle.enemies[0].name};}""")
 check('real paid T11 Boss starts with sixteen enemies on strict Save v07',
       scene['strict'] and scene['participants']==16,scene)
 fixture=weaken(p)
 check('Boss observation changes HP only, strict v07 remains valid',fixture['strict'] and fixture['live']==1,fixture)
 boss=click_victory(p)
 check('Boss result is real victory, no active battle and Save v07 valid',
       boss['save'] and not boss['battle'] and boss['version']==7 and boss['outcome']=='win',boss)
 check('Boss earns two HG47 rarity receipts and one HG31 legendary receipt',
       boss['now']['gear']-boss['before']['gear']==2 and boss['now']['legendary']-boss['before']['legendary']==1,boss)
 check('Boss report shows BOTH rarity fragments plus legendary, marks and Boss seal',
       'Mảnh ghép đã vào kho' in boss['ui'] and 'Cổ vật' in boss['ui'] and
       'Thần khí' in boss['ui'] and 'Long Hồn' in boss['ui'] and
       'Chiến tích quái' in boss['ui'] and 'Ấn Boss' in boss['ui'],boss['tokens'])
 check('Boss wallet gold reward is presented exactly once, from real receipts',
       boss['goldPaid']>=0 and boss['totalDisplayedGold']==round(boss['goldPaid']),boss)
 shot(p,'boss-t11-reward-desktop')
 p.locator('[data-hg63-action="close"]').click()
 check('Boss report close is reward read-only',p.evaluate("""()=>{const s=HOG_APP_DEBUG.getState();
   return HOG_ENGINE.strictSave(s)&&s.hg47.history.length===2&&s.hg31.history.length===1 &&
    !document.querySelector('#hg63-battle-result')}"""))
 ctx.close()
 # Claimed Tower: its own currency + HG409 commander must not double count gold in report.
 ctx,p=new_game(browser,'tower',844,390,True)
 scene=p.evaluate("""()=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();E.autoFormation(s);
   E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
   return {floor:s.battle?.hg21Tower?.floor,strict:E.strictSave(s),stacks:s.battle?.allies?.length,
    enemies:s.battle?.enemies?.length};}""")
 check('real paid Tower encounter begins at floor one with strict v07',scene['strict'] and scene['floor']==1,scene)
 fixture=weaken(p);check('Tower observation fixture preserves v07',fixture['strict'] and fixture['live']==1,fixture)
 tower=click_victory(p)
 check('Tower victory is claimed and its nonduplicated receipt is valid',
       tower['save'] and tower['now']['claimed'] and not tower['battle'] and
       tower['now']['towerToken']>tower['before']['towerToken'],tower)
 check('Tower report includes real resources, essence and separate fragment receipts',
       'Thưởng tài nguyên Bí Cảnh thực nhận' in tower['ui'] and
       'Tinh hoa Bí Cảnh' in tower['ui'] and
       'Phù ấn Tháp' in tower['ui'] and 'Mảnh ghép đã vào kho' in tower['ui'],tower['tokens'])
 check('Tower displayed gold exactly equals delta, never double counts commander payout',
       tower['goldPaid']>0 and tower['totalDisplayedGold']==round(tower['goldPaid']),tower)
 shot(p,'claimed-tower-mobile')
 p.locator('[data-hg63-action="close"]').click()
 check('Tower postbattle Save remains strict v07',p.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'))
 ctx.close()
 browser.close()
print('HG64',sum(c['pass'] for c in checks),'/',len(checks),'PASS',flush=True)
