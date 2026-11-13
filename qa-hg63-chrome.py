"""HG63 Chromium release gate: item disclosure, facing, real terminal battle and no duplicate rewards."""
from pathlib import Path
import sys,json,hashlib,atexit
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent
HTML=R/'Play-Heoofgaia-HG11.html'
O=R/'docs/qa/hg63';O.mkdir(parents=True,exist_ok=True)
S=R/'docs/evidence/hg63';S.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];screens=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(name,ok,meta=None):
 checks.append({'name':name,'pass':bool(ok)})
 print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 if not ok:raise AssertionError(name+' '+str(meta)[:900])
def snap(page,name):
 p=S/(name+'.png');page.screenshot(path=str(p),animations='disabled')
 screens.append({'path':str(p.relative_to(R)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
@atexit.register
def evidence():
 report={'suite':'HG63','passed':sum(x['pass'] for x in checks),'total':len(checks),
  'checks':checks,'errors':errors,'screenshots':screens,
  'fileSha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
  'fixture':'One real mine engagement uses production combat and settlement; UI-only QA reduces defenders to a single adjacent 1-HP stack for deterministic fast victory. Gear UID added via real E.addItem. No fake battle report or rewards added.'}
 (O/'hg63-real-chromium.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for label,w,h,touch in [('pc',1280,720,False),('mobile',844,390,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch)
  page=ctx.new_page();page.set_default_timeout(15000)
  page.on('pageerror',lambda e,label=label:errors.append(label+': '+str(e)))
  page.goto(HTML.as_uri(),wait_until='load',timeout=120000)
  page.locator('[data-action="start"]').click()
  data=page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
    const i=E.addItem(s,'sentinel_sword','HG63 QA gear source');
    HOG_APP_DEBUG.render();return {valid:E.strictSave(s),uid:i.uid};}""")
  check(label+' gear instance created using canonical v07 inventory',data['valid'],data)
  page.locator('#nav [data-tab="heroes"]').click()
  page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
  check(label+' ten compact slots and hidden item details before click',
        page.locator('.hg46-slot').count()==10 and page.locator('.hg83-inspector').count()==0)
  page.locator('.hg46-inventory-card[data-hg46-uid="'+str(data['uid'])+'"]').click()
  check(label+' details appear only when actual UID is selected',
        page.locator('.hg83-inspector .hg63-item-details').count()==1)
  desc=page.locator('.hg83-inspector .hg63-item-details').first
  desc.evaluate('(el)=>el.open=true')
  text=desc.inner_text()
  check(label+' actual stats, set and earned-source text',all(v in text for v in ['Chỉ số thực','Vệ Binh','Nguồn nhận','HG63 QA gear source']),text[:500])
  snap(page,label+'-item')
  page.locator('[data-action="modal-close"]').click()
  face=page.evaluate("""async()=>{const A=HOG_HG33_TROOP_ATLASES,P=HOG_PAINTER;
   const jobs=[['human_1','Spear Militia'],[null,'Azrael']];
   for(const [id,name] of jobs){const d=A.resolve(id,name),img=d&&document.getElementById(d.imageId);
     if(!img)throw Error('Missing real atlas '+name);
     if(!img.hasAttribute('src'))img.src=img.dataset.hg33AtlasSrc;
     if(!img.complete||!img.naturalWidth)await new Promise((yes,no)=>{
       img.addEventListener('load',yes,{once:true});img.addEventListener('error',()=>no(Error('Atlas decode '+name)),{once:true})});}
   function draw(id,name,enemy){const c=document.createElement('canvas').getContext('2d'),f=c.scale.bind(c),mirrors=[];
     c.scale=(x,y)=>{mirrors.push(x);f(x,y)};
     const painted=P.battleUnitArt(c,80,160,enemy,{action:'idle',time:140,duration:960,alpha:1},1,{unitId:id,name});
     return {painted,mirror:mirrors.includes(-1)}}
   return {humanAlly:draw('human_1','Spear Militia',false),humanEnemy:draw('human_1','Spear Militia',true),
    azraelEnemy:draw(null,'Azrael',true),azraelAlly:draw(null,'Azrael',false)};
  }""")
  check(label+' native-right troops and native-left Boss face opponent correctly',
   face['humanAlly']=={'painted':True,'mirror':False} and face['humanEnemy']=={'painted':True,'mirror':True}
   and face['azraelEnemy']=={'painted':True,'mirror':False} and face['azraelAlly']=={'painted':True,'mirror':True},face)
  setup=page.evaluate("""()=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),b=s.battle=E.makeBattle(s,'6,3');
   const a=b.allies.find(u=>u.pool>0);if(!a)throw Error('No starter ally');
   b.enemies.forEach((e,i)=>{e.hp=1;e.count=i===0?1:0;e.initial=i===0?1:0;e.pool=i===0?1:0;
    e.def=0;e.atk=0;e.range=1;e.x=i===0?(a.x<11?a.x+1:a.x-1):11;e.y=i===0?a.y:8;});
   b.autoUntil=Date.now()+600000;s.battleAuto=false;HOG_APP_DEBUG.showCombatForTests();
   return {strict:E.strictSave(s),oldReports:s.battleReports.length,live:b.enemies.filter(u=>u.pool>0).length};}""")
  check(label+' real combat QA fixture passes strict v07 before action',setup['strict'] and setup['oldReports']==0 and setup['live']==1,setup)
  for turn in range(5):
   if page.locator('#hg63-battle-result').count():break
   page.locator('[data-action="battle"][data-cmd="attack"]').click()
   page.wait_for_timeout(1300)
  check(label+' battle ending automatically opens animated report',page.locator('#hg63-battle-result').count()==1)
  outcome=page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState(),r=s.battleReports?.[0],ui=document.querySelector('#hg63-battle-result');
    return {strict:HOG_ENGINE.strictSave(s),outcome:r?.outcome,count:s.battleReports.length,battle:!!s.battle,
     uid:s.inventory[0]?.uid,text:ui?.innerText||'',vfx:ui?.querySelectorAll('.hg63-report-vfx i').length,report:r};}""")
  check(label+' victory, losses and XP reflect exactly one real receipt',
   outcome['strict'] and outcome['outcome']=='win' and outcome['count']==1 and not outcome['battle']
   and outcome['uid']==data['uid'] and 'CHIẾN THẮNG' in outcome['text']
   and 'Phần thưởng trong chiến báo' in outcome['text'] and outcome['vfx']>=10,outcome)
  snap(page,label+'-victory')
  page.locator('[data-hg63-action="close"]').click()
  check(label+' closing report has no reward side effects',
   page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState();return !document.querySelector('#hg63-battle-result')&&
    HOG_ENGINE.strictSave(s)&&s.battleReports.length===1&&s.inventory.length===1}"""))
  page.locator('#save').click();page.reload(wait_until='load',timeout=120000)
  check(label+' reload v07 retains one receipt and does not reopen old report',
   page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState();return HOG_ENGINE.strictSave(s)&&s.battleReports.length===1&&
    s.inventory.length===1&&!document.querySelector('#hg63-battle-result')}"""))
  check(label+' no browser errors',not any(x.startswith(label+':') for x in errors),errors)
  ctx.close()
 browser.close()
print('HG63 TOTAL',sum(x['pass'] for x in checks),'/',len(checks),flush=True)
