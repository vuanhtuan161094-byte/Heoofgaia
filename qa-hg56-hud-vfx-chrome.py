"""HG56 persistent global resource HUD + UI/combat VFX acceptance.
Real file:// Chromium, no artificial reward, no game/Save writes from panels.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib,json,os
ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/qa/hg56'
SHOTS=ROOT/'docs/evidence/hg56'
OUT.mkdir(parents=True,exist_ok=True);SHOTS.mkdir(parents=True,exist_ok=True)
results=[];errors=[];screens=[]
def check(label,ok,detail=None):
 ok=bool(ok);results.append({'label':label,'pass':ok,'detail':detail})
 print(('HG56 PASS ' if ok else 'HG56 FAIL ')+label+' '+str(detail)[:300],flush=True)
 if not ok:raise AssertionError(label+' '+str(detail)[:750])
def shot(page,name):
 fn=SHOTS/(name+'.png');page.screenshot(path=str(fn),animations='disabled')
 screens.append({'file':str(fn.relative_to(ROOT)),'sha256':hashlib.sha256(fn.read_bytes()).hexdigest()})
def hud(page):
 return page.evaluate("""() => {
  const h=document.querySelector('#app>.top'),r=h?.getBoundingClientRect(),
   cards=[...document.querySelectorAll('#resources button.resource')],
   modal=document.getElementById('game-modal'),mr=modal?.querySelector('.game-window')?.getBoundingClientRect(),
   nav=document.getElementById('nav')?.getBoundingClientRect(),s=HOG_APP_DEBUG.getState(),
   value=k=>Number(cards[k]?.querySelector('b')?.textContent.replace(/[^0-9]/g,'')),
   rectOf=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}},
   mode=getComputedStyle(h);
  return {display:mode.display,position:mode.position,visibility:mode.visibility,z:Number(mode.zIndex),
   x:r.x,y:r.y,w:r.width,height:r.height,bottom:r.bottom,winW:innerWidth,winH:innerHeight,
   globalName:h.textContent.includes('ANH HÙNG THỜI LOẠN'),
   titleTop:document.querySelector('.masthead .brand').getBoundingClientRect().top,
   titleBottom:document.querySelector('.masthead .brand').getBoundingClientRect().bottom,
   subtitleBottom:document.querySelector('.masthead small').getBoundingClientRect().bottom,
   resourceCount:cards.length,resources:cards.map((c,i)=>({name:c.querySelector('span')?.textContent,
    amount:value(i),rect:rectOf(c),clickable:!c.disabled&&getComputedStyle(c).pointerEvents!=='none'})),
   saved:s?HOG_ENGINE.strictSave(s):true,actual:s?HOG_ENGINE.C.keys.map(k=>Math.floor(s.res[k]||0)):[],
   modalVisible:!!modal&&!modal.hidden,modalTop:mr?.top||null,
   navBottom:nav?.bottom||null,
   bodyOverflow:document.documentElement.scrollWidth>innerWidth+2,
   combat:document.body.classList.contains('combat-mode')};
 }""")
def assert_hud(page,label,w,h,must_modal=False):
 x=hud(page)
 check(label+' top resources always visible and on screen',
       x['display']=='flex' and x['position']=='fixed' and x['visibility']!='hidden' and
       x['globalName'] and x['y']>=-1 and x['bottom']<=h+1 and x['x']>=-1 and x['w']<=w+2 and
       x['resourceCount']==5 and all(v['rect']['w']>25 for v in x['resources']),x)
 # Economy tick and DOM paint may straddle a screenshot turn. Re-check on
 # the same live state after one bounded browser update; never fake resources.
 if x['saved'] and x['actual']!=[row['amount'] for row in x['resources']]:
  page.wait_for_timeout(180)
  x=hud(page)
 check(label+' full game title and subtitle never clipped by fixed top HUD',
       x['titleTop']>=x['y']-0.25 and x['titleBottom']<=x['bottom']+0.25 and
       x['subtitleBottom']<=x['bottom']+0.25,
       {'titleTop':x['titleTop'],'subtitleBottom':x['subtitleBottom'],'hudBottom':x['bottom']})
 check(label+' five resource values from real active state, strict Save v07',
       x['saved'] and x['actual']==[row['amount'] for row in x['resources']],
       {'saved':x['saved'],'actual':x['actual'],'display':[row['amount'] for row in x['resources']]})
 check(label+' clickable HUD front of modal, independent of full screen content',
       all(row['clickable'] for row in x['resources']) and
       (not must_modal or x['modalVisible'] and x['modalTop']>=x['bottom']-3) and
       not x['bodyOverflow'],{'hudY':x['y'],'hudBottom':x['bottom'],'modalTop':x['modalTop'],
                              'overflow':x['bodyOverflow'],'height':h})
 return x
with sync_playwright() as pw:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
 if os.environ.get('HOG_CHROME_PATH'):launch['executable_path']=os.environ['HOG_CHROME_PATH']
 browser=pw.chromium.launch(**launch)
 for label,w,h,mobile in [
   ('pc-1280x720',1280,720,False),('pc-960x540',960,540,False),
   ('phone-844x390',844,390,True),('phone-768x260',768,260,True),
   ('phone-412x915',412,915,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,
     has_touch=mobile,device_scale_factor=2 if mobile else 1)
  page=ctx.new_page();page.set_default_timeout(15000)
  page.on('pageerror',lambda e,label=label:errors.append({'viewport':label,'error':str(e)}))
  page.goto(HTML.as_uri(),wait_until='load',timeout=90000)
  page.locator('[data-action="start"]').click()
  assert_hud(page,label+' map',w,h)
  shot(page,label+'-map-global-hud')
  for tab in ['city','army','heroes','magic','relics','tasks','tower','reports','boss']:
   page.locator('#nav [data-action="tab"][data-tab="'+tab+'"]').click()
   x=assert_hud(page,label+' '+tab,w,h,True)
   check(label+' '+tab+' header paints in front of overlay',
         page.evaluate("""() => {
          const r=document.querySelector('#resources button.resource').getBoundingClientRect();
          const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
          return !!el?.closest('#app>.top');
         }"""))
   if tab in ('heroes','boss'):shot(page,label+'-'+tab+'-global-hud')
  # Open gear if the hero screen contains actual ten-slot content.
  page.locator('#nav [data-action="tab"][data-tab="heroes"]').click()
  has_gear=page.locator('.hg47-ten-slots').count()>0
  if has_gear:
   assert_hud(page,label+' gear 10 slots',w,h,True)
   shot(page,label+'-gear-global-hud')
  # This is a visual-only frame fixture; do not dispatch, credit, or settle
  # a Boss for screenshots. The canonical engine owns combat and rewards.
  combat=page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,P=HOG_PAINTER;
    const before={rewards:s.hg409.rewards.length,res:{...s.res}};
    s.battle=E.makeBattle(s,'18,92');s.battle.autoUntil=Date.now()+60000;
    HOG_APP_DEBUG.showCombatForTests();
    const canvas=document.querySelector('#battle-canvas'),r=canvas.getBoundingClientRect();
    const demo=document.createElement('canvas');demo.width=200;demo.height=150;
    const context=demo.getContext('2d');
    P.hg56ImpactStreaks(context,{end:{x:100,y:70},side:'player',kind:'skill'},'#c5e9ff',160,{radius:35});
    const data=context.getImageData(0,0,200,150).data;
    let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)painted++;
    const bossAura=typeof P.hg56BossPhaseAura==='function';
    return {strict:E.strictSave(s),combat:!!s.battle,width:r.width,height:r.height,
       paintedPixels:painted,bossAura,policy:window.HOG_HG56_UI?.saveChanged===false,
       rewards:s.hg409.rewards.length-before.rewards,
       resourcesUnchanged:E.C.keys.every(k=>s.res[k]===before.res[k])};
  }""")
  check(label+' battle receipt streak draws real Canvas pixels, no economy mutation',
        combat['strict'] and combat['combat'] and combat['width']>100 and
        combat['paintedPixels']>100 and combat['bossAura'] and combat['policy'] and
        combat['rewards']==0 and combat['resourcesUnchanged'],combat)
  assert_hud(page,label+' live Boss combat',w,h)
  shot(page,label+'-combat-global-hud-vfx')
  check(label+' no JS page errors',not [e for e in errors if e['viewport']==label],errors)
  ctx.close()
 browser.close()
report={'suite':'HG56 real-file persistent global HUD and combat/UI VFX','cases':len(results),
 'passed':sum(x['pass'] for x in results),'checks':results,'screenshots':screens,'errors':errors}
(OUT/'hud-vfx-five-viewports.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print('HG56 CHROMIUM '+str(report['passed'])+'/'+str(report['cases']),flush=True)
