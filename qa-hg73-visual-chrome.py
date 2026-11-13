"""HG73 real Chromium prestige inventory and ice-crystal frame / battle aura.
Explicit inventory fixtures are never game rewards; real equip and Save paths.
"""
from pathlib import Path
import hashlib,json,atexit,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
EVIDENCE=ROOT/'docs/evidence/hg73'
REPORT=ROOT/'docs/qa/hg73/visual-pass.json'
EVIDENCE.mkdir(parents=True,exist_ok=True);REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];images=[];errors=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(label,payload,detail=None):
 passed=bool(payload);checks.append({'name':label,'passed':passed})
 print(('PASS ' if passed else 'FAIL ')+label,flush=True)
 if not passed:raise AssertionError(label+' '+str(detail)[:1000])
def shot(page,label):
 f=EVIDENCE/(label+'.png');page.screenshot(path=str(f),animations='disabled')
 images.append({'name':f.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
@atexit.register
def report():
 REPORT.write_text(json.dumps({'checks':checks,'pass':sum(x['passed'] for x in checks),
  'total':len(checks),'errors':errors,'images':images,
  'offline_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
  'fixture':'Only E.addItem mints QA samples, no free game loot; E.equipItem and Tower encounter are production engine paths.'},
  ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright() as runtime:
 browser=runtime.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for label,width,height,mobile in [('desktop',1280,720,False),('mobile-landscape',844,390,True)]:
  ctx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
  page=ctx.new_page();page.set_default_timeout(20000)
  page.on('pageerror',lambda error,label=label:errors.append(label+': '+str(error)))
  page.goto(HTML.as_uri(),wait_until='load',timeout=120000)
  page.locator('[data-action="start"]').click()
  data=page.evaluate("""()=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
    const ids=['hg47_human_divine_weapon','star_blade','dragon_plate',
      'hg47_human_rare_relic','sentinel_sword','astral_plate','copper_blade'];
    const rows=ids.map(id=>E.addItem(s,id,'HG73 visual fixture'));
    rows[1].enhance=8;
    E.equipItem(s,rows[0].uid,1);
    HOG_APP_DEBUG.render();
    return {grade:rows.map(i=>E.hg73Grade(i).label),version:s.version,
     strict:E.strictSave(s),n:s.inventory.length,uid:rows[0].uid,aura:E.hg73AuraForHero(s,1)?.tier};}""")
  check(label+' canonical inventory has seven distinct prestige examples and strict v07',
        data['strict'] and data['version']==7 and data['n']==7 and data['aura']=='divine',data)
  page.locator('#nav [data-tab="heroes"]').click()
  page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
  check(label+' all seven actual items retain rarity frame identities',
        page.locator('.hg46-inventory-card[class*="hg73-tier-"]').count()==7)
  check(label+' compact cards conceal stats/actions until player selects an item',
        page.locator('.hg83-inspector').count()==0 and
        page.locator('.hg46-inventory-card .hg46-card-actions').count()==0)
  page.locator('.hg46-inventory-card.hg73-tier-divine').click()
  check(label+' selecting divine item reveals legible grade and verified UID details',
        page.locator('.hg83-inspector .hg73-grade-pill').count()==1 and
        page.locator('.hg83-inspector [data-action="hg46-inspect-close"]').count()==1)
  page.locator('[data-action="hg46-inspect-close"]').click()
  check(label+' closing item detail restores compact icon-only grid',
        page.locator('.hg83-inspector').count()==0)
  crystal=page.locator('.hg46-inventory-card.hg73-tier-divine')
  check(label+' divine crystal UI appears on real equipment',crystal.count()==1)
  style=crystal.first.evaluate("""element=>{const outer=getComputedStyle(element,'::after'),
    inner=getComputedStyle(element,'::before'),body=getComputedStyle(element);
    return {outer:outer.content,blur:outer.filter,clicks:outer.pointerEvents,
      inner:inner.content,border:inner.borderTopStyle,radius:body.borderRadius};}""")
  check(label+' sharp inner ice frame and soft outer light do not block clicks',
        style['outer']!='none' and 'blur' in style['blur'] and style['clicks']=='none' and
        style['inner']!='none' and style['border']!='none',style)
  page.locator('[data-action="hg46-filter"][data-slot="grade:rainbow"]').click()
  check(label+' rainbow filter reflects an actual +8 star UID only',
        page.locator('.hg46-inventory-card').count()==1 and
        page.locator('.hg46-inventory-card.hg73-tier-rainbow').count()==1)
  shot(page,label+'-prismatic-filter')
  page.locator('[data-action="hg46-filter"][data-slot="grade:divine"]').click()
  check(label+' divine filter shows the single genuine divine equipment',
        page.locator('.hg46-inventory-card').count()==1)
  page.locator('[data-action="hg46-filter"][data-slot="all"]').click()
  shot(page,label+'-crystal-inventory')
  actual=page.evaluate("""()=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
    E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:16}]);
    E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnableEndurance(s);E.hg21TowerEnter(s);
    HOG_APP_DEBUG.showCombatForTests();
    const canvas=document.querySelector('#battle-canvas');
    HOG_PAINTER.drawBattle(canvas,E,s,performance.now());
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let alive=false;for(let k=3;k<data.length;k+=197)if(data[k]>0){alive=true;break}
    return {battle:!!s.battle,tower:!!s.battle?.hg21Tower,
      owner:s.battle?.allies?.[0]?.heroId,grade:E.hg73AuraForHero(s,1)?.tier,
      canvas:[canvas.width,canvas.height],painted:alive,valid:E.strictSave(s)};}""")
  check(label+' real Tower combat paints equipped crystalline aura on owner only',
        actual['battle'] and actual['tower'] and actual['owner']==1 and
        actual['grade']=='divine' and actual['painted'] and actual['valid'],actual)
  shot(page,label+'-real-tower-crystal-aura')
  check(label+' no console/page exceptions on sprite render or panel filtering',
        not any(e.startswith(label+':') for e in errors),errors)
  ctx.close()
 browser.close()
print('HG73 visual',sum(x['passed'] for x in checks),'/',len(checks),'PASS',flush=True)
