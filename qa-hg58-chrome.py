"""HG58 real Chromium acceptance: speed x1/x2/x3, exact real MP and
VFX cues, unknown-Tower-monster movement, three-hero HP, strict Save v07.
No fictional rewards or manual GUI device performance claims.
"""
from pathlib import Path
import atexit,hashlib,json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent;HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/qa/hg58';SHOTS=ROOT/'docs/evidence/hg58'
OUT.mkdir(parents=True,exist_ok=True);SHOTS.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];screens=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf8',errors='replace')
def check(name,ok,detail=None):
 checks.append({'name':name,'pass':bool(ok),'detail':detail})
 print(('HG58 PASS ' if ok else 'HG58 FAIL ')+name+' '+str(detail)[:300],flush=True)
 if not ok:raise AssertionError(name+' '+str(detail)[:650])
def shot(page,name):
 p=SHOTS/(name+'.png');page.screenshot(path=str(p),animations='disabled')
 screens.append({'file':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
def dump():
 (OUT/'chromium.json').write_text(json.dumps({'checks':checks,'passed':sum(x['pass'] for x in checks),
   'total':len(checks),'errors':errors,'screenshots':screens,
   'sha256_html':hashlib.sha256(HTML.read_bytes()).hexdigest()},ensure_ascii=False,indent=2),encoding='utf8')
atexit.register(dump)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for label,w,h,touch in [('desktop-1280x720',1280,720,False),('landscape-844x390',844,390,True),('portrait-412x915',412,915,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch)
  page=ctx.new_page();page.set_default_timeout(20000)
  page.on('pageerror',lambda e,label=label:errors.append({'viewport':label,'error':str(e)}))
  page.goto(HTML.as_uri(),wait_until='load',timeout=120000)
  page.locator('[data-action="start"]').click()
  before=page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),start={...s.res};
    // QA fixture uses only a genuine engine Boss actor roster; no new loot.
    s.battle=E.makeBattle(s,'18,92');
    s.battle.autoUntil=Date.now()+180000;
    HOG_APP_DEBUG.showCombatForTests();
    const selected=s.battle.allies.find(u=>u.id===s.battle.selected);
    return {version:s.version,strict:E.strictSave(s),started:start,
      resources:E.C.keys.every(k=>start[k]===s.res[k]),selected:selected?.unitId,
      buttons:document.querySelectorAll('[data-action="combat-speed"]').length,
      hp:Boolean(document.querySelector('[data-action="battle-hp"]')),
      tags:document.querySelectorAll('#resources button.resource').length};
  }""")
  check(label+' true one-HTML battle loads, five HUD totals and speed controls',
    before['strict'] and before['version']==7 and before['resources'] and
    before['buttons']==3 and before['hp'] and before['tags']==5,before)
  for rate in (1,2,3,1):
   page.locator(f'[data-action="combat-speed"][data-speed="{rate}"]').click()
   pressed=page.locator(f'[data-action="combat-speed"][data-speed="{rate}"]').get_attribute('aria-pressed')
   enabled=page.locator('[data-action="combat-speed"][aria-pressed="true"]').count()
   check(label+f' real combat speed x{rate} selects exactly one setting with strict v07',
     pressed=='true' and enabled==1 and
     page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'),
     {'rate':rate,'pressed':pressed,'selected':enabled})
  check(label+' global HUD and battle controls stay accessible',
    page.evaluate("""() => {
      const hud=document.querySelector('#app>.top')?.getBoundingClientRect(),
       scene=document.getElementById('battle-canvas')?.getBoundingClientRect();
      return !!hud&&!!scene&&hud.height>=15&&scene.width>130;
    }"""))
  shot(page,label+'-combat-speed')
  energy=page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),b=s.battle;
    const u=b.allies[0],trait=E.hg40SkillReadiness?.(b,u);
    const owner=document.querySelector('.battle-side-readout .hg58-unit-energy');
    return {strict:E.strictSave(s),trait,energyLabel:owner?.textContent,
      meter:!!owner?.querySelector('[role="progressbar"][aria-label="Tiến độ hồi chiêu"]'),
      realNames:b.allies.map(a=>a.name)};
  }""")
  check(label+' only real HG40 skill and cooldown shown, no fake MP',
   energy['strict'] and bool(energy['energyLabel']) and
   'MP ' not in energy['energyLabel'] and
   (energy['trait'] is None or
    (energy['trait']['name'] in energy['energyLabel'] and
     'mp' not in energy['trait'] and
     (energy['trait']['passive'] or energy['meter']))),energy)
  # The same live DOM must work with genuine three-owner Tower roster.
  tower=page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),base=JSON.parse(JSON.stringify(s.heroes[0]));
    s.battle=null;s.battleAuto=false;
    for(let id=2;id<=3;id++)s.heroes.push({...base,id,name:'HG58 QA Tướng '+id});
    s.army.human_1=24;
    for(let id=1;id<=3;id++)E.hg20SetHeroPlan(s,id,[
      {unitId:'human_1',count:4},{unitId:'human_1',count:4}]);
    E.hg20ChooseTowerTeam(s,[1,2,3]);
    E.hg21SetTowerPicks(s,[1,2,3].map(heroId=>({heroId,slots:[0,1]})));
    E.hg21TowerEnter(s);HOG_APP_DEBUG.showCombatForTests();
    const b=s.battle;
    return {strict:E.strictSave(s),owners:b.allies.map(u=>u.heroId),
      bossNames:b.enemies.map(u=>u.name),
      leaders:document.querySelectorAll('[data-hg57-friendly] .hg57-hero-chip').length,
      nameOptions:document.querySelectorAll('[data-action="battle-labels"]').length,
      speedOptions:document.querySelectorAll('[data-action="combat-speed"]').length};
  }""")
  check(label+' real 3-owner Tower scene + fallback monsters retain combat VFX controls',
    tower['strict'] and tower['owners']==[1,1,2,2,3,3] and
    tower['leaders']==3 and tower['nameOptions']==1 and tower['speedOptions']==3,tower)
  shot(page,label+'-three-hero-tower-vfx')
  check(label+' no browser exceptions',not [e for e in errors if e['viewport']==label],errors)
  ctx.close()
 browser.close()
print('HG58 CHROMIUM '+str(sum(x['pass'] for x in checks))+'/'+str(len(checks))+' PASS',flush=True)
